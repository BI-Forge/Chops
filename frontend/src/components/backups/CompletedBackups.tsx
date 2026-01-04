import React from 'react';
import { CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Copy, Check, Clock, HardDrive, FileArchive, Timer } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Backup } from '../../types/backup';

interface CompletedBackupsProps {
  completedBackups: Backup[];
  failedBackups: Backup[];
  onSelectBackup: (backup: Backup) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
  calculateDuration: (start: string, end: string) => string;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    currentPage: number;
  };
  onPageChange: (page: number) => void;
  loading?: boolean;
  totalCompletedCount: number;
}

export function CompletedBackups({ 
  completedBackups,
  failedBackups,
  onSelectBackup, 
  onCopyId, 
  copiedId,
  calculateDuration,
  pagination,
  onPageChange,
  loading = false,
  totalCompletedCount
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
    if (status === 'BACKUP_COMPLETED' || status === 'BACKUP_CREATED') return { text: 'Completed', type: 'completed' };
    if (status === 'BACKUP_FAILED') return { text: 'Failed', type: 'failed' };
    return { text: status, type: 'unknown' };
  };

  const allBackups = [...completedBackups, ...failedBackups];
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = pagination.currentPage;

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Completed Backups</h2>
        <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs">{totalCompletedCount}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {allBackups.length === 0 ? (
              <div className={`py-8 text-center ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                No completed backups found
              </div>
            ) : (
              allBackups.map((backup) => {
                const statusInfo = getStatusDisplay(backup.status);
                return (
                  <div
                    key={backup.id}
                    onClick={() => onSelectBackup(backup)}
                    className={`${
                      statusInfo.type === 'completed'
                        ? theme === 'light' ? 'bg-green-50/50 border-green-500/40 hover:border-green-500/60' : 'bg-gray-800/40 border-green-500/30 hover:border-green-500/50'
                        : theme === 'light' ? 'bg-red-50/50 border-red-500/40 hover:border-red-500/60' : 'bg-gray-800/40 border-red-500/30 hover:border-red-500/50'
                    } border rounded-lg p-4 transition-all duration-200 group cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
                            statusInfo.type === 'completed'
                              ? 'bg-green-500/20 border border-green-500/30'
                              : 'bg-red-500/20 border border-red-500/30'
                          }`}>
                            {statusInfo.type === 'completed' ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            <span className={`text-xs capitalize ${
                              statusInfo.type === 'completed' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {statusInfo.text}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className={`${
                            theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                          } font-medium truncate`}>{backup.name}</h3>
                          <button
                            onClick={(e) => onCopyId(backup.name, e)}
                            className={`p-1 rounded ${
                              theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-gray-700/50'
                            } transition-colors flex-shrink-0`}
                            title="Copy Name"
                          >
                            {copiedId === backup.name ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className={`w-3 h-3 ${
                                theme === 'light' ? 'text-gray-600' : 'text-gray-500'
                              }`} />
                            )}
                          </button>
                        </div>
                        <div className={`flex items-center gap-4 text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {backup.start_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            {calculateDuration(backup.start_time, backup.end_time)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatBytes(backup.total_size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileArchive className="w-3 h-3" />
                            {backup.num_files.toLocaleString()} files
                          </span>
                        </div>
                      </div>
                      <Eye className={`w-5 h-5 ${
                        theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'
                      } transition-colors flex-shrink-0`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
        <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
          theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
        }`}>
          <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
            Showing {(currentPage - 1) * pagination.limit + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} backups
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
        </>
      )}
    </div>
  );
}