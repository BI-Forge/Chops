import { useState, useEffect } from 'react';
import { Database, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { AccessScopeRowEditor } from './AccessScopeRowEditor';
import { usersAPI } from '../services/usersAPI';

export interface AccessScopeRow {
  id: string;
  database: string;
  table: string;
  column: string;
  permissions: string[];
  isReadOnly?: boolean; // If true, scope fields (database, table, column) cannot be edited
}

interface CascadingAccessSelectorProps {
  rows: AccessScopeRow[];
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, field: 'database' | 'table' | 'column', value: string) => void;
  onAddPermission: (id: string, permission: string) => void;
  onRemovePermission: (id: string, permission: string) => void;
  availablePermissions: string[];
  selectedNode?: string;
}

export function CascadingAccessSelector({
  rows,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onAddPermission,
  onRemovePermission,
  availablePermissions,
  selectedNode,
}: CascadingAccessSelectorProps) {
  const { theme } = useTheme();
  
  // State for available schemas (databases)
  const [availableSchemas, setAvailableSchemas] = useState<string[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  
  // State for tables by schema
  const [tablesBySchema, setTablesBySchema] = useState<Record<string, string[]>>({});
  const [loadingTables, setLoadingTables] = useState<Record<string, boolean>>({});
  
  // State for columns by schema and table
  const [columnsBySchemaTable, setColumnsBySchemaTable] = useState<Record<string, string[]>>({});
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});

  // Load schemas on mount
  useEffect(() => {
    const loadSchemas = async () => {
      try {
        setLoadingSchemas(true);
        const schemas = await usersAPI.getSchemasList(selectedNode);
        // Ensure we have an array of valid strings
        const validSchemas = (schemas || []).filter(s => s && typeof s === 'string');
        setAvailableSchemas(validSchemas);
      } catch (err) {
        console.error('Failed to load schemas:', err);
        setAvailableSchemas([]);
      } finally {
        setLoadingSchemas(false);
      }
    };
    
    loadSchemas();
  }, [selectedNode]);

  // Load tables when a schema is selected in any row
  useEffect(() => {
    const loadTablesForSchemas = async () => {
      const schemasToLoad = new Set<string>();
      
      // Collect all unique schemas from rows
      rows.forEach(row => {
        if (row.database && row.database !== 'All' && row.database !== '' && !tablesBySchema[row.database]) {
          schemasToLoad.add(row.database);
        }
      });
      
      // Load tables for each schema
      for (const schema of schemasToLoad) {
        if (loadingTables[schema]) continue; // Already loading
        
        try {
          setLoadingTables(prev => ({ ...prev, [schema]: true }));
          const tables = await usersAPI.getTablesList(selectedNode, schema);
          // Ensure we have an array of valid strings
          const validTables = (tables || []).filter(t => t && typeof t === 'string');
          setTablesBySchema(prev => ({ ...prev, [schema]: validTables }));
        } catch (err) {
          console.error(`Failed to load tables for schema ${schema}:`, err);
          setTablesBySchema(prev => ({ ...prev, [schema]: [] }));
        } finally {
          setLoadingTables(prev => ({ ...prev, [schema]: false }));
        }
      }
    };
    
    if (rows.length > 0) {
      loadTablesForSchemas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => r.database).join(','), selectedNode]);

  // Load columns when a table is selected in any row
  useEffect(() => {
    const loadColumnsForTables = async () => {
      const keysToLoad = new Set<string>();
      
      // Collect all unique schema+table combinations from rows
      rows.forEach(row => {
        if (row.database && row.database !== 'All' && row.database !== '' &&
            row.table && row.table !== 'All' && row.table !== '') {
          const key = `${row.database}.${row.table}`;
          if (!columnsBySchemaTable[key]) {
            keysToLoad.add(key);
          }
        }
      });
      
      // Load columns for each schema+table combination
      for (const key of keysToLoad) {
        if (loadingColumns[key]) continue; // Already loading
        
        const [schema, table] = key.split('.');
        try {
          setLoadingColumns(prev => ({ ...prev, [key]: true }));
          const columns = await usersAPI.getColumnsList(selectedNode, schema, table);
          // Ensure we have an array of valid strings
          const validColumns = (columns || []).filter(c => c && typeof c === 'string');
          setColumnsBySchemaTable(prev => ({ ...prev, [key]: validColumns }));
        } catch (err) {
          console.error(`Failed to load columns for ${key}:`, err);
          setColumnsBySchemaTable(prev => ({ ...prev, [key]: [] }));
        } finally {
          setLoadingColumns(prev => ({ ...prev, [key]: false }));
        }
      }
    };
    
    if (rows.length > 0) {
      loadColumnsForTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map(r => `${r.database}.${r.table}`).join(','), selectedNode]);

  const getAvailableDatabases = () => {
    // Filter out any undefined/null values
    const validSchemas = (availableSchemas || []).filter(s => s && typeof s === 'string');
    return ['All', ...validSchemas];
  };

  const getAvailableTables = (database: string) => {
    // Empty string means "All" in the UI
    if (!database || database === 'All' || database === '') {
      return ['All'];
    }
    const tables = tablesBySchema[database] || [];
    // Filter out any undefined/null values
    const validTables = tables.filter(t => t && typeof t === 'string');
    // If tables are loading, show loading state or return empty array
    if (loadingTables[database]) {
      return ['All']; // Return minimal options while loading
    }
    return ['All', ...validTables];
  };

  const getAvailableColumns = (database: string, table: string) => {
    // Empty string means "All" in the UI
    if (!database || database === 'All' || database === '' || !table || table === 'All' || table === '') {
      return ['All'];
    }
    const key = `${database}.${table}`;
    const columns = columnsBySchemaTable[key] || [];
    // Filter out any undefined/null values
    const validColumns = columns.filter(c => c && typeof c === 'string');
    // If columns are loading, show loading state or return empty array
    if (loadingColumns[key]) {
      return ['All']; // Return minimal options while loading
    }
    return ['All', ...validColumns];
  };
  
  // Function to load tables for a specific schema (called when schema is selected)
  const loadTablesForSchema = async (schema: string) => {
    if (!schema || schema === 'All' || tablesBySchema[schema] || loadingTables[schema]) {
      return;
    }
    
    try {
      setLoadingTables(prev => ({ ...prev, [schema]: true }));
      const tables = await usersAPI.getTablesList(selectedNode, schema);
      // Ensure we have an array of valid strings
      const validTables = (tables || []).filter(t => t && typeof t === 'string');
      setTablesBySchema(prev => ({ ...prev, [schema]: validTables }));
    } catch (err) {
      console.error(`Failed to load tables for schema ${schema}:`, err);
      setTablesBySchema(prev => ({ ...prev, [schema]: [] }));
    } finally {
      setLoadingTables(prev => ({ ...prev, [schema]: false }));
    }
  };
  
  // Function to load columns for a specific schema+table (called when table is selected)
  const loadColumnsForTable = async (schema: string, table: string) => {
    if (!schema || schema === 'All' || !table || table === 'All') {
      return;
    }
    
    const key = `${schema}.${table}`;
    if (columnsBySchemaTable[key] || loadingColumns[key]) {
      return;
    }
    
    try {
      setLoadingColumns(prev => ({ ...prev, [key]: true }));
      const columns = await usersAPI.getColumnsList(selectedNode, schema, table);
      // Ensure we have an array of valid strings
      const validColumns = (columns || []).filter(c => c && typeof c === 'string');
      setColumnsBySchemaTable(prev => ({ ...prev, [key]: validColumns }));
    } catch (err) {
      console.error(`Failed to load columns for ${key}:`, err);
      setColumnsBySchemaTable(prev => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingColumns(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleUpdateField = async (id: string, field: 'database' | 'table' | 'column', value: string) => {
    // Update the field first
    onUpdateRow(id, field, value);

    // Load data for dependent fields
    if (field === 'database') {
      // Load tables for the selected schema
      if (value && value !== 'All') {
        await loadTablesForSchema(value);
      }
      // Reset dependent fields
      setTimeout(() => {
        onUpdateRow(id, 'table', '');
        onUpdateRow(id, 'column', '');
      }, 10);
    } else if (field === 'table') {
      // Find the database for this row
      const row = rows.find(r => r.id === id);
      if (row && row.database && row.database !== 'All' && value && value !== 'All') {
        await loadColumnsForTable(row.database, value);
      }
      // Reset dependent field
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
        {!rows || rows.length === 0 ? (
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
                isReadOnly={row.isReadOnly || false}
              />
            );
          })
        )}
      </div>
    </div>
  );
}