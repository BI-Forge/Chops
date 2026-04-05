import React, { useMemo, useState } from 'react';
import { Lock, Search, Shield } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { AdminPermission } from '../../types/adminSettings';

interface AdminPermissionsListProps {
  permissions: AdminPermission[];
}

export function AdminPermissionsList({ permissions }: AdminPermissionsListProps) {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [permissions, searchTerm]);

  const groupedPermissions = useMemo(() => {
    return filtered.reduce(
      (acc, permission) => {
        if (!acc[permission.category]) acc[permission.category] = [];
        acc[permission.category].push(permission);
        return acc;
      },
      {} as Record<string, AdminPermission[]>
    );
  }, [filtered]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      users: theme === 'light' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      auth: theme === 'light' ? 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200' : 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
      roles: theme === 'light' ? 'bg-pink-100 text-pink-800 border-pink-200' : 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      permissions: theme === 'light' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-red-500/20 text-red-400 border-red-500/30',
      system: theme === 'light' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      databases: theme === 'light' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      queries: theme === 'light' ? 'bg-cyan-100 text-cyan-800 border-cyan-200' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      tables: theme === 'light' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-green-500/20 text-green-400 border-green-500/30',
      clickhouse: theme === 'light' ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      settings: theme === 'light' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      backups: theme === 'light' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      monitoring: theme === 'light' ? 'bg-teal-100 text-teal-800 border-teal-200' : 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      logs: theme === 'light' ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      reports: theme === 'light' ? 'bg-violet-100 text-violet-800 border-violet-200' : 'bg-violet-500/20 text-violet-400 border-violet-500/30',
      other: theme === 'light' ? 'bg-gray-100 text-gray-800 border-gray-200' : 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[category] || colors.other;
  };

  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}
    >
      <div className="mb-4 flex items-center gap-2">
        <Lock className={`w-5 h-5 shrink-0 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>System Permissions</h2>
        <span
          className={`px-2 py-1 rounded-lg ${
            theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
          } text-xs`}
        >
          {filtered.length}
        </span>
      </div>

      <div
        className={`mb-6 rounded-xl border p-4 ${
          theme === 'light'
            ? 'bg-white/80 border-amber-500/25'
            : 'bg-gray-800/50 border-yellow-500/15'
        }`}
      >
        <div className="relative w-full max-w-xl">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
              theme === 'light' ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
          <input
            type="text"
            placeholder="Search permissions…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search permissions"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm ${
              theme === 'light'
                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
            } focus:outline-none transition-colors`}
          />
        </div>
      </div>

      <div
        className={`mb-6 p-4 rounded-xl border ${
          theme === 'light' ? 'bg-blue-50/50 border-blue-200 text-blue-800' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
        }`}
      >
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">System permissions (catalog)</p>
            <p className={`text-xs mt-1 ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>
              Permissions are defined in the database. Assign them to roles on the Roles tab; users inherit permissions through their role.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPermissions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, categoryPermissions]) => (
            <div key={category}>
              <div
                className={`flex items-center gap-2 mb-3 pb-2 border-b ${
                  theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
                }`}
              >
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium border capitalize ${getCategoryColor(category)}`}
                >
                  {category}
                </span>
                <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                  {categoryPermissions.length} permissions
                </span>
              </div>

              <div className="space-y-2">
                {categoryPermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className={`p-4 rounded-xl border transition-colors ${
                      theme === 'light'
                        ? 'bg-gray-50/50 border-gray-200 hover:bg-gray-100/50'
                        : 'bg-gray-800/30 border-gray-700/50 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span
                            className={`text-xs font-mono px-2 py-0.5 rounded ${
                              theme === 'light' ? 'bg-gray-200 text-gray-600' : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            #{permission.id}
                          </span>
                          <code
                            className={`text-sm font-mono px-2 py-1 rounded ${
                              theme === 'light' ? 'bg-blue-100 text-blue-800' : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {permission.name}
                          </code>
                          <span className={`font-medium text-sm ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                            {permission.title}
                          </span>
                        </div>
                        <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                          {permission.description || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {filtered.length === 0 && (
          <div className={`text-center py-12 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No permissions found</p>
          </div>
        )}
      </div>
    </div>
  );
}
