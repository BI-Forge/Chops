import React from 'react';
import { Database, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Copy } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { TablesListApiItem } from '../../services/tablesAPI';

export interface Table {
  database: string;
  name: string;
  uuid: string;
  engine: string;
  is_temporary: number;
  data_paths: string[];
  metadata_path: string;
  metadata_modification_time: string;
  metadata_version: number;
  dependencies_database: string[];
  dependencies_table: string[];
  create_table_query: string;
  engine_full: string;
  as_select: string;
  partition_key: string;
  sorting_key: string;
  primary_key: string;
  sampling_key: string;
  storage_policy: string;
  total_rows: number;
  total_bytes: number;
  total_bytes_uncompressed: number;
  parts: number;
  active_parts: number;
  total_marks: number;
  active_on_fly_data_mutations: number;
  active_on_fly_alter_mutations: number;
  active_on_fly_metadata_mutations: number;
  lifetime_rows: number | null;
  lifetime_bytes: number | null;
  comment: string;
  has_own_data: number;
  loading_dependencies_database: string[];
  loading_dependencies_table: string[];
  loading_dependent_database: string[];
  loading_dependent_table: string[];
}

export type TableListRow = TablesListApiItem;

export type TablesSortField = 'name' | 'engine' | 'total_rows' | 'total_bytes' | 'parts' | 'active_parts';

interface TablesListProps {
  tables: TableListRow[];
  onTableClick: (table: TableListRow) => void;
  onDeleteClick: (table: TableListRow) => void;
  onCopyClick: (table: TableListRow) => void;
  itemsPerPage: number;
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  sortField: TablesSortField | null;
  sortDirection: 'asc' | 'desc';
  onSortChange: (field: TablesSortField, direction: 'asc' | 'desc') => void;
  loading?: boolean;
}

export function TablesList({
  tables,
  onTableClick,
  onDeleteClick,
  onCopyClick,
  itemsPerPage,
  total,
  page,
  onPageChange,
  sortField,
  sortDirection,
  onSortChange,
  loading,
}: TablesListProps) {
  const { theme } = useTheme();

  const handleSort = (field: TablesSortField) => {
    if (sortField === field) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
    onPageChange(1);
  };

  const formatNumber = (num: number): string => num.toLocaleString();

  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const SortIcon = ({ field }: { field: TablesSortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const showPagination = total > 0 && totalPages > 1;
  const from = total === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const to = Math.min(page * itemsPerPage, total);

  return (
    <div
      className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Database className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Tables List</h2>
        <span
          className={`px-2 py-1 rounded-lg ${
            theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
          } text-xs`}
        >
          {total}
        </span>
      </div>

      {loading ? (
        <div className={`py-12 text-center text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          Loading tables…
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={`border-b ${
                    theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
                  }`}
                >
                  <th className="text-left py-3 px-4 text-sm font-medium">Database</th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Table Name</span>
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('engine')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Engine</span>
                      <SortIcon field="engine" />
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('total_rows')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Rows</span>
                      <SortIcon field="total_rows" />
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('total_bytes')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Size</span>
                      <SortIcon field="total_bytes" />
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('parts')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Parts</span>
                      <SortIcon field="parts" />
                    </div>
                  </th>
                  <th
                    className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                      theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
                    }`}
                    onClick={() => handleSort('active_parts')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Active Parts</span>
                      <SortIcon field="active_parts" />
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tables.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className={`py-8 text-center text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}
                    >
                      No tables match the current filters.
                    </td>
                  </tr>
                ) : (
                  tables.map((table) => (
                    <tr
                      key={table.uuid}
                      className={`border-b ${
                        theme === 'light' ? 'border-amber-500/20 hover:bg-amber-50/30' : 'border-yellow-500/10 hover:bg-gray-800/40'
                      } transition-colors cursor-pointer`}
                      onClick={() => onTableClick(table)}
                    >
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {table.database}
                      </td>
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {table.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                          <span className="text-xs text-blue-400">{table.engine}</span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {formatNumber(table.rows)}
                      </td>
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {table.bytes}
                      </td>
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {formatNumber(table.parts)}
                      </td>
                      <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                        {formatNumber(table.active_parts)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTableClick(table);
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              theme === 'light'
                                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700'
                                : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400'
                            }`}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyClick(table);
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              theme === 'light'
                                ? 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/40 hover:border-green-600 text-green-700'
                                : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-400'
                            }`}
                            title="Copy Table"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteClick(table);
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              theme === 'light'
                                ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 hover:border-red-600 text-red-700'
                                : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400'
                            }`}
                            title="Delete Table"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(showPagination || total > 0) && (
            <div
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t ${
                theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
              }`}
            >
              <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                Showing {from} to {to} of {total} tables
              </div>

              {showPagination && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePageChange(1)}
                    disabled={page === 1}
                    className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                      theme === 'light'
                        ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <ChevronsLeft className="w-4 h-4" />
                      <span>First</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
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
                      const pages: React.ReactNode[] = [];
                      const maxPagesToShow = 5;
                      let startPage = Math.max(1, page - 2);
                      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                      if (endPage - startPage < maxPagesToShow - 1) {
                        startPage = Math.max(1, endPage - maxPagesToShow + 1);
                      }

                      if (startPage > 1) {
                        pages.push(
                          <button
                            type="button"
                            key={1}
                            onClick={() => handlePageChange(1)}
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
                            onClick={() => handlePageChange(i)}
                            className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                              page === i
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
                            onClick={() => handlePageChange(totalPages)}
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
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
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
                    onClick={() => handlePageChange(totalPages)}
                    disabled={page === totalPages}
                    className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                      theme === 'light'
                        ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                        : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span>Last</span>
                      <ChevronsRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
