import React, { useState, useEffect } from 'react';
import { Database, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Copy } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

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

interface TablesListProps {
  tables: Table[];
  onTableClick: (table: Table) => void;
  onDeleteClick: (table: Table) => void;
  onCopyClick: (table: Table) => void;
  itemsPerPage: number;
}

export function TablesList({ tables, onTableClick, onDeleteClick, onCopyClick, itemsPerPage }: TablesListProps) {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'name' | 'engine' | 'total_rows' | 'total_bytes' | 'parts' | 'active_parts' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Reset current page when itemsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  const handleSort = (field: 'name' | 'engine' | 'total_rows' | 'total_bytes' | 'parts' | 'active_parts') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortedTables = () => {
    if (!sortField) return tables;

    const sorted = [...tables].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'engine':
          aValue = a.engine.toLowerCase();
          bValue = b.engine.toLowerCase();
          break;
        case 'total_rows':
          aValue = a.total_rows;
          bValue = b.total_rows;
          break;
        case 'total_bytes':
          aValue = a.total_bytes;
          bValue = b.total_bytes;
          break;
        case 'parts':
          aValue = a.parts;
          bValue = b.parts;
          break;
        case 'active_parts':
          aValue = a.active_parts;
          bValue = b.active_parts;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedTables = getSortedTables();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const totalPages = Math.ceil(sortedTables.length / itemsPerPage);
  const currentItems = sortedTables.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const SortIcon = ({ field }: { field: 'name' | 'engine' | 'total_rows' | 'total_bytes' | 'parts' | 'active_parts' }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5" />
      : <ArrowDown className="w-3.5 h-3.5" />;
  };

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Database className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
        <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Tables List</h2>
        <span className={`px-2 py-1 rounded-lg ${
          theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
        } text-xs`}>
          {tables.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
            }`}>
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
            {currentItems.map((table) => (
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
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30`}>
                    <span className="text-xs text-blue-400">
                      {table.engine}
                    </span>
                  </div>
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {formatNumber(table.total_rows)}
                </td>
                <td className={`py-3 px-4 text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                  {formatBytes(table.total_bytes)}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
          theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
        }`}>
          <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, tables.length)} of {tables.length} tables
          </div>
          
          <div className="flex items-center gap-2">
            {/* First Page Button */}
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
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

            {/* Previous Page Button */}
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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

                // Show page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => handlePageChange(i)}
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

            {/* Next Page Button */}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
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
        </div>
      )}
    </div>
  );
}