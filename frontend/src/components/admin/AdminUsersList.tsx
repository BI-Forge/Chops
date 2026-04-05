import React, { useState } from 'react';
import { Users as UsersIcon, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { AdminUser } from '../../types/adminSettings';

interface AdminUsersListProps {
  users: AdminUser[];
  onViewUser: (user: AdminUser) => void;
  onRetry?: () => void | Promise<void>;
}

export function AdminUsersList({ users, onViewUser, onRetry }: AdminUsersListProps) {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: AdminUser['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-gray-400" />;
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

  const getRoleColor = (role: string) => {
    if (role === 'admin' || role === 'Administrator') {
      return theme === 'light'
        ? 'bg-purple-100 text-purple-800 border-purple-200'
        : 'bg-purple-500/20 text-purple-400 border-purple-500/30';
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
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Users List</h2>
          <span
            className={`px-2 py-1 rounded-lg ${
              theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
            } text-xs`}
          >
            {filteredUsers.length}
          </span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
              theme === 'light'
                ? 'border-gray-300 text-gray-700 hover:bg-amber-50'
                : 'border-gray-600 text-gray-300 hover:bg-gray-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'light' ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="text"
              placeholder="Search users..."
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

        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2.5 rounded-xl border transition-all text-sm capitalize ${
                statusFilter === status
                  ? theme === 'light'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-700'
                    : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                  : theme === 'light'
                    ? 'bg-white border-gray-300 text-gray-700 hover:border-amber-500/40'
                    : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-yellow-500/30'
              }`}
            >
              {status}
            </button>
          ))}
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
              <th className="text-left py-3 px-4 text-sm font-medium">Username</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Full Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Role</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Permissions</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Last Login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                onClick={() => onViewUser(user)}
                className={`cursor-pointer transition-colors ${
                  theme === 'light' ? 'hover:bg-amber-50/50' : 'hover:bg-yellow-500/10'
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <span className={`font-mono text-sm ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                      {user.username}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                    {user.fullName}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {user.email}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getRoleColor(user.role)}`}
                  >
                    {user.role}
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
                    {user.permissions.length} permissions
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${getStatusColor(user.status)}`}
                  >
                    {getStatusIcon(user.status)}
                    {user.status}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    {user.lastLogin}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className={`text-center py-12 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
