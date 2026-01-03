import React, { useState } from 'react';
import { Key, Search, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { AdminRole } from '../../pages/AdminSettingsPage';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';

interface AdminRolesListProps {
  roles: AdminRole[];
  onViewRole: (role: AdminRole) => void;
  onCreateRole: () => void;
  onDeleteRole: (roleId: string) => void;
}

export function AdminRolesList({ roles, onViewRole, onCreateRole, onDeleteRole }: AdminRolesListProps) {
  const { theme } = useTheme();
  const { success } = useAlert();
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);

  // Filter roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch = 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getRoleColor = (name: string) => {
    if (name === 'Administrator') {
      return theme === 'light'
        ? 'bg-purple-100 text-purple-800 border-purple-200'
        : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
    if (name === 'Database Admin') {
      return theme === 'light'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
    if (name === 'Developer') {
      return theme === 'light'
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-green-500/20 text-green-400 border-green-500/30';
    }
    return theme === 'light'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30';
  };

  const handleDeleteClick = (e: React.MouseEvent, roleId: string) => {
    e.stopPropagation();
    setDeleteRoleId(roleId);
  };

  const handleConfirmDelete = () => {
    if (deleteRoleId) {
      onDeleteRole(deleteRoleId);
      success('Role deleted successfully');
      setDeleteRoleId(null);
    }
  };

  const roleToDelete = roles.find(r => r.id === deleteRoleId);

  return (
    <>
      <div className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
            <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Roles List</h2>
            <span className={`px-2 py-1 rounded-lg ${
              theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
            } text-xs`}>
              {filteredRoles.length}
            </span>
          </div>
          
          <button
            onClick={onCreateRole}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm ${
              theme === 'light'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create Role
          </button>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              theme === 'light' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                  : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
              } focus:outline-none transition-colors text-sm`}
            />
          </div>
        </div>

        {/* Roles Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${
                theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
              }`}>
                <th className="text-left py-3 px-4 text-sm font-medium">Role Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Permissions</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Users</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Created At</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredRoles.map((role) => (
                <tr
                  key={role.id}
                  onClick={() => onViewRole(role)}
                  className={`cursor-pointer transition-colors ${
                    theme === 'light'
                      ? 'hover:bg-amber-50/50'
                      : 'hover:bg-yellow-500/10'
                  }`}
                >
                  {/* Role Name */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleColor(role.name)}`}>
                      {role.name}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-4">
                    <span className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {role.description}
                    </span>
                  </td>

                  {/* Permissions Count */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      theme === 'light'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {role.permissions.length} permissions
                    </span>
                  </td>

                  {/* Users Count */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      theme === 'light'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}>
                      {role.usersCount} users
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="px-4 py-4">
                    <span className={`text-sm ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {role.createdAt}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <button
                      onClick={(e) => handleDeleteClick(e, role.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'light'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-red-400 hover:bg-red-500/10'
                      }`}
                      title="Delete role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRoles.length === 0 && (
            <div className={`text-center py-12 ${
              theme === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No roles found</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteRoleId && roleToDelete && (
        <ConfirmDeleteModal
          isOpen={!!deleteRoleId}
          onClose={() => setDeleteRoleId(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Role"
          message={`Are you sure you want to delete role "${roleToDelete.name}"? This action cannot be undone and will affect ${roleToDelete.usersCount} user(s).`}
        />
      )}
    </>
  );
}
