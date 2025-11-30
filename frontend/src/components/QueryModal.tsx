import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, User, Database, Server, Activity, CheckCircle, XCircle, AlertCircle, Zap, HardDrive, Cpu, Copy, Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface QueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: {
    id: string;
    query: string;
    user: string;
    database: string;
    status: 'running' | 'completed' | 'failed';
    startTime: string;
    duration: string;
    rowsRead: string;
    bytesRead: string;
    memoryUsage: string;
    cpuUsage: string;
    queryType: string;
  } | null;
}

export function QueryModal({ isOpen, onClose, query }: QueryModalProps) {
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

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

  if (!isOpen || !query) return null;

  const handleCopyQuery = () => {
    // Safe copy method with fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(query.query).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
          fallbackCopyTextToClipboard();
        });
      } else {
        fallbackCopyTextToClipboard();
      }
    } catch (err) {
      fallbackCopyTextToClipboard();
    }
  };

  const fallbackCopyTextToClipboard = () => {
    const textArea = document.createElement('textarea');
    textArea.value = query.query;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
    }
  };

  const statusConfig = getStatusConfig(query.status);
  const StatusIcon = statusConfig.icon;

  // Format SQL query with syntax highlighting
  const formatSQL = (sql: string) => {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR', 'AS', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'HAVING', 'DISTINCT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE'];
    
    const keywordClass = theme === 'light' ? 'text-amber-700 font-semibold' : 'text-yellow-400 font-semibold';
    
    let formatted = sql;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `<span class="${keywordClass}">${keyword}</span>`);
    });
    
    return formatted;
  };

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm modal-overlay`}
      onClick={onClose}
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div 
        className={`bg-gradient-to-br ${
          theme === 'light'
            ? 'from-white/95 to-gray-50/95 border-amber-500/30'
            : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden modal-content`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
            </div>
            <div>
              <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Query Details</h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs mt-0.5`}>Query ID: {query.id}</p>
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
            <X className={`w-5 h-5 ${
              theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
            }`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - SQL Query */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
                  <Database className="w-5 h-5" />
                  <h3>SQL Query</h3>
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
                  {copied ? (
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
                  ? 'bg-gray-50 border-amber-500/30'
                  : 'bg-gray-950/50 border-yellow-500/20'
              } border rounded-xl p-4 max-h-[400px] overflow-y-auto custom-scrollbar`}>
                <pre className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-gray-300'} font-mono leading-relaxed whitespace-pre-wrap break-words`}>
                  <code dangerouslySetInnerHTML={{ __html: formatSQL(query.query) }} />
                </pre>
              </div>

              {/* Query Type Badge */}
              <div className="flex items-center gap-2">
                <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Query Type:</span>
                <span className={`px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border ${
                  theme === 'light' ? 'border-amber-500/40 text-amber-700' : 'border-yellow-500/30 text-yellow-400'
                } text-sm`}>
                  {query.queryType}
                </span>
              </div>
            </div>

            {/* Right Column - Query Info */}
            <div className="space-y-4">
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-3`}>
                <Activity className="w-5 h-5" />
                <h3>Query Information</h3>
              </div>

              {/* Status */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Status</span>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${statusConfig.bg} border ${statusConfig.border}`}>
                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                    <span className={`text-sm capitalize ${statusConfig.color}`}>{query.status}</span>
                  </div>
                </div>
              </div>

              {/* User & Database */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <User className="w-4 h-4" />
                    User
                  </div>
                  <p className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>{query.user}</p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Database className="w-4 h-4" />
                    Database
                  </div>
                  <p className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>{query.database}</p>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Clock className="w-4 h-4" />
                    Start Time
                  </div>
                  <p className={theme === 'light' ? 'text-gray-800' : 'text-white'}>{query.startTime}</p>
                </div>
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Zap className="w-4 h-4" />
                    Duration
                  </div>
                  <p className={theme === 'light' ? 'text-gray-800' : 'text-white'}>{query.duration}</p>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className={`bg-gradient-to-br ${
                theme === 'light'
                  ? 'from-amber-50/50 to-orange-50/50 border-amber-500/30'
                  : 'from-gray-800/40 to-gray-900/40 border-yellow-500/20'
              } border rounded-xl p-4`}>
                <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Performance Metrics</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Rows Read</span>
                    <span className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-mono`}>{query.rowsRead}</span>
                  </div>
                  <div className={`h-px ${theme === 'light' ? 'bg-gray-300/50' : 'bg-gray-700/50'}`} />
                  <div className="flex items-center justify-between">
                    <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Bytes Read</span>
                    <span className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} font-mono`}>{query.bytesRead}</span>
                  </div>
                  <div className={`h-px ${theme === 'light' ? 'bg-gray-300/50' : 'bg-gray-700/50'}`} />
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                      <HardDrive className="w-4 h-4" />
                      Memory Usage
                    </div>
                    <span className={`${theme === 'light' ? 'text-amber-700' : 'text-amber-400'} font-mono`}>{query.memoryUsage}</span>
                  </div>
                  <div className={`h-px ${theme === 'light' ? 'bg-gray-300/50' : 'bg-gray-700/50'}`} />
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                      <Cpu className="w-4 h-4" />
                      CPU Usage
                    </div>
                    <span className={`${theme === 'light' ? 'text-orange-700' : 'text-orange-400'} font-mono`}>{query.cpuUsage}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </div>,
    document.body
  );
}
