import { Users as UsersIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Eye, Copy, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface User {
  name: string;
  id: string;
  profile: string;
  storage: string;
  role_name: string;
  grants: string[];
}

interface UsersTableProps {
  users: User[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalCount: number;
  onUserClick: (user: User) => void;
  onPageChange: (page: number) => void;
  onCreateUser: () => void;
  onDeleteClick: (user: User) => void;
  onCopyClick: (user: User) => void;
}

export function UsersTable({
  users,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalCount,
  onUserClick,
  onPageChange,
  onCreateUser,
  onDeleteClick,
  onCopyClick,
}: UsersTableProps) {
  const { theme } = useTheme();

  return (
    <div className={`${
      theme === 'light' 
        ? 'bg-white/90 border-amber-500/30' 
        : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      {/* Header with Title and Create Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-3 ${
            theme === 'light'
              ? 'bg-amber-500/30 text-amber-600'
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            <UsersIcon className="w-5 h-5" />
          </div>
          <h2 className={`text-xl ${
            theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
          }`}>
            Users
          </h2>
        </div>
        <button
          onClick={onCreateUser}
          className={`px-4 py-2 rounded-lg text-sm ${
            theme === 'light'
              ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
              : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
          } transition-all duration-200 flex items-center gap-2 font-medium`}
        >
          <Plus className="w-3.5 h-3.5" />
          Create User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
            }`}>
              <th className="text-left py-3 px-4 text-sm font-medium">
                User Name
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium">
                Role
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium">
                Profile
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium">
                Storage
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium">
                Grants
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => onUserClick(user)}
                  className={`border-b ${
                    theme === 'light'
                      ? 'border-amber-500/20 hover:bg-amber-50/30'
                      : 'border-yellow-500/10 hover:bg-gray-800/40'
                  } transition-colors cursor-pointer`}
                >
                  <td className={`py-3 px-4 text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold ${
                        theme === 'light'
                          ? 'bg-amber-500/30 text-amber-600'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {user.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className={`py-3 px-4 text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {user.role_name ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {user.role_name}
                      </span>
                    ) : (
                      <span className={`${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>—</span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {user.profile ? (
                      <span>{user.profile}</span>
                    ) : (
                      <span className={`${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}>—</span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {user.storage}
                  </td>
                  <td className={`py-3 px-4 text-right text-sm ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      theme === 'light'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-amber-500/20 text-yellow-400'
                    }`}>
                      {user.grants.length} {user.grants.length === 1 ? 'grant' : 'grants'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserClick(user);
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          theme === 'light'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700'
                            : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400'
                        }`}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopyClick(user);
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          theme === 'light'
                            ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/40 hover:border-green-600 text-green-700'
                            : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-400'
                        }`}
                        title="Copy User"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteClick(user);
                        }}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          theme === 'light'
                            ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 hover:border-red-600 text-red-700'
                            : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400'
                        }`}
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <UsersIcon className={`w-12 h-12 ${
                      theme === 'light' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                    <p className={`text-sm ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      No users found
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
          theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
        }`}>
          <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
            Showing {startIndex + 1} to {Math.min(endIndex, totalCount)} of {totalCount} users
          </div>
          
          <div className="flex items-center gap-2">
            {/* First Page Button */}
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <div className="flex items-center gap-1">
                <ChevronsLeft className="w-4 h-4" />
                <span>First</span>
              </div>
            </button>

            {/* Previous Page Button */}
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <ChevronLeft className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                
                if (endPage - startPage < maxPagesToShow - 1) {
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                // Always show first page
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => onPageChange(1)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border-amber-500/40 hover:border-amber-600'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      1
                    </button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis-start" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                }

                // Show page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => onPageChange(i)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                        currentPage === i
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                          : theme === 'light'
                            ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border border-amber-500/40 hover:border-amber-600'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }

                // Always show last page
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis-end" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => onPageChange(totalPages)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border-amber-500/40 hover:border-amber-600'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}
            </div>

            {/* Next Page Button */}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Last</span>
                <ChevronsRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


