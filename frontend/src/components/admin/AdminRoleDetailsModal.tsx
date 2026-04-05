import React, { useState, useEffect, useMemo } from 'react';
import { XCircle, Key, FileText, Users as UsersIcon, Save, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import type { AdminRole } from '../../types/adminSettings';
import type { PermissionSummary } from '../../services/systemRBACAPI';
import {
  createSystemRole,
  setSystemRolePermissions,
  formatApiError,
} from '../../services/systemRBACAPI';
import { AutocompleteInput } from '../AutocompleteInput';

interface AdminRoleDetailsModalProps {
  role: AdminRole;
  allPermissions: PermissionSummary[];
  isCreating?: boolean;
  detailLoading?: boolean;
  onClose: () => void;
  onSaved: (payload: { roleId: string; wasCreate: boolean }) => Promise<void> | void;
}

export function AdminRoleDetailsModal({
  role,
  allPermissions,
  isCreating = false,
  detailLoading = false,
  onClose,
  onSaved,
}: AdminRoleDetailsModalProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  const [editableName, setEditableName] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [newPermissionQuery, setNewPermissionQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const idToName = useMemo(() => {
    const m = new Map<number, string>();
    allPermissions.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [allPermissions]);

  useEffect(() => {
    if (isCreating) {
      setEditableName('');
      setEditableDescription('');
      setSelectedIds(new Set());
      setNewPermissionQuery('');
      return;
    }
    setEditableName(role.name);
    setEditableDescription(role.description);
    setSelectedIds(new Set(role.permissionIds));
    setNewPermissionQuery('');
  }, [role, isCreating]);

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

  const getRoleColor = (name: string) => {
    if (name === 'admin') {
      return theme === 'light' ? 'from-purple-400 to-purple-600' : 'from-purple-500 to-purple-700';
    }
    if (name === 'guest') {
      return theme === 'light' ? 'from-slate-400 to-slate-600' : 'from-slate-500 to-slate-700';
    }
    return theme === 'light' ? 'from-amber-400 to-orange-500' : 'from-amber-500 to-yellow-600';
  };

  const selectedNames = useMemo(() => {
    return Array.from(selectedIds)
      .map((id) => idToName.get(id))
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.localeCompare(b));
  }, [selectedIds, idToName]);

  const groupedSelected = useMemo(() => {
    return selectedNames.reduce(
      (acc, name) => {
        const [category] = name.split('.');
        const key = category || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(name);
        return acc;
      },
      {} as Record<string, string[]>
    );
  }, [selectedNames]);

  const addPermissionByName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const row = allPermissions.find((p) => p.name === trimmed);
    if (!row) return;
    setSelectedIds((prev) => new Set(prev).add(row.id));
    setNewPermissionQuery('');
  };

  const removePermissionName = (name: string) => {
    const row = allPermissions.find((p) => p.name === name);
    if (!row) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  };

  const suggestionNames = useMemo(() => {
    const q = newPermissionQuery.trim().toLowerCase();
    return allPermissions
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => (q === '' ? true : p.name.toLowerCase().includes(q)))
      .map((p) => p.name)
      .slice(0, 40);
  }, [allPermissions, selectedIds, newPermissionQuery]);

  const handleSave = async () => {
    if (isCreating && !editableName.trim()) return;
    const ids = Array.from(selectedIds);
    setSaving(true);
    try {
      if (isCreating) {
        const created = await createSystemRole({
          name: editableName.trim(),
          description: editableDescription.trim() || undefined,
        });
        await setSystemRolePermissions(created.id, { permission_ids: ids });
        success('Role created successfully');
        await onSaved({ roleId: String(created.id), wasCreate: true });
      } else {
        await setSystemRolePermissions(Number(role.id), { permission_ids: ids });
        success('Role permissions updated');
        await onSaved({ roleId: role.id, wasCreate: false });
      }
    } catch (e) {
      showError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
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
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {detailLoading && (
          <div
            className={`absolute inset-0 z-10 flex items-center justify-center ${
              theme === 'light' ? 'bg-white/70' : 'bg-gray-900/70'
            }`}
          >
            <p className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>Loading role…</p>
          </div>
        )}

        <div
          className={`flex items-center justify-between p-6 border-b ${
            theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                isCreating ? 'from-amber-400 to-orange-500' : getRoleColor(editableName)
              } flex items-center justify-center`}
            >
              <Key className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
                {isCreating ? 'New Role' : editableName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm`}>
                  {isCreating ? 'Create New Role' : 'Role Details'}
                </p>
                {!isCreating && role.isSystem && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${
                      theme === 'light'
                        ? 'bg-gray-200/80 text-gray-700 border-gray-300'
                        : 'bg-gray-700/50 text-gray-300 border-gray-600'
                    }`}
                  >
                    System
                  </span>
                )}
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
                <Key className="w-5 h-5" />
                <h3 className="font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div
                  className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}
                >
                  <label
                    className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                  >
                    <Key className="w-4 h-4" />
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    disabled={!isCreating}
                    placeholder="Enter role name..."
                    className={`w-full px-3 py-2 rounded-lg border text-sm ${
                      !isCreating ? 'opacity-80 cursor-not-allowed' : ''
                    } ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                        : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                    } focus:outline-none transition-colors`}
                  />
                  {!isCreating && (
                    <p className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Role name cannot be changed via API.
                    </p>
                  )}
                </div>

                <div
                  className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}
                >
                  <label
                    className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                  >
                    <FileText className="w-4 h-4" />
                    Description
                  </label>
                  <textarea
                    value={editableDescription}
                    onChange={(e) => setEditableDescription(e.target.value)}
                    disabled={!isCreating}
                    placeholder="Enter role description..."
                    rows={3}
                    className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                      !isCreating ? 'opacity-80 cursor-not-allowed' : ''
                    } ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                        : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                    } focus:outline-none transition-colors`}
                  />
                </div>

                {!isCreating && (
                  <>
                    <div
                      className={`${
                        theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                      } border rounded-xl p-4`}
                    >
                      <div
                        className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}
                      >
                        <UsersIcon className="w-4 h-4" />
                        Users with this role
                      </div>
                      <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                        {role.usersCount} users
                      </p>
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
                      <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>{role.createdAt}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Key className="w-5 h-5" />
                <h3 className="font-semibold">Permissions ({selectedIds.size})</h3>
              </div>
              <div
                className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}
              >
                <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                  Add permission
                </label>
                <AutocompleteInput
                  value={newPermissionQuery}
                  onChange={setNewPermissionQuery}
                  onAdd={(v) => addPermissionByName(v || newPermissionQuery)}
                  suggestions={suggestionNames}
                  placeholder="Enter permission code..."
                  useBodyPortal
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPermissionByName(newPermissionQuery);
                    }
                  }}
                />

                <div className="space-y-3 mt-4">
                  {Object.entries(groupedSelected).map(([category, names]) => (
                    <div key={category}>
                      <div
                        className={`text-sm font-medium mb-2 capitalize ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}
                      >
                        {category}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {names.map((name) => (
                          <div
                            key={name}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border font-mono ${
                              theme === 'light'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            <span>{name}</span>
                            <button
                              type="button"
                              onClick={() => removePermissionName(name)}
                              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                theme === 'light' ? 'hover:bg-blue-200' : 'hover:bg-blue-500/30'
                              } transition-colors`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {selectedIds.size === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No permissions assigned
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
            onClick={() => void handleSave()}
            disabled={saving || (isCreating && !editableName.trim()) || detailLoading}
            className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              saving || (isCreating && !editableName.trim()) || detailLoading
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
    </div>
  );
}
