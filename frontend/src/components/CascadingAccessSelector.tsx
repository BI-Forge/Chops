import { Database, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AccessScopeRowEditor } from './AccessScopeRowEditor';

export interface AccessScopeRow {
  id: string;
  database: string;
  table: string;
  column: string;
  permissions: string[];
}

interface CascadingAccessSelectorProps {
  rows: AccessScopeRow[];
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, field: 'database' | 'table' | 'column', value: string) => void;
  onAddPermission: (id: string, permission: string) => void;
  onRemovePermission: (id: string, permission: string) => void;
  databaseStructure: Record<string, Record<string, string[]>>;
  availablePermissions: string[];
}

export function CascadingAccessSelector({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onAddPermission,
  onRemovePermission,
  databaseStructure,
  availablePermissions,
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

  const handleUpdateField = (id: string, field: 'database' | 'table' | 'column', value: string) => {
    // Update the field first
    onUpdateRow(id, field, value);

    // Reset dependent fields using setTimeout to allow React to process the update first
    if (field === 'database') {
      setTimeout(() => {
        onUpdateRow(id, 'table', '');
        onUpdateRow(id, 'column', '');
      }, 10);
    } else if (field === 'table') {
      setTimeout(() => {
        onUpdateRow(id, 'column', '');
      }, 10);
    }
  };

  return (
    <div className={`${
      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
    } border rounded-xl p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} flex items-center gap-2`}>
          <Database className="w-4 h-4" />
          <span>Define access paths with permissions (Database → Table → Column + Permissions)</span>
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
          Add Access Path
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className={`text-center py-8 ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No access paths defined</p>
            <p className="text-xs mt-1">Click "Add Access Path" to define scope and permissions</p>
          </div>
        ) : (
          rows.map((row, index) => {
            const availableTables = getAvailableTables(row.database);
            const availableColumns = getAvailableColumns(row.database, row.table);

            return (
              <AccessScopeRowEditor
                key={row.id}
                id={row.id}
                database={row.database}
                table={row.table}
                column={row.column}
                permissions={row.permissions || []}
                index={index}
                databaseOptions={getAvailableDatabases()}
                tableOptions={availableTables}
                columnOptions={availableColumns}
                availablePermissions={availablePermissions}
                onUpdateField={handleUpdateField}
                onAddPermission={onAddPermission}
                onRemovePermission={onRemovePermission}
                onRemoveRow={onRemoveRow}
              />
            );
          })
        )}
      </div>
    </div>
  );
}