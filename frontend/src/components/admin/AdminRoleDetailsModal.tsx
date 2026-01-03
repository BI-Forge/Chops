import React, { useState, useEffect } from 'react';
import { XCircle, Key, FileText, Users as UsersIcon, Save, Trash2, Calendar } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { AdminRole } from '../../pages/AdminSettingsPage';
import { AutocompleteInput } from '../AutocompleteInput';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface AdminRoleDetailsModalProps {
  role: AdminRole | null;
  onClose: () => void;
  isCreating?: boolean;
}

export function AdminRoleDetailsModal({ role, onClose, isCreating = false }: AdminRoleDetailsModalProps) {
  const { theme } = useTheme();
  const { success } = useAlert();

  // Available permissions for autocomplete
  const availablePermissions = [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'roles.view', 'roles.manage',
    'permissions.view', 'permissions.manage',
    'databases.view', 'databases.create', 'databases.edit', 'databases.delete', 'databases.manage',
    'queries.view', 'queries.create', 'queries.edit', 'queries.delete', 'queries.execute',
    'tables.view', 'tables.create', 'tables.edit', 'tables.delete', 'tables.manage',
    'settings.view', 'settings.manage',
    'backups.view', 'backups.create', 'backups.restore',
    'monitoring.view',
    'logs.view', 'logs.export',
    'reports.view', 'reports.create',
    'system.manage', 'system.restart'
  ];

  // Editable states
  const [editableName, setEditableName] = useState('');
  const [editableDescription, setEditableDescription] = useState('');
  const [editablePermissions, setEditablePermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize editable states
  useEffect(() => {
    if (isCreating) {
      setEditableName('');
      setEditableDescription('');
      setEditablePermissions([]);
      setNewPermission('');
    } else if (role) {
      setEditableName(role.name);
      setEditableDescription(role.description);
      setEditablePermissions([...role.permissions]);
      setNewPermission('');
    }
  }, [role, isCreating]);

  // Block body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!role && !isCreating) return null;

  const getRoleColor = (name: string) => {
    if (name === 'Administrator') {
      return theme === 'light'
        ? 'from-purple-400 to-purple-600'
        : 'from-purple-500 to-purple-700';
    }
    if (name === 'Database Admin') {
      return theme === 'light'
        ? 'from-blue-400 to-blue-600'
        : 'from-blue-500 to-blue-700';
    }
    if (name === 'Developer') {
      return theme === 'light'
        ? 'from-green-400 to-green-600'
        : 'from-green-500 to-green-700';
    }
    return theme === 'light'
      ? 'from-amber-400 to-orange-500'
      : 'from-amber-500 to-yellow-600';
  };

  // Group permissions by category
  const groupedPermissions = editablePermissions.reduce((acc, permission) => {
    const [category] = permission.split('.');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, string[]>);

  const handleAddPermission = (valueToAdd?: string) => {
    const permissionValue = valueToAdd || newPermission;
    if (permissionValue.trim() && !editablePermissions.includes(permissionValue.trim())) {
      setEditablePermissions([...editablePermissions, permissionValue.trim()]);
      setNewPermission('');
    }
  };

  const handleRemovePermission = (permission: string) => {
    setEditablePermissions(editablePermissions.filter(p => p !== permission));
  };

  const handleSave = () => {
    if (!editableName.trim()) {
      return;
    }
    success(isCreating ? 'Role created successfully' : 'Role details saved successfully');
    console.log('Saving role:', {
      id: role?.id,
      name: editableName,
      description: editableDescription,
      permissions: editablePermissions
    });
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    console.log('Deleting role:', editableName);
    success('Role deleted successfully');
    setShowDeleteConfirm(false);
    onClose();
  };

  const getPermissionSuggestions = () => {
    if (!newPermission) {
      // Show all available permissions when input is empty
      return availablePermissions.filter(permission => 
        !editablePermissions.includes(permission)
      );
    }
    return availablePermissions.filter(permission => 
      permission.toLowerCase().includes(newPermission.toLowerCase()) && 
      !editablePermissions.includes(permission)
    );
  };

  const permissionSuggestions = getPermissionSuggestions();

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
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${
                isCreating ? 'from-amber-400 to-orange-500' : getRoleColor(editableName)
              } flex items-center justify-center`}>
                <Key className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${
                  theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                }`}>
                  {isCreating ? 'New Role' : editableName}
                </h2>
                <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm mt-0.5`}>
                  {isCreating ? 'Create New Role' : 'Role Details'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-lg ${
                theme === 'light'
                  ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              } border transition-all duration-200 flex items-center justify-center group`}
            >
              <XCircle className={`w-5 h-5 ${
                theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
              }`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Key className="w-5 h-5" />
                  <h3 className="font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {/* Editable Name */}
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      <Key className="w-4 h-4" />
                      Role Name
                    </label>
                    <input
                      type="text"
                      value={editableName}
                      onChange={(e) => setEditableName(e.target.value)}
                      placeholder="Enter role name..."
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                          : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                      } focus:outline-none transition-colors text-sm`}
                    />
                  </div>

                  {/* Editable Description */}
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      <FileText className="w-4 h-4" />
                      Description
                    </label>
                    <textarea
                      value={editableDescription}
                      onChange={(e) => setEditableDescription(e.target.value)}
                      placeholder="Enter role description..."
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                          : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                      } focus:outline-none transition-colors text-sm resize-none`}
                    />
                  </div>

                  {/* Users Count - Hide for new roles */}
                  {!isCreating && role && (
                    <div className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}>
                      <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                        <UsersIcon className="w-4 h-4" />
                        Users with this role
                      </div>
                      <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                        {role.usersCount} users
                      </p>
                    </div>
                  )}

                  {/* Created At - Hide for new roles */}
                  {!isCreating && role && (
                    <div className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}>
                      <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                        <Calendar className="w-4 h-4" />
                        Created At
                      </div>
                      <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                        {role.createdAt}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Key className="w-5 h-5" />
                  <h3 className="font-semibold">Permissions ({editablePermissions.length})</h3>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Add Permission
                  </label>
                  <AutocompleteInput
                    value={newPermission}
                    onChange={setNewPermission}
                    onAdd={handleAddPermission}
                    suggestions={permissionSuggestions}
                    placeholder="Add permission..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPermission();
                      }
                    }}
                  />
                  
                  {/* Permissions by category */}
                  <div className="space-y-3 mt-4">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category}>
                        <div className={`text-sm font-medium mb-2 capitalize ${
                          theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                        }`}>
                          {category}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((permission) => (
                            <div
                              key={permission}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border font-mono ${
                                theme === 'light'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              } group transition-all duration-200 hover:scale-105`}
                            >
                              <span>{permission}</span>
                              <button
                                onClick={() => handleRemovePermission(permission)}
                                className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                  theme === 'light'
                                    ? 'hover:bg-blue-200'
                                    : 'hover:bg-blue-500/30'
                                } transition-colors`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {editablePermissions.length === 0 && (
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                        No permissions assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${
            theme === 'light' ? 'border-amber-500/20 bg-gray-50/50' : 'border-yellow-500/20 bg-gray-800/50'
          } flex items-center justify-between gap-3`}>
            {!isCreating && (
              <button
                onClick={handleDelete}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  theme === 'light'
                    ? 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-700'
                    : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Delete Role
              </button>
            )}
            
            <div className={`flex gap-3 ${isCreating ? 'ml-auto' : ''}`}>
              <button
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
                onClick={handleSave}
                disabled={!editableName.trim()}
                className={`px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  !editableName.trim()
                    ? theme === 'light'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : theme === 'light'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
                }`}
              >
                <Save className="w-4 h-4" />
                {isCreating ? 'Create Role' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Role"
          message={`Are you sure you want to delete role "${editableName}"? This action cannot be undone${role ? ` and will affect ${role.usersCount} user(s)` : ''}.`}
        />
      )}

      <style>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme === 'light' ? 'rgba(245, 158, 11, 0.5)' : 'rgba(234, 179, 8, 0.5)'};
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme === 'light' ? 'rgba(245, 158, 11, 0.7)' : 'rgba(234, 179, 8, 0.7)'};
        }
      `}</style>
    </>
  );
}