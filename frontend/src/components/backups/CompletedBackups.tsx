import React from 'react';
import { CheckCircle, XCircle, Eye, Loader2, Copy, Check, Clock, HardDrive, FileArchive, Timer } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { ListPagination } from '../ListPagination';
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

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={pagination.total}
            rangeStart={pagination.offset + 1}
            rangeEnd={pagination.offset + allBackups.length}
            itemLabel="backups"
            onPageChange={onPageChange}
          />
        </>
      )}
    </div>
  );
}