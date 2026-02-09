import React, { useState } from 'react';
import { Database, ChevronRight, X, Shield, XCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { CascadingAutocompleteSelect } from './CascadingAutocompleteSelect';
import { AutocompleteInputFlex } from './AutocompleteInputFlex';

interface AccessScopeRowEditorProps {
  id: string;
  database: string;
  table: string;
  column: string;
  permissions: string[];
  index: number;
  databaseOptions: string[];
  tableOptions: string[];
  columnOptions: string[];
  availablePermissions: string[];
  onUpdateField: (id: string, field: 'database' | 'table' | 'column', value: string) => void;
  onAddPermission: (id: string, permission: string) => void;
  onRemovePermission: (id: string, permission: string) => void;
  onRemoveRow: (id: string) => void;
}

export function AccessScopeRowEditor({
  id,
  database,
  table,
  column,
  permissions,
  index,
  databaseOptions,
  tableOptions,
  columnOptions,
  availablePermissions,
  onUpdateField,
  onAddPermission,
  onRemovePermission,
  onRemoveRow,
}: AccessScopeRowEditorProps) {
  const { theme } = useTheme();
  const [newPermission, setNewPermission] = useState('');

  // Get suggested permissions based on scope level
  const getSuggestedPermissions = () => {
    if (!database) return [];

    if (database === 'All' && table === 'All' && column === 'All') {
      return ['SELECT', 'INSERT', 'ALTER', 'CREATE', 'DROP', 'TRUNCATE', 'OPTIMIZE', 'SHOW', 'ALL'];
    } else if (database !== 'All' && (table === 'All' || !table)) {
      return ['SELECT', 'INSERT', 'CREATE', 'DROP', 'ALTER', 'SHOW'];
    } else if (database !== 'All' && table !== 'All' && (column === 'All' || !column)) {
      return ['SELECT', 'INSERT', 'ALTER', 'TRUNCATE', 'OPTIMIZE'];
    } else if (database !== 'All' && table !== 'All' && column !== 'All' && column) {
      return ['SELECT', 'INSERT'];
    }
    return [];
  };

  const suggestedPermissions = getSuggestedPermissions();

  // Filter permission suggestions
  const getPermissionSuggestions = () => {
    if (!newPermission) return [];
    return availablePermissions.filter(
      (perm) =>
        perm.toLowerCase().includes(newPermission.toLowerCase()) &&
        !permissions.includes(perm)
    );
  };

  const permissionSuggestions = getPermissionSuggestions();

  const handleAddPermission = (valueToAdd?: string) => {
    const permValue = valueToAdd || newPermission;
    if (permValue.trim() && !permissions.includes(permValue.trim().toUpperCase())) {
      onAddPermission(id, permValue.trim().toUpperCase());
      setNewPermission('');
    }
  };

  const scopePath = [database, table, column].filter(Boolean).join(' → ') || '(empty)';

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        theme === 'light'
          ? 'bg-white border-gray-300/50 shadow-sm'
          : 'bg-gray-900/30 border-gray-700/50'
      }`}
    >
      {/* Row Header with Number and Delete */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              theme === 'light' ? 'bg-amber-200 text-amber-800' : 'bg-yellow-500/20 text-yellow-400'
            }`}
          >
            {index + 1}
          </div>
          <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Access Path
          </span>
        </div>
        <button
          onClick={() => onRemoveRow(id)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            theme === 'light' ? 'hover:bg-red-100 text-red-600' : 'hover:bg-red-500/20 text-red-400'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cascading Selectors */}
      <div className="flex items-center gap-2">
        {/* Database Select */}
        <div className="flex-1 min-w-0">
          <label className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mb-1 block`}>
            Database
          </label>
          <CascadingAutocompleteSelect
            value={database}
            onChange={(value) => onUpdateField(id, 'database', value)}
            options={databaseOptions}
            placeholder="Select Database"
          />
        </div>

        {/* Arrow */}
        <ChevronRight
          className={`flex-shrink-0 w-4 h-4 mt-5 ${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}
        />

        {/* Table Select */}
        <div className="flex-1 min-w-0">
          <label className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mb-1 block`}>
            Table
          </label>
          <CascadingAutocompleteSelect
            value={table}
            onChange={(value) => onUpdateField(id, 'table', value)}
            options={tableOptions}
            placeholder="Select Table"
            disabled={!database}
          />
        </div>

        {/* Arrow */}
        <ChevronRight
          className={`flex-shrink-0 w-4 h-4 mt-5 ${theme === 'light' ? 'text-gray-400' : 'text-gray-600'}`}
        />

        {/* Column Select */}
        <div className="flex-1 min-w-0">
          <label className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mb-1 block`}>
            Column
          </label>
          <CascadingAutocompleteSelect
            value={column}
            onChange={(value) => onUpdateField(id, 'column', value)}
            options={columnOptions}
            placeholder="Select Column"
            disabled={!table}
          />
        </div>
      </div>

      {/* Scope Path Display */}
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-mono ${
          theme === 'light'
            ? 'bg-gray-50 border-gray-200 text-gray-700'
            : 'bg-gray-800/50 border-gray-700 text-gray-300'
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span>{scopePath}</span>
      </div>

      {/* Permissions Section */}
      {database && (
        <div className={`pt-3 mt-3 border-t ${theme === 'light' ? 'border-gray-200' : 'border-gray-700/50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-500'}`} />
            <span className={`text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Permissions for this path
            </span>
            {suggestedPermissions.length > 0 && (
              <span className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                (Suggested: {suggestedPermissions.join(', ')})
              </span>
            )}
          </div>

          {/* Add Permission Input */}
          <div className="mb-3">
            <AutocompleteInputFlex
              value={newPermission}
              onChange={setNewPermission}
              onAdd={handleAddPermission}
              suggestions={permissionSuggestions}
              placeholder="Add permission (e.g., SELECT, INSERT)..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPermission();
                }
              }}
            />
          </div>

          {/* Suggested Permissions Quick Add */}
          {suggestedPermissions.length > 0 && permissions.length === 0 && (
            <div className="mb-3">
              <p className={`text-xs mb-2 ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'}`}>
                Quick add suggested:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPermissions.map((perm) => (
                  <button
                    key={perm}
                    onClick={() => onAddPermission(id, perm)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200'
                        : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    + {perm}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Current Permissions */}
          <div className="flex flex-wrap gap-2">
            {permissions.map((perm) => (
              <div
                key={perm}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  theme === 'light'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}
              >
                <span>{perm}</span>
                <button
                  onClick={() => onRemovePermission(id, perm)}
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    theme === 'light' ? 'hover:bg-green-200' : 'hover:bg-green-500/30'
                  } transition-colors`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {permissions.length === 0 && (
              <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                No permissions assigned. Add permissions above.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

