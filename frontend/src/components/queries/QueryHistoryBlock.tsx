import React from 'react';
import { Database, CheckCircle, Activity, XCircle, AlertCircle, User, Clock, TrendingUp, Eye, Copy, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Cpu, HardDrive, X } from 'lucide-react';
import { CustomCheckbox } from '../CustomCheckbox';
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

interface QueryHistoryBlockProps {
    queries: Query[];
    selectedQueries: Set<string>;
    onSelectQuery: (queryId: string) => void;
    onAcceptSelected: () => void;
    onClearSelection?: () => void;
    onQueryClick: (query: Query) => void;
    onCopyQuery: (query: string, queryId: string, e: React.MouseEvent) => void;
    copiedQueryId: string | null;
    currentPage: number;
    totalPages: number;
    totalCount: number;
    offset: number;
    onPageChange: (page: number) => void;
}

export function QueryHistoryBlock({
                                      queries,
                                      selectedQueries,
                                      onSelectQuery,
                                      onAcceptSelected,
                                      onClearSelection,
                                      onQueryClick,
                                      onCopyQuery,
                                      copiedQueryId,
                                      currentPage,
                                      totalPages,
                                      totalCount,
                                      offset,
                                      onPageChange
                                  }: QueryHistoryBlockProps) {
    const { theme } = useTheme();

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

    return (
        <div className={`${
            theme === 'light'
                ? 'bg-white/80 border-amber-500/30'
                : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Database className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                    <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Query History</h2>
                </div>

                {selectedQueries.size > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onAcceptSelected}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900 transition-all duration-200 shadow-lg shadow-yellow-500/20"
                        >
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Accept selected ({selectedQueries.size})</span>
                        </button>
                        {onClearSelection && (
                            <button
                                onClick={onClearSelection}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                                    theme === 'light'
                                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                }`}
                                title="Clear selection"
                            >
                                <X className="w-4 h-4" />
                                <span className="text-sm">Clear</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {queries.map((query) => {
                    const statusConfig = getStatusConfig(query.status);
                    const StatusIcon = statusConfig.icon;
                    const isSelected = selectedQueries.has(query.id);

                    return (
                        <div
                            key={query.id}
                            className={`${
                                theme === 'light'
                                    ? 'bg-white/60'
                                    : 'bg-gray-800/40'
                            } border ${
                                isSelected
                                    ? (theme === 'light' ? 'border-amber-500/50 bg-amber-50/30' : 'border-yellow-500/30 bg-yellow-500/5')
                                    : (theme === 'light' ? 'border-gray-300/50' : 'border-gray-700/50')
                            } rounded-lg p-4 ${
                                theme === 'light' ? 'hover:border-amber-500/50' : 'hover:border-yellow-500/30'
                            } transition-all duration-200 group`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Checkbox */}
                                <div className="pt-1">
                                    <CustomCheckbox
                                        checked={isSelected}
                                        onChange={() => onSelectQuery(query.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>

                                {/* Query Content */}
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onQueryClick(query)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${statusConfig.bg} border ${statusConfig.border}`}>
                                            <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                                            <span className={`text-xs capitalize ${statusConfig.color}`}>{query.status}</span>
                                        </div>
                                        <span className={`font-mono text-sm ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>{query.id}</span>
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
                      Start: {query.startTime}
                    </span>
                                        <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      End: {query.endTime || ''}
                    </span>
                                        <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Duration: {query.duration}
                    </span>
                                        <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      CPU: {query.cpuUsage}
                    </span>
                                        <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      Memory: {query.memoryUsage}
                    </span>
                                        <span>{query.rowsRead} rows</span>
                                        <span>{query.bytesRead}</span>
                                    </div>
                                </div>

                                {/* Eye Icon */}
                                <Eye
                                    className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'} transition-colors flex-shrink-0 cursor-pointer pt-1`}
                                    onClick={() => onQueryClick(query)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
                theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
            }`}>
                <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                    Showing {offset + 1} to {Math.min(offset + queries.length, totalCount)} of {totalCount} queries
                </div>

                <div className="flex items-center gap-2">
                    {/* First Page Button */}
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                            theme === 'light'
                                ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600 text-gray-700 hover:text-amber-700'
                                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
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
                                ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600 text-gray-700 hover:text-amber-700'
                                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
                        }`}
                    >
                        <div className="flex items-center gap-1">
                            <span>Last</span>
                            <ChevronsRight className="w-4 h-4" />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}

