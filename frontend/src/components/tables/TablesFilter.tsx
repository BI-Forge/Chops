import React from 'react';
import { Search, Filter, Check, Play } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import { AutocompleteSelect } from '../AutocompleteSelect';
import { useTheme } from '../../contexts/ThemeContext';

interface TablesFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedDatabase: string;
  onDatabaseChange: (value: string) => void;
  selectedEngine: string;
  onEngineChange: (value: string) => void;
  databases: string[];
  engines: string[];
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onApplyFilters: () => void;
  isApplyingFilters: boolean;
}

export function TablesFilter({
  searchTerm,
  onSearchChange,
  selectedDatabase,
  onDatabaseChange,
  selectedEngine,
  onEngineChange,
  databases,
  engines,
  itemsPerPage,
  onItemsPerPageChange,
  onApplyFilters,
  isApplyingFilters,
}: TablesFilterProps) {
  const { theme } = useTheme();

  // Prepare options for CustomSelect
  const databaseOptions = ['All Databases', ...databases];
  const engineOptions = ['All Engines', ...engines];
  const itemsPerPageOptions = ['10', '20', '50', '100'];

  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border p-6`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Filter className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
        </div>
        
        {/* Apply Button */}
        <button
          onClick={onApplyFilters}
          disabled={isApplyingFilters}
          className={`px-4 py-2 rounded-lg text-sm ${
            theme === 'light'
              ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
              : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
          } transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}>
          {isApplyingFilters ? (
            <Play className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          <span>Apply</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        <div>
          <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
            Search Table
          </label>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search by table name..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full ${
                theme === 'light'
                  ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                  : 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 focus:border-yellow-500/50'
              } border rounded-lg pl-10 pr-4 py-2.5 focus:outline-none transition-colors`}
            />
          </div>
        </div>

        {/* Database Filter */}
        <div>
          <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
            Database
          </label>
          <AutocompleteSelect
            value={selectedDatabase}
            onChange={onDatabaseChange}
            options={databases}
            placeholder="Search database..."
            allOptionLabel="All Databases"
          />
        </div>

        {/* Engine Filter */}
        <div>
          <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
            Engine
          </label>
          <CustomSelect
            value={selectedEngine}
            onChange={onEngineChange}
            options={engineOptions}
          />
        </div>

        {/* Items Per Page Filter */}
        <div>
          <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
            Items Per Page
          </label>
          <CustomSelect
            value={String(itemsPerPage)}
            onChange={(value) => onItemsPerPageChange(Number(value))}
            options={itemsPerPageOptions}
          />
        </div>
      </div>
    </div>
  );
}
