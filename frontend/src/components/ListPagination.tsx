import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export type ListPaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  /** 1-based index of first item on this page */
  rangeStart: number;
  /** 1-based index of last item on this page */
  rangeEnd: number;
  /** Noun for the summary line, e.g. "queries", "users" */
  itemLabel: string;
  onPageChange: (page: number) => void;
};

/** Shared list footer pagination (matches Query History styling). */
export function ListPagination({
  currentPage,
  totalPages,
  totalCount,
  rangeStart,
  rangeEnd,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  const { theme } = useTheme();

  if (totalCount <= 0) {
    return null;
  }

  return (
    <div
      className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-6 pt-6 border-t ${
        theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
      }`}
    >
      <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
        Showing {rangeStart} to {Math.min(rangeEnd, totalCount)} of {totalCount} {itemLabel}
      </div>

      <div className="flex items-center gap-2 flex-wrap sm:justify-end">
        <button
          type="button"
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

        <button
          type="button"
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

        <div className="flex items-center gap-1 flex-wrap">
          {(() => {
            const pages: ReactNode[] = [];
            const maxPagesToShow = 5;
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

            if (endPage - startPage < maxPagesToShow - 1) {
              startPage = Math.max(1, endPage - maxPagesToShow + 1);
            }

            if (startPage > 1) {
              pages.push(
                <button
                  type="button"
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

            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button
                  type="button"
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
                  type="button"
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

        <button
          type="button"
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

        <button
          type="button"
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
  );
}
