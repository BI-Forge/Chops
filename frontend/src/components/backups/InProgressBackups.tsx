import React from 'react';
import { Activity, Clock, FileArchive, HardDrive, Eye, Copy, Check } from 'lucide-react';
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

interface InProgressBackupsProps {
  backups: Backup[];
  onSelectBackup: (backup: Backup) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
  calculateProgress: (backup: Backup) => number;
}

export function InProgressBackups({ 
  backups, 
  onSelectBackup, 
  onCopyId, 
  copiedId,
  calculateProgress 
}: InProgressBackupsProps) {
  const { theme } = useTheme();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (backups.length === 0) {
    return null;
  }

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Backups in Progress</h2>
        <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">{backups.length}</span>
      </div>

      <div className="space-y-3">
        {backups.map((backup) => {
          const progress = calculateProgress(backup);
          return (
            <div
              key={backup.id}
              onClick={() => onSelectBackup(backup)}
              className={`${
                theme === 'light' ? 'bg-blue-50/50 border-blue-500/40 hover:border-blue-500/60' : 'bg-gray-800/40 border-blue-500/30 hover:border-blue-500/50'
              } border rounded-lg p-4 transition-all duration-200 group cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`${
                      theme === 'light' ? 'text-gray-900' : 'text-white'
                    } font-medium truncate`}>{backup.name}</h3>
                    <button
                      onClick={(e) => onCopyId(backup.id, e)}
                      className={`p-1 rounded ${
                        theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-gray-700/50'
                      } transition-colors flex-shrink-0`}
                      title="Copy ID"
                    >
                      {copiedId === backup.id ? (
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
                      <FileArchive className="w-3 h-3" />
                      {backup.files_read}/{backup.num_files} files
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatBytes(backup.bytes_read)} / {formatBytes(backup.total_size)}
                    </span>
                  </div>
                </div>
                <Eye className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'
                } transition-colors flex-shrink-0`} />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Progress</span>
                  <span className="text-blue-400 font-medium">{progress}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${
                  theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'
                }`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}