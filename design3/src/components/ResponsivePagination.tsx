import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ResponsivePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRecords?: number;
  recordsPerPage?: number;
}

export function ResponsivePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  recordsPerPage
}: ResponsivePaginationProps) {
  const { theme } = useTheme();

  const getPageNumbers = () => {
    const delta = 1; // Number of pages to show on each side of current page
    const range = [];
    const rangeWithDots = [];
    
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const pageNumbers = getPageNumbers();

  const startRecord = (currentPage - 1) * (recordsPerPage || 10) + 1;
  const endRecord = Math.min(currentPage * (recordsPerPage || 10), totalRecords || 0);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 ${
      theme === 'light' ? 'border-t border-amber-500/30' : 'border-t border-yellow-500/20'
    }`}>
      {/* Records Info */}
      {totalRecords && (
        <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} order-2 sm:order-1`}>
          Showing <span className="font-semibold">{startRecord}</span> to{' '}
          <span className="font-semibold">{endRecord}</span> of{' '}
          <span className="font-semibold">{totalRecords}</span> records
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 sm:gap-2 order-1 sm:order-2">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`hidden sm:flex items-center justify-center p-2 rounded-lg transition-all ${
            currentPage === 1
              ? theme === 'light'
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 cursor-not-allowed'
              : theme === 'light'
                ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600'
                : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-400'
          }`}
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center justify-center p-2 rounded-lg transition-all ${
            currentPage === 1
              ? theme === 'light'
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 cursor-not-allowed'
              : theme === 'light'
                ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600'
                : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-400'
          }`}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1 text-sm">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span
                  key={`dots-${index}`}
                  className={`px-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}
                >
                  ...
                </span>
              );
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(Number(pageNum))}
                className={`min-w-[36px] h-9 px-2 sm:px-3 rounded-lg text-sm transition-all ${
                  currentPage === pageNum
                    ? theme === 'light'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 shadow-md'
                    : theme === 'light'
                      ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-400'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center justify-center p-2 rounded-lg transition-all ${
            currentPage === totalPages
              ? theme === 'light'
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 cursor-not-allowed'
              : theme === 'light'
                ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600'
                : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-400'
          }`}
          title="Next page"
        >
          <span className="hidden sm:inline mr-1 text-sm">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`hidden sm:flex items-center justify-center p-2 rounded-lg transition-all ${
            currentPage === totalPages
              ? theme === 'light'
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 cursor-not-allowed'
              : theme === 'light'
                ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-600'
                : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-400'
          }`}
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
