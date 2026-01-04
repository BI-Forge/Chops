import React, { useState } from 'react';
import { Activity, Clock, FileArchive, HardDrive, Eye, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { Backup } from '../../types/backup';

interface InProgressBackupsProps {
  backups: Backup[];
  onSelectBackup: (backup: Backup) => void;
  onCopyId: (id: string, e: React.MouseEvent) => void;
  copiedId: string | null;
  inProgressCount: number;
}

export function InProgressBackups({ 
  backups, 
  onSelectBackup, 
  onCopyId, 
  copiedId,
  inProgressCount
}: InProgressBackupsProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Calculate height for 3 items (each item is approx 100px without progress bar)
  const collapsedHeight = '330px'; // Height for 3 items + some padding

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Backups in Progress</h2>
          <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">{inProgressCount}</span>
        </div>
        
        {/* Expand/Collapse Button - only show if more than 3 backups */}
        {backups.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
              theme === 'light'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700'
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400'
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Expand ({backups.length - 3} more)</span>
              </>
            )}
          </button>
        )}
      </div>

      <div 
        className={`space-y-3 overflow-y-auto custom-scrollbar transition-all duration-300 ${
          isExpanded ? 'max-h-[600px]' : ''
        }`}
        style={{ 
          maxHeight: !isExpanded && backups.length > 3 ? collapsedHeight : undefined
        }}
      >
        {backups.map((backup) => {
          return (
            <div
              key={backup.id}
              onClick={() => onSelectBackup(backup)}
              className={`${
                theme === 'light' ? 'bg-blue-50/50 border-blue-500/40 hover:border-blue-500/60' : 'bg-gray-800/40 border-blue-500/30 hover:border-blue-500/50'
              } border rounded-lg p-4 transition-all duration-200 group cursor-pointer`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                      <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                      <span className="text-xs text-blue-400">In Progress</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className={`${
                      theme === 'light' ? 'text-blue-600' : 'text-blue-400'
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
            </div>
          );
        })}
      </div>
    </div>
  );
}