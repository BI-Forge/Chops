import React from 'react';
import { Lock, Search, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { AdminPermission } from '../../pages/AdminSettingsPage';

interface AdminPermissionsListProps {
  permissions: AdminPermission[];
}

export function AdminPermissionsList({ permissions }: AdminPermissionsListProps) {
  const { theme } = useTheme();

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, AdminPermission[]>);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'users': theme === 'light' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'roles': theme === 'light' ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'permissions': theme === 'light' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-red-500/20 text-red-400 border-red-500/30',
      'databases': theme === 'light' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'queries': theme === 'light' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'tables': theme === 'light' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-green-500/20 text-green-400 border-green-500/30',
      'settings': theme === 'light' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'backups': theme === 'light' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'monitoring': theme === 'light' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      'logs': theme === 'light' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'reports': theme === 'light' ? 'bg-violet-100 text-violet-800 border-violet-200' : 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      'system': theme === 'light' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    return colors[category] || (theme === 'light' ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-gray-500/20 text-gray-400 border-gray-500/30');
  };

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Lock className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>System Permissions</h2>
        <span className={`px-2 py-1 rounded-lg ${
          theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
        } text-xs`}>
          {permissions.length}
        </span>
      </div>

      {/* Info Banner */}
      <div className={`mb-6 p-4 rounded-xl border ${
        theme === 'light' 
          ? 'bg-blue-50/50 border-blue-200 text-blue-800' 
          : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      }`}>
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">System Permissions (Read-only)</p>
            <p className={`text-xs mt-1 ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
              These are system-defined permissions that can be assigned to roles. Permissions cannot be created, edited, or deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions by Category */}
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
          <div key={category}>
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border capitalize ${getCategoryColor(category)}`}>
                {category}
              </span>
              <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                {categoryPermissions.length} permissions
              </span>
            </div>

            {/* Permissions Table */}
            <div className="space-y-2">
              {categoryPermissions.map((permission) => (
                <div
                  key={permission.name}
                  className={`p-4 rounded-xl border transition-colors ${
                    theme === 'light'
                      ? 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/50'
                      : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <code className={`text-sm font-mono px-2 py-1 rounded ${
                          theme === 'light'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {permission.name}
                        </code>
                        <span className={`font-medium text-sm ${
                          theme === 'light' ? 'text-gray-800' : 'text-white'
                        }`}>
                          {permission.title}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {permission.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {permissions.length === 0 && (
          <div className={`text-center py-12 ${
            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No permissions found</p>
          </div>
        )}
      </div>
    </div>
  );
}