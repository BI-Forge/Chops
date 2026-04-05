import React, { useState } from 'react';
import { Key, Search, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { AdminRole } from '../../types/adminSettings';

interface AdminRolesListProps {
  roles: AdminRole[];
  onViewRole: (role: AdminRole) => void | Promise<void>;
  onCreateRole: () => void;
  onDeleteRole?: (role: AdminRole) => void | Promise<void>;
}

export function AdminRolesList({ roles, onViewRole, onCreateRole, onDeleteRole }: AdminRolesListProps) {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRoles = roles.filter((role) => {
    const q = searchTerm.toLowerCase();
    return role.name.toLowerCase().includes(q) || role.description.toLowerCase().includes(q);
  });

  const getRoleColor = (name: string) => {
    if (name === 'admin') {
      return theme === 'light'
        ? 'bg-purple-100 text-purple-800 border-purple-200'
        : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
    if (name === 'guest') {
      return theme === 'light'
        ? 'bg-slate-100 text-slate-800 border-slate-200'
        : 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
    return theme === 'light'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30';
  };

  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Key className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Roles List</h2>
          <span
            className={`px-2 py-1 rounded-lg ${
              theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
            } text-xs`}
          >
            {filteredRoles.length}
          </span>
        </div>

        <button
          type="button"
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

      <div className="mb-4">
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              theme === 'light' ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${
                theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
              }`}
            >
              <th className="text-left py-3 px-4 text-sm font-medium">Role Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Permissions</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Users</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Created At</th>
              {onDeleteRole && (
                <th className="text-right py-3 px-4 text-sm font-medium w-24">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filteredRoles.map((role) => (
              <tr
                key={role.id}
                onClick={() => void onViewRole(role)}
                className={`cursor-pointer transition-colors ${
                  theme === 'light' ? 'hover:bg-amber-50/50' : 'hover:bg-yellow-500/10'
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleColor(role.name)}`}
                    >
                      {role.name}
                    </span>
                    {role.isSystem && (
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
                </td>

                <td className="px-4 py-4">
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {role.description}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      theme === 'light'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    {role.permissionsCount} permissions
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                      theme === 'light'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                    }`}
                  >
                    {role.usersCount} users
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {role.createdAt}
                  </span>
                </td>
                {onDeleteRole && (
                  <td className="px-4 py-4 text-right">
                    {!role.isSystem && role.usersCount === 0 ? (
                      <button
                        type="button"
                        title="Delete role"
                        aria-label={`Delete role ${role.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            typeof window !== 'undefined' &&
                            !window.confirm(`Delete role "${role.name}"? This cannot be undone.`)
                          ) {
                            return;
                          }
                          void onDeleteRole(role);
                        }}
                        className={`inline-flex items-center justify-center p-2 rounded-lg border transition-colors ${
                          theme === 'light'
                            ? 'border-red-200 text-red-700 hover:bg-red-50'
                            : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className={`text-xs ${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRoles.length === 0 && (
          <div className={`text-center py-12 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No roles found</p>
          </div>
        )}
      </div>
    </div>
  );
}
