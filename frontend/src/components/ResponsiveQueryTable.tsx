import React, { useState } from 'react';
import { Activity, XCircle, CheckCircle, Copy, Check, Eye, User, Database, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Query {
  id: string;
  query: string;
  user: string;
  database: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  duration: string;
  rowsRead: string;
  bytesRead: string;
  memoryUsage?: string;
  cpuUsage?: string;
  queryType?: string;
}

interface ResponsiveQueryTableProps {
  queries: Query[];
  onQueryClick: (query: Query) => void;
}

export function ResponsiveQueryTable({ queries, onQueryClick }: ResponsiveQueryTableProps) {
  const { theme } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(query);
    setCopiedId(query);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return theme === 'light' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'completed':
        return theme === 'light' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return theme === 'light' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {queries.map((query) => (
          <div
            key={query.id}
            onClick={() => onQueryClick(query)}
            className={`${
              theme === 'light' ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50' : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/40'
            } backdrop-blur-md border rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all duration-300 active:scale-[0.98]`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(query.status)}
                <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-sm font-mono truncate`}>
                  {query.id}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(query.status)} flex-shrink-0 ml-2`}>
                {query.status}
              </span>
            </div>

            {/* SQL Query */}
            <div className={`${
              theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/60 border-gray-700'
            } border rounded-lg p-2 mb-3 relative group`}>
              <code className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-xs font-mono block truncate pr-8`}>
                {query.query}
              </code>
              <button
                onClick={(e) => handleCopy(e, query.query)}
                className={`absolute top-2 right-2 p-1 rounded ${
                  theme === 'light' ? 'bg-white text-gray-700 hover:text-amber-600' : 'bg-gray-900 text-gray-400 hover:text-yellow-400'
                } opacity-0 group-hover:opacity-100 transition-all`}
              >
                {copiedId === query.query ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-1.5">
                <User className={`w-3 h-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>{query.user}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Database className={`w-3 h-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>{query.database}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3 h-3 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>{query.duration}</span>
              </div>
              <div className={`flex items-center gap-1.5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>Rows:</span>
                <span>{query.rowsRead}</span>
              </div>
            </div>

            {/* Footer */}
            <div className={`pt-2 border-t ${theme === 'light' ? 'border-gray-200 text-gray-600' : 'border-gray-800 text-gray-500'} text-xs`}>
              {query.startTime}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto custom-scrollbar">
        <table className="w-full">
          <thead>
            <tr className={`${theme === 'light' ? 'border-b border-amber-500/30' : 'border-b border-yellow-500/20'}`}>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>Status</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>Query ID</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>SQL Query</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>User</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>Duration</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>Rows</th>
              <th className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-left p-3 text-sm`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((query) => (
              <tr
                key={query.id}
                className={`${
                  theme === 'light' ? 'border-b border-gray-200 hover:bg-amber-50/50' : 'border-b border-gray-800/50 hover:bg-gray-800/30'
                } transition-colors group cursor-pointer`}
                onClick={() => onQueryClick(query)}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(query.status)}
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusColor(query.status)}`}>
                      {query.status}
                    </span>
                  </div>
                </td>
                <td className={`p-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-sm font-mono`}>
                  {query.id}
                </td>
                <td className="p-3 max-w-xs">
                  <div className="flex items-center gap-2 group/query">
                    <code className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-xs font-mono truncate block flex-1`}>
                      {query.query}
                    </code>
                    <button
                      onClick={(e) => handleCopy(e, query.query)}
                      className={`p-1 rounded opacity-0 group-hover/query:opacity-100 transition-all ${
                        theme === 'light' ? 'text-gray-700 hover:text-amber-600 hover:bg-amber-50' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
                      }`}
                    >
                      {copiedId === query.query ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
                <td className={`p-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-sm`}>
                  {query.user}
                </td>
                <td className={`p-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-sm font-mono`}>
                  {query.duration}
                </td>
                <td className={`p-3 ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-sm font-mono`}>
                  {query.rowsRead}
                </td>
                <td className="p-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQueryClick(query);
                    }}
                    className={`p-2 rounded-lg ${
                      theme === 'light' ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600' : 'text-gray-400 hover:bg-gray-800 hover:text-yellow-400'
                    } transition-all`}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
