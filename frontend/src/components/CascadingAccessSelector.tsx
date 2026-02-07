import { Database, Plus, X, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { CascadingAutocompleteSelect } from './CascadingAutocompleteSelect';

export interface AccessScopeRow {
  id: string;
  database: string;
  table: string;
  column: string;
}

interface CascadingAccessSelectorProps {
  rows: AccessScopeRow[];
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, field: 'database' | 'table' | 'column', value: string) => void;
  databaseStructure: Record<string, Record<string, string[]>>;
}

export function CascadingAccessSelector({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  databaseStructure
}: CascadingAccessSelectorProps) {
  const { theme } = useTheme();

  const getAvailableDatabases = () => {
    return ['All', ...Object.keys(databaseStructure)];
  };

  const getAvailableTables = (database: string) => {
    if (!database || database === 'All' || !databaseStructure[database]) {
      return ['All'];
    }
    return ['All', ...Object.keys(databaseStructure[database])];
  };

  const getAvailableColumns = (database: string, table: string) => {
    if (!database || database === 'All' || !table || table === 'All' || !databaseStructure[database] || !databaseStructure[database][table]) {
      return ['All'];
    }
    return ['All', ...databaseStructure[database][table]];
  };

  return (
    <div className={`${
      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
    } border rounded-xl p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} flex items-center gap-2`}>
          <Database className="w-4 h-4" />
          <span>Define access paths (Database → Table → Column)</span>
        </div>
        <button
          onClick={onAddRow}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            theme === 'light'
              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
              : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 border-yellow-600'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Row
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No access paths defined</p>
            <p className="text-xs mt-1">Click "Add Row" to define access scope</p>
          </div>
        ) : (
          rows.map((row, index) => {
            const availableTables = getAvailableTables(row.database);
            const availableColumns = getAvailableColumns(row.database, row.table);

            return (
              <div
                key={row.id}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  theme === 'light'
                    ? 'bg-white border-gray-300/50'
                    : 'bg-gray-900/30 border-gray-700/50'
                }`}
              >
                {/* Row Number */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  theme === 'light' ? 'bg-amber-200 text-amber-800' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {index + 1}
                </div>

                {/* Database Select */}
                <div className="flex-1 min-w-0">
                  <CascadingAutocompleteSelect
                    value={row.database}
                    onChange={(value) => {
                      console.log('Database onChange triggered with value:', value, 'for row:', row.id);
                      // Reset table and column when database changes
                      if (value !== row.database) {
                        onUpdateRow(row.id, 'database', value);
                        onUpdateRow(row.id, 'table', '');
                        onUpdateRow(row.id, 'column', '');
                      } else {
                        onUpdateRow(row.id, 'database', value);
                      }
                    }}
                    options={getAvailableDatabases()}
                    placeholder="Select Database"
                  />
                </div>

                {/* Arrow */}
                <ChevronRight className={`flex-shrink-0 w-4 h-4 ${
                  theme === 'light' ? 'text-gray-400' : 'text-gray-600'
                }`} />

                {/* Table Select */}
                <div className="flex-1 min-w-0">
                  <CascadingAutocompleteSelect
                    value={row.table}
                    onChange={(value) => {
                      onUpdateRow(row.id, 'table', value);
                      // Reset column when table changes
                      onUpdateRow(row.id, 'column', '');
                    }}
                    options={availableTables}
                    placeholder="Select Table"
                    disabled={!row.database}
                  />
                </div>

                {/* Arrow */}
                <ChevronRight className={`flex-shrink-0 w-4 h-4 ${
                  theme === 'light' ? 'text-gray-400' : 'text-gray-600'
                }`} />

                {/* Column Select */}
                <div className="flex-1 min-w-0">
                  <CascadingAutocompleteSelect
                    value={row.column}
                    onChange={(value) => onUpdateRow(row.id, 'column', value)}
                    options={availableColumns}
                    placeholder="Select Column"
                    disabled={!row.table}
                  />
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => onRemoveRow(row.id)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    theme === 'light'
                      ? 'hover:bg-red-100 text-red-600'
                      : 'hover:bg-red-500/20 text-red-400'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {rows.length > 0 && (
        <div className={`pt-3 mt-3 border-t ${
          theme === 'light' ? 'border-gray-300/50' : 'border-gray-700/50'
        }`}>
          <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mb-2`}>
            Access Summary: {rows.length} {rows.length === 1 ? 'path' : 'paths'} defined
          </div>
          <div className="space-y-1">
            {rows.map((row, index) => {
              const isComplete = row.database && row.table && row.column;
              return (
                <div
                  key={row.id}
                  className={`font-mono text-xs p-2 rounded-lg flex items-center gap-2 ${
                    theme === 'light'
                      ? 'bg-white border border-gray-300'
                      : 'bg-gray-900/50 border border-gray-700'
                  }`}
                >
                  <span className={`${
                    isComplete
                      ? theme === 'light' ? 'text-green-600' : 'text-green-400'
                      : theme === 'light' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {index + 1}.
                  </span>
                  <Database className="w-3 h-3 inline" />
                  <span className={theme === 'light' ? 'text-gray-800' : 'text-white'}>
                    {row.database || '(empty)'}
                  </span>
                  {row.table && (
                    <>
                      <span className={theme === 'light' ? 'text-gray-400' : 'text-gray-600'}>/</span>
                      <span className={theme === 'light' ? 'text-gray-800' : 'text-white'}>
                        {row.table}
                      </span>
                    </>
                  )}
                  {row.column && (
                    <>
                      <span className={theme === 'light' ? 'text-gray-400' : 'text-gray-600'}>/</span>
                      <span className={theme === 'light' ? 'text-gray-800' : 'text-white'}>
                        {row.column}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}