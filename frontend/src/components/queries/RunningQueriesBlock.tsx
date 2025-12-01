import React, { useState } from 'react';
import { Activity, User, Database, Clock, Eye, Square, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Query {
    id: string;
    query: string;
    user: string;
    database: string;
    status: 'running' | 'completed' | 'failed';
    startTime: string;
    endTime?: string;
    duration: string;
    rowsRead: string;
    bytesRead: string;
    memoryUsage: string;
    cpuUsage: string;
    queryType: string;
    errorMessage?: string;
    settings?: {
        [key: string]: string | undefined;
    };
}

interface RunningQueriesBlockProps {
    queries: Query[];
    onQueryClick: (query: Query) => void;
    onStopQuery: (queryId: string) => void;
    onCopyQuery: (query: string, queryId: string, e: React.MouseEvent) => void;
    copiedQueryId: string | null;
    loading?: boolean;
}

export function RunningQueriesBlock({
                                        queries,
                                        onQueryClick,
                                        onStopQuery,
                                        onCopyQuery,
                                        copiedQueryId,
                                        loading = false
                                    }: RunningQueriesBlockProps) {
    const { theme } = useTheme();
    const [isExpanded, setIsExpanded] = useState(false);

    if (loading) {
        return (
            <div className={`${
                theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
            } backdrop-blur-md rounded-xl border p-6`}>
                <div className="flex items-center justify-center py-8">
                    <div className="text-gray-400">Loading running queries...</div>
                </div>
            </div>
        );
    }

    if (queries.length === 0) {
        return null;
    }

    // Calculate height for 3 items (each item is approx 100px)
    const collapsedHeight = '330px'; // Height for 3 items + some padding

    return (
        <div className={`${
            theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
                    <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Currently Running Queries</h2>
                    <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">{queries.length}</span>
                </div>

                {/* Expand/Collapse Button - only show if more than 3 queries */}
                {queries.length > 3 && (
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
                                <span>Expand ({queries.length - 3} more)</span>
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
                    maxHeight: !isExpanded && queries.length > 3 ? collapsedHeight : undefined
                }}
            >
                {queries.map((query) => (
                    <div
                        key={query.id}
                        onClick={() => onQueryClick(query)}
                        className={`${
                            theme === 'light' ? 'bg-blue-50/50 border-blue-500/40 hover:border-blue-500/60' : 'bg-gray-800/40 border-blue-500/30 hover:border-blue-500/50'
                        } border rounded-lg p-4 transition-all duration-200 group cursor-pointer`}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                                        <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                                        <span className="text-xs capitalize text-blue-400">running</span>
                                    </div>
                                    <span className="text-blue-400 font-mono text-sm">{query.id}</span>
                                </div>
                                <div className="flex items-start gap-2 mb-2">
                                    <p className={`${
                                        theme === 'light'
                                            ? 'text-gray-800 group-hover:text-amber-700'
                                            : 'text-white group-hover:text-yellow-400'
                                    } text-sm font-mono truncate transition-colors flex-1`}>{query.query}</p>
                                    <button
                                        onClick={(e) => onCopyQuery(query.query, query.id, e)}
                                        className={`p-1 rounded ${
                                            theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-gray-700/50'
                                        } transition-colors flex-shrink-0`}
                                        title="Copy query"
                                    >
                                        {copiedQueryId === query.id ? (
                                            <Check className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className={`w-4 h-4 ${
                                                theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-500 hover:text-yellow-400'
                                            }`} />
                                        )}
                                    </button>
                                </div>
                                <div className={`flex items-center gap-4 text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                      {query.user}
                  </span>
                                    <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                                        {query.database}
                  </span>
                                    <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                                        {query.startTime}
                  </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Eye className={`w-5 h-5 ${
                                    theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'
                                } transition-colors flex-shrink-0`} />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onStopQuery(query.id);
                                    }}
                                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 group"
                                    title="Stop Query"
                                >
                                    <Square className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

