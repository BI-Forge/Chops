import React, { useState, useEffect } from 'react';
import {
  XCircle,
  User,
  Mail,
  Key,
  Shield,
  Calendar,
  Clock,
  CheckCircle,
  Save,
  Power,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import type { AdminUser } from '../../types/adminSettings';
import { assignSystemUserRole, formatApiError, setSystemUserActive } from '../../services/systemRBACAPI';
import { AdminRoleSelectInput } from './AdminRoleSelectInput';

interface RoleOption {
  id: number;
  name: string;
}

interface AdminUserDetailsModalProps {
  user: AdminUser;
  roleOptions: RoleOption[];
  currentUserId?: string | null;
  onClose: () => void;
  onRoleSaved: (userId: string) => void | Promise<void>;
  onActiveSaved?: (userId: string) => void | Promise<void>;
}

export function AdminUserDetailsModal({
  user,
  roleOptions,
  currentUserId = null,
  onClose,
  onRoleSaved,
  onActiveSaved,
}: AdminUserDetailsModalProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  const [selectedRoleId, setSelectedRoleId] = useState<number>(user.roleId);
  const [saving, setSaving] = useState(false);
  const [savingActive, setSavingActive] = useState(false);

  useEffect(() => {
    setSelectedRoleId(user.roleId);
  }, [user.roleId, user.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getStatusIcon = (status: AdminUser['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AdminUser['status']) => {
    switch (status) {
      case 'active':
        return theme === 'light'
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'inactive':
        return theme === 'light'
          ? 'bg-gray-100 text-gray-600 border-gray-200'
          : 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const groupedPermissions = user.permissions.reduce(
    (acc, permission) => {
      const [category] = permission.split('.');
      const key = category || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(permission);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const handleSaveRole = async () => {
    if (selectedRoleId === user.roleId) {
      return;
    }
    setSaving(true);
    try {
      await assignSystemUserRole(Number(user.id), { role_id: selectedRoleId });
      success('Role updated successfully');
      await onRoleSaved(user.id);
    } catch (e) {
      showError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (targetActive: boolean) => {
    if (!targetActive && currentUserId != null && currentUserId === user.id) {
      showError('Error', 'Cannot deactivate your own account');
      return;
    }
    setSavingActive(true);
    try {
      await setSystemUserActive(Number(user.id), { is_active: targetActive });
      success(targetActive ? 'User activated' : 'User deactivated');
      await onActiveSaved?.(user.id);
    } catch (e) {
      showError(formatApiError(e));
    } finally {
      setSavingActive(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
          theme === 'light' ? 'bg-black/50' : 'bg-black/70'
        } backdrop-blur-sm`}
        onClick={onClose}
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
      >
        <div
          className={`bg-gradient-to-br ${
            theme === 'light'
              ? 'from-white/95 to-gray-50/95 border-amber-500/30'
              : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
          } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div
            className={`flex items-center justify-between p-6 border-b ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-lg ${
                  theme === 'light'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : 'bg-gradient-to-br from-amber-500 to-yellow-600'
                } flex items-center justify-center`}
              >
                <span className="text-white text-xl font-semibold">{user.username.substring(0, 2).toUpperCase()}</span>
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
                  {user.fullName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm font-mono`}>
                    @{user.username}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${getStatusColor(user.status)}`}
                  >
                    {getStatusIcon(user.status)}
                    {user.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`w-10 h-10 rounded-lg ${
                theme === 'light'
                  ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              } border transition-all duration-200 flex items-center justify-center group`}
            >
              <XCircle
                className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
                }`}
              />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-6">
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <User className="w-5 h-5" />
                  <h3 className="font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}
                  >
                    <div
                      className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>{user.email}</p>
                  </div>

                  <div
                    className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}
                  >
                    <div
                      className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                    >
                      User ID
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm font-mono`}>{user.id}</p>
                  </div>

                  <div
                    className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}
                  >
                    <div
                      className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                    >
                      <Calendar className="w-4 h-4" />
                      Created At
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>{user.createdAt}</p>
                  </div>

                  <div
                    className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}
                  >
                    <div
                      className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                    >
                      <Clock className="w-4 h-4" />
                      Last Login
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>{user.lastLogin}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Power className="w-5 h-5" />
                  <h3 className="font-semibold">Account status</h3>
                </div>
                <div
                  className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4 flex flex-wrap items-center gap-3`}
                >
                  <p className={`text-sm flex-1 min-w-[200px] ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Inactive users cannot use the API, including existing tokens.
                  </p>
                  {user.status === 'active' ? (
                    <button
                      type="button"
                      disabled={savingActive}
                      onClick={() => void handleSetActive(false)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        savingActive
                          ? theme === 'light'
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-700 text-gray-600 cursor-not-allowed'
                          : theme === 'light'
                            ? 'border-red-300 text-red-800 hover:bg-red-50'
                            : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      {savingActive ? 'Updating…' : 'Deactivate'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingActive}
                      onClick={() => void handleSetActive(true)}
                      className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                        savingActive
                          ? theme === 'light'
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-gray-700 text-gray-600 cursor-not-allowed'
                          : theme === 'light'
                            ? 'border-green-300 text-green-800 hover:bg-green-50'
                            : 'border-green-500/40 text-green-400 hover:bg-green-500/10'
                      }`}
                    >
                      {savingActive ? 'Updating…' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Shield className="w-5 h-5" />
                  <h3 className="font-semibold">System role</h3>
                </div>
                <div
                  className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}
                >
                  <label className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mb-1 block`}>
                    Assign role
                  </label>
                  <AdminRoleSelectInput
                    value={selectedRoleId}
                    onChange={setSelectedRoleId}
                    options={roleOptions}
                    placeholder="Select role"
                    aria-label="Assign role"
                  />
                  <p className={`text-xs mt-1.5 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Permissions follow the selected role; effective codes are listed below (read-only).
                  </p>
                </div>
              </div>

              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Key className="w-5 h-5" />
                  <h3 className="font-semibold">Permissions via role ({user.permissions.length})</h3>
                </div>
                <div
                  className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}
                >
                  <div className="space-y-3">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category}>
                        <div
                          className={`text-sm font-medium mb-2 capitalize ${
                            theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                          }`}
                        >
                          {category}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((permission) => (
                            <span
                              key={permission}
                              className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border font-mono ${
                                theme === 'light'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {permission}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {user.permissions.length === 0 && (
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                        No permissions for this role
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`p-6 border-t ${
              theme === 'light' ? 'border-amber-500/20 bg-gray-50/50' : 'border-yellow-500/20 bg-gray-800/50'
            } flex items-center justify-end gap-3`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-100 border border-gray-300 text-gray-700'
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveRole()}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                saving
                  ? theme === 'light'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : theme === 'light'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'light' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(234, 179, 8, 0.5)'};
          border-radius: 10px;
        }
      `}</style>
    </>
  );
}
