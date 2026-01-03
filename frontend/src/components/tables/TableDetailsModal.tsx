import React, { useState, useEffect } from 'react';
import { Database, XCircle, HardDrive, Layers, Code, FolderOpen, Copy, Check, Trash2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Table } from './TablesList';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { format } from 'sql-formatter';

interface TableDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table | null;
  onDelete: (table: Table) => void;
  onCopy: (table: Table) => void;
}

export function TableDetailsModal({ isOpen, onClose, table, onDelete, onCopy }: TableDetailsModalProps) {
  const { theme } = useTheme();
  const [copiedQuery, setCopiedQuery] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatSQL = (sql: string): string => {
    try {
      return format(sql, { language: 'sql' });
    } catch (error) {
      return sql;
    }
  };

  const handleCopyQuery = () => {
    if (table?.create_table_query) {
      const formattedSQL = formatSQL(table.create_table_query);
      // Safe copy method with fallback
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(formattedSQL).then(() => {
            setCopiedQuery(true);
            setTimeout(() => setCopiedQuery(false), 2000);
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
      setCopiedQuery(true);
      setTimeout(() => setCopiedQuery(false), 2000);
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

  if (!isOpen || !table) return null;

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
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${
              theme === 'light'
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-amber-500 to-yellow-600'
            } flex items-center justify-center`}>
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Table Details</h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs mt-0.5`}>
                {table.database}.{table.name}
              </p>
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
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - CREATE TABLE Query */}
            <div className={`flex-1 ${
              theme === 'light'
                ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-400/40'
                : 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/40'
            } border-2 rounded-xl p-5 shadow-lg flex flex-col`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
                  <Code className="w-5 h-5" />
                  <h3 className="font-semibold">CREATE TABLE Query</h3>
                </div>
                <button
                  onClick={handleCopyQuery}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    theme === 'light'
                      ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30 text-gray-700 hover:text-amber-700'
                      : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
                  } border transition-all duration-200 text-sm`}
                  title="Copy to clipboard"
                >
                  {copiedQuery ? (
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
              </div>
              <div className={`${
                theme === 'light'
                  ? 'bg-gray-900 border-gray-700'
                  : 'bg-gray-950 border-gray-800'
              } border rounded-lg p-4 overflow-auto custom-scrollbar flex-1`}>
                <SyntaxHighlighter language="sql" style={customSQLStyle}>
                  {formatSQL(table.create_table_query)}
                </SyntaxHighlighter>
              </div>
            </div>

            {/* Right Column - Table Information */}
            <div className="flex-1 space-y-4">
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                <Database className="w-5 h-5" />
                <h3>Table Information</h3>
              </div>

              {/* Table Name */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                  <Database className="w-4 h-4" />
                  Table Name
                </div>
                <p className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-sm font-mono break-all`}>
                  {`${table.database}.${table.name}`}
                </p>
              </div>

              {/* UUID & Engine */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    UUID
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs font-mono`}>
                    {table.uuid}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Engine
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${
                    theme === 'light'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {table.engine}
                  </span>
                </div>
              </div>

              {/* Statistics */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                  <Layers className="w-5 h-5" />
                  <h3>Statistics</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Total Rows
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatNumber(table.total_rows)}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Total Size
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatBytes(table.total_bytes)}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Uncompressed
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                      {formatBytes(table.total_bytes_uncompressed)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Parts Information */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Parts
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                    {formatNumber(table.parts)}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Active Parts
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                    {formatNumber(table.active_parts)}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Total Marks
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-medium`}>
                    {formatNumber(table.total_marks)}
                  </p>
                </div>
              </div>

              {/* Storage & Metadata */}
              <div>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                  <HardDrive className="w-5 h-5" />
                  <h3>Storage & Metadata</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Storage Policy
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                      {table.storage_policy}
                    </p>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      Last Modified
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs`}>
                      {table.metadata_modification_time}
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Keys */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Partition Key
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs font-mono`}>
                    {table.partition_key || 'None'}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Sorting Key
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs font-mono`}>
                    {table.sorting_key || 'None'}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Primary Key
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs font-mono`}>
                    {table.primary_key || 'None'}
                  </p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Sampling Key
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-xs font-mono`}>
                    {table.sampling_key || 'None'}
                  </p>
                </div>
              </div>

              {/* Data Paths */}
              {table.data_paths.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                    <FolderOpen className="w-5 h-5" />
                    <h3>Data Paths ({table.data_paths.length})</h3>
                  </div>
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar`}>
                    {table.data_paths.map((path, index) => (
                      <div
                        key={index}
                        className={`${
                          theme === 'light' ? 'bg-white' : 'bg-gray-900/50'
                        } rounded-lg p-3 font-mono text-xs ${
                          theme === 'light' ? 'text-gray-800' : 'text-gray-300'
                        } break-all`}
                      >
                        {path}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comment */}
              {table.comment && (
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    Comment
                  </div>
                  <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                    {table.comment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <button
            onClick={() => {
              onDelete(table);
              onClose();
            }}
            className={`px-6 py-2.5 rounded-lg border ${
              theme === 'light'
                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 hover:border-red-600 text-red-700 hover:text-red-800'
                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300'
            } transition-all duration-200 flex items-center gap-2 font-medium`}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => {
              onCopy(table);
              onClose();
            }}
            className={`px-6 py-2.5 rounded-lg border ${
              theme === 'light'
                ? 'bg-white hover:bg-gray-50 border-gray-300 hover:border-amber-500/40 text-gray-700 hover:text-amber-700'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700 hover:border-yellow-500/30 text-gray-300 hover:text-yellow-400'
            } transition-all duration-200 flex items-center gap-2 font-medium`}
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}