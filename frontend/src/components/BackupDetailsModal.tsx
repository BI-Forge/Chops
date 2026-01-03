import React, { useEffect, useState } from 'react';
import { Database, Activity, CheckCircle, XCircle, Clock, HardDrive, FileArchive, Code, Copy, Check, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { format } from 'sql-formatter';

interface Backup {
  id: string;
  name: string;
  base_backup_name: string;
  query_id: string;
  status: string; // BACKUP_CREATED, BACKUP_FAILED, etc.
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
  sql_query?: string; // SQL query used for backup
}

interface BackupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  backup: Backup | null;
  calculateDuration: (start: string, end: string) => string;
  calculateProgress: (backup: Backup) => number;
}

export function BackupDetailsModal({ isOpen, onClose, backup, calculateDuration, calculateProgress }: BackupDetailsModalProps) {
  const { theme } = useTheme();
  const [copiedSQL, setCopiedSQL] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSQL = (sql: string): string => {
    try {
      return format(sql, { language: 'sql' });
    } catch (error) {
      return sql;
    }
  };

  const getStatusInfo = (status: string) => {
    if (status === 'BACKUP_IN_PROGRESS') {
      return { type: 'in_progress', icon: Activity, text: 'In Progress', color: 'blue' };
    }
    if (status === 'BACKUP_COMPLETED' || status === 'BACKUP_CREATED') {
      return { type: 'completed', icon: CheckCircle, text: 'Completed', color: 'green' };
    }
    if (status === 'BACKUP_FAILED') {
      return { type: 'failed', icon: XCircle, text: 'Failed', color: 'red' };
    }
    return { type: 'unknown', icon: Activity, text: status, color: 'gray' };
  };

  const handleCopySQL = () => {
    if (backup?.sql_query) {
      const formattedSQL = formatSQL(backup.sql_query);
      // Safe copy method with fallback
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(formattedSQL).then(() => {
            setCopiedSQL(true);
            setTimeout(() => setCopiedSQL(false), 2000);
          }).catch(() => {
            fallbackCopyTextToClipboard(formattedSQL);
          });
        } else {
          fallbackCopyTextToClipboard(formattedSQL);
        }
      } catch (err) {
        fallbackCopyTextToClipboard(formattedSQL);
      }
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2000);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    
    document.body.removeChild(textArea);
  };

  // Custom yellow SQL syntax highlighting theme
  const customSQLStyle = {
    'code[class*="language-"]': {
      color: '#ffffff',
      background: 'transparent',
      textShadow: 'none',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '0.875rem',
      textAlign: 'left' as const,
      whiteSpace: 'pre-wrap' as const,
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      tabSize: 2,
      hyphens: 'none' as const,
    },
    'pre[class*="language-"]': {
      color: '#ffffff',
      background: 'transparent',
      textShadow: 'none',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '0.875rem',
      textAlign: 'left' as const,
      whiteSpace: 'pre-wrap' as const,
      wordSpacing: 'normal',
      wordBreak: 'normal',
      wordWrap: 'normal',
      lineHeight: '1.5',
      tabSize: 2,
      hyphens: 'none' as const,
      padding: '0',
      margin: '0',
      overflow: 'visible',
    },
    'keyword': { color: '#facc15', fontWeight: 'bold' },
    'builtin': { color: '#fcd34d' },
    'function': { color: '#fde047' },
    'string': { color: '#fef08a' },
    'number': { color: '#fef3c7' },
    'operator': { color: '#9ca3af' },
    'punctuation': { color: '#6b7280' },
    'comment': { color: '#4b5563', fontStyle: 'italic' },
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !backup) return null;

  const statusInfo = getStatusInfo(backup.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm`}
      onClick={onClose}
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div 
        className={`bg-gradient-to-br ${
          theme === 'light'
            ? 'from-white/95 to-gray-50/95 border-amber-500/30'
            : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${
              statusInfo.color === 'blue'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : statusInfo.color === 'green'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            } flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${
                statusInfo.color === 'blue' ? 'text-blue-400 animate-pulse' :
                statusInfo.color === 'green' ? 'text-green-400' : 'text-red-400'
              }`} />
            </div>
            <div>
              <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Backup Details</h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs mt-0.5`}>Backup ID: {backup.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-lg ${
              theme === 'light'
                ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
            } border transition-all duration-200 flex items-center justify-center group`}
          >
            <XCircle className={`w-5 h-5 ${
              theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
            }`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
          <div className="flex flex-col lg:!flex-row gap-6">
            {/* Left Column - SQL Query */}
            <div className={`flex-1 ${
              theme === 'light'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/40'
                : 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/40'
            } border-2 rounded-xl p-5 shadow-lg flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
                  <Code className="w-5 h-5" />
                  <h3 className="font-semibold">SQL Query</h3>
                </div>
                {backup.sql_query && (
                  <button
                    onClick={handleCopySQL}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      theme === 'light'
                        ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30 text-gray-700 hover:text-amber-700'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
                    } border transition-all duration-200 text-sm`}
                    title="Copy to clipboard"
                  >
                    {copiedSQL ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className={`${
                theme === 'light'
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-gray-950 border-gray-800'
              } border rounded-lg p-4 overflow-auto custom-scrollbar flex-1`}>
                {backup.sql_query ? (
                  <SyntaxHighlighter language="sql" style={customSQLStyle}>
                    {formatSQL(backup.sql_query)}
                  </SyntaxHighlighter>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <p className="text-gray-500 text-sm italic">
                      No SQL query available for this backup
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Backup Information */}
            <div className="flex-1 space-y-4">
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                <Activity className="w-5 h-5" />
                <h3>Backup Information</h3>
              </div>

              {/* Backup Name */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                  <Database className="w-4 h-4" />
                  Backup Name
                </div>
                <p className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-sm font-mono break-all`}>
                  {backup.name}
                </p>
              </div>

              {/* Error Message - Only for failed backups */}
              {backup.status === 'BACKUP_FAILED' && backup.error && (
                <div className={`${
                  theme === 'light'
                    ? 'bg-red-50/50 border-red-400/40'
                    : 'bg-red-950/30 border-red-500/30'
                } border-2 rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${
                    theme === 'light' ? 'text-red-700' : 'text-red-400'
                  } mb-2`}>
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-semibold">Error Details</h3>
                  </div>
                  <p className={`${
                    theme === 'light' ? 'text-red-800' : 'text-red-300'
                  } text-sm leading-relaxed break-words`}>
                    {backup.error}
                  </p>
                </div>
              )}

              {/* Base Backup & Query ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Base Backup
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                    {backup.base_backup_name}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Query ID
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm font-mono`}>
                    {backup.query_id}
                  </p>
                </div>
              </div>

              {/* Storage Information */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                  <HardDrive className="w-5 h-5" />
                  <h3>Storage Information</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Total Size
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatBytes(backup.total_size)}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Compressed
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatBytes(backup.compressed_size)}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Uncompressed
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatBytes(backup.uncompressed_size)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Clock className="w-4 h-4" />
                    Start Time
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs`}>{backup.start_time}</p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Clock className="w-4 h-4" />
                    End Time
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs`}>
                    {backup.end_time || '—'}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Clock className="w-4 h-4" />
                    Duration
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs`}>
                    {calculateDuration(backup.start_time, backup.end_time)}
                  </p>
                </div>
              </div>

              {/* Files Information */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                  <FileArchive className="w-5 h-5" />
                  <h3>Files Information</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Total Files
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {backup.num_files.toLocaleString()}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Files Read
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {backup.files_read.toLocaleString()}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Entries
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {backup.num_entries.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}