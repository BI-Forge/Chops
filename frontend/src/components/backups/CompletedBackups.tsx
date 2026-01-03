import React, { useState } from 'react';
import { CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Backup {
  id: string;
  name: string;
  base_backup_name: string;
  query_id: string;
  status: string;
  error: string;
  start_time: string;
  end_time: string;
  num_files: number;
  total_size: number; // bytes
  num_entries: number;
  uncompressed_size: number; // bytes
  compressed_size: number; // bytes
  files_read: number;
  bytes_read: number; // bytes
  sql_query?: string;
}

interface CompletedBackupsProps {
  completedBackups: Backup[];
  failedBackups: Backup[];
  onSelectBackup: (backup: Backup) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
  calculateDuration: (start: string, end: string) => string;
}

export function CompletedBackups({ 
  completedBackups,
  failedBackups,
  onSelectBackup, 
  onCopyId, 
  copiedId,
  calculateDuration 
}: CompletedBackupsProps) {
  const { theme } = useTheme();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusDisplay = (status: string) => {
    if (status === 'BACKUP_COMPLETED') return { text: 'Completed', type: 'completed' };
    if (status === 'BACKUP_FAILED') return { text: 'Failed', type: 'failed' };
    return { text: status, type: 'unknown' };
  };

  const allBackups = [...completedBackups, ...failedBackups];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(allBackups.length / itemsPerPage);
  const currentItems = allBackups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Completed Backups</h2>
        <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">{completedBackups.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
            }`}>
              <th className="text-left py-3 px-4 text-sm font-medium">Name</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Start Time</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Duration</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Size</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Files</th>
              <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((backup) => (
              <tr
                key={backup.id}
                className={`border-b ${
                  theme === 'light' ? 'border-amber-500/20 hover:bg-amber-50/30' : 'border-yellow-500/10 hover:bg-gray-800/40'
                } transition-colors cursor-pointer`}
                onClick={() => onSelectBackup(backup)}
              >
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {backup.name}
                </td>
                <td className="py-3 px-4">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded ${
                    getStatusDisplay(backup.status).type === 'completed'
                      ? 'bg-green-500/20 border border-green-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    {getStatusDisplay(backup.status).type === 'completed' ? (
                      <CheckCircle className="w-3 h-3 text-green-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-xs capitalize ${
                      getStatusDisplay(backup.status).type === 'completed' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {getStatusDisplay(backup.status).text}
                    </span>
                  </div>
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {backup.start_time}
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {calculateDuration(backup.start_time, backup.end_time)}
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {formatBytes(backup.total_size)}
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {backup.num_files.toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBackup(backup);
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {allBackups.length > 0 && (
        <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
          theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
        }`}>
          <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, allBackups.length)} of {allBackups.length} backups
          </div>
          
          <div className="flex items-center gap-2">
            {/* First Page Button */}
            <button
              onClick={() => handlePageChange(1)}
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
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                      onClick={() => handlePageChange(1)}
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
                      onClick={() => handlePageChange(i)}
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
                      onClick={() => handlePageChange(totalPages)}
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
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
              onClick={() => handlePageChange(totalPages)}
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