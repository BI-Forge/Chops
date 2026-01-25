import React, { useState, useEffect } from 'react';
import { Users, XCircle, Shield, Database, Key, Award, Hash, Save, Copy, Plus, Check, Lock, Eye, EyeOff, Trash2, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { AutocompleteInput } from '../AutocompleteInput';
import { AutocompleteInputFlex } from '../AutocompleteInputFlex';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { usersAPI } from '../../services/usersAPI';
import type { User } from './UsersTable';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isNewUser?: boolean;
  selectedNode?: string;
}

export function UserDetailsModal({ isOpen, onClose, user, isNewUser = false, selectedNode }: UserDetailsModalProps) {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  
  // State for user basic info from API
  const [userBasicInfo, setUserBasicInfo] = useState<{ id: string; profile: string; storage: string; role_name: string; grants: string[]; user_settings?: string[]; profile_settings?: Record<string, string>; scope?: string } | null>(null);
  const [loadingBasicInfo, setLoadingBasicInfo] = useState(false);
  
  // Mock data for autocomplete
  const availableDatabases = ['analytics', 'production', 'staging', 'development', 'logs', 'metrics', 'system', 'backup'];
  const availableTables = ['users', 'orders', 'products', 'sessions', 'events', 'logs', 'metrics', 'transactions', 'payments'];
  const availableColumns = ['id', 'name', 'email', 'created_at', 'updated_at', 'status', 'user_id', 'amount', 'timestamp'];
  const availableRoles = ['admin', 'developer', 'analyst', 'viewer', 'editor', 'manager', 'operator', 'readonly'];
  const availableGrants = [
    'SELECT', 'INSERT', 'ALTER', 'CREATE', 'DROP', 'TRUNCATE', 'OPTIMIZE', 'SHOW', 
    'ALL', 'READ', 'WRITE', 'BACKUP', 'KILL QUERY', 'SYSTEM', 'INTROSPECTION',
    'KAFKA', 'NATS', 'RABBITMQ', 'SOURCES', 'SET DEFINER', 'SQLITE', 'ODBC', 
    'JDBC', 'HDFS', 'S3', 'HIVE', 'AZURE', 'FILE', 'URL', 'REMOTE', 'MONGO', 
    'REDIS', 'MYSQL', 'POSTGRES', 'KILL TRANSACTION', 'MOVE PARTITION BETWEEN SHARDS',
    'dictGet', 'displaySecretsInShowAndSelect', 'CLUSTER', 'UNDROP TABLE', 
    'TABLE ENGINE', 'CHECK'
  ];
  const availableSettings = [
    'readonly', 'allow_ddl', 'allow_introspection_functions', 'max_memory_usage',
    'max_execution_time', 'max_rows_to_read', 'max_bytes_to_read', 'max_result_rows',
    'max_result_bytes', 'result_overflow_mode', 'max_rows_to_group_by', 'group_by_overflow_mode',
    'max_rows_to_sort', 'max_bytes_to_sort', 'sort_overflow_mode', 'max_columns_to_read',
    'max_temporary_columns', 'max_temporary_non_const_columns', 'max_subquery_depth',
    'max_pipeline_depth', 'max_ast_depth', 'max_ast_elements', 'max_expanded_ast_elements',
    'readonly_2', 'allow_experimental_analyzer', 'enable_optimize_predicate_expression'
  ];
  
  // Editable states
  const [editableName, setEditableName] = useState('');
  const [editablePassword, setEditablePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editableRole, setEditableRole] = useState('');
  const [editableDatabases, setEditableDatabases] = useState<string[]>([]);
  const [editableTables, setEditableTables] = useState<string[]>([]);
  const [editableColumns, setEditableColumns] = useState<string[]>([]);
  const [editableGrants, setEditableGrants] = useState<string[]>([]);
  const [editableSettings, setEditableSettings] = useState<Array<{name: string, value: string}>>([]);
  const [newGrant, setNewGrant] = useState('');
  const [newSetting, setNewSetting] = useState('');
  const [newDatabase, setNewDatabase] = useState('');
  const [newTable, setNewTable] = useState('');
  const [newColumn, setNewColumn] = useState('');
  const [newRole, setNewRole] = useState('');
  
  // Copy modal states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyPassword, setCopyPassword] = useState('');
  const [showCopyPassword, setShowCopyPassword] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Autocomplete states
  const [showDatabaseSuggestions, setShowDatabaseSuggestions] = useState(false);
  const [showTableSuggestions, setShowTableSuggestions] = useState(false);
  const [showColumnSuggestions, setShowColumnSuggestions] = useState(false);
  const [showGrantSuggestions, setShowGrantSuggestions] = useState(false);
  const [showSettingSuggestions, setShowSettingSuggestions] = useState(false);
  const [selectedDatabaseIndex, setSelectedDatabaseIndex] = useState(-1);
  const [selectedTableIndex, setSelectedTableIndex] = useState(-1);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(-1);
  const [selectedGrantIndex, setSelectedGrantIndex] = useState(-1);
  const [selectedSettingIndex, setSelectedSettingIndex] = useState(-1);

  // Load user basic info from API when modal opens
  useEffect(() => {
    if (isOpen && !isNewUser && user && user.name) {
      const loadUserBasicInfo = async () => {
        try {
          setLoadingBasicInfo(true);
          const basicInfo = await usersAPI.getUserBasicInfo(user.name, selectedNode);
          setUserBasicInfo({
            id: basicInfo.id,
            profile: basicInfo.profile,
            storage: basicInfo.storage,
            role_name: basicInfo.role_name,
            grants: basicInfo.grants || [],
            user_settings: basicInfo.user_settings,
            profile_settings: basicInfo.profile_settings,
            scope: basicInfo.scope,
          });
          // Update editable fields with API data
          setEditableName(basicInfo.name);
          setEditableRole(basicInfo.role_name || '');
          setEditableGrants(basicInfo.grants || []);
        } catch (err) {
          console.error('Failed to load user basic info:', err);
          showError('Failed to load user information');
          // Fallback to user data from props
          setUserBasicInfo({
            id: user.id,
            profile: user.profile || '',
            storage: user.storage || '',
            role_name: user.role_name || '',
            grants: user.grants || [],
          });
        } finally {
          setLoadingBasicInfo(false);
        }
      };
      
      loadUserBasicInfo();
    } else if (isOpen && !isNewUser && user) {
      // Fallback to user data from props if no selectedNode
      setUserBasicInfo({
        id: user.id,
        profile: user.profile || '',
        storage: user.storage || '',
        role_name: user.role_name || '',
        grants: user.grants || [],
      });
    } else {
      setUserBasicInfo(null);
    }
  }, [isOpen, user, isNewUser, selectedNode, showError]);

  // Initialize editable states when user changes (but don't override API-loaded data)
  useEffect(() => {
    if (isNewUser) {
      // New user - start with empty fields
      setEditableName('');
      setEditablePassword('');
      setShowPassword(false);
      setEditableRole('');
      setNewRole('');
      setEditableDatabases([]);
      setEditableTables([]);
      setEditableColumns([]);
      setEditableGrants([]);
      setEditableSettings([]);
      setNewDatabase('');
      setNewTable('');
      setNewColumn('');
    } else if (user && !loadingBasicInfo) {
      // Only initialize if we're not currently loading from API
      // Use API data if available, otherwise use props data
      if (!userBasicInfo) {
        setEditableName(user.name);
        setEditablePassword('');
        setShowPassword(false);
        setEditableRole(user.role_name || '');
        setNewRole('');
        setEditableDatabases(user.database ? [user.database] : []);
        setEditableTables(user.table ? [user.table] : []);
        setEditableColumns(user.column ? [user.column] : []);
        setEditableGrants([...user.grants]);
        setEditableSettings([]);
        setNewDatabase('');
        setNewTable('');
        setNewColumn('');
      } else {
        // Update grants from API data if available
        if (userBasicInfo.grants && userBasicInfo.grants.length > 0) {
          setEditableGrants([...userBasicInfo.grants]);
        }
      }
    }
  }, [user, isNewUser, userBasicInfo, loadingBasicInfo]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || (!user && !isNewUser)) return null;

  const handleAddGrant = (valueToAdd?: string) => {
    const grantValue = valueToAdd || newGrant;
    if (grantValue.trim() && !editableGrants.includes(grantValue.trim().toUpperCase())) {
      setEditableGrants([...editableGrants, grantValue.trim().toUpperCase()]);
      setNewGrant('');
    }
  };

  const handleRemoveGrant = (grant: string) => {
    setEditableGrants(editableGrants.filter(g => g !== grant));
  };

  const handleAddSetting = (valueToAdd?: string) => {
    const settingValue = (typeof valueToAdd === 'string' ? valueToAdd : newSetting) || '';
    if (settingValue.trim() && !editableSettings.some(s => s.name === settingValue.trim().toLowerCase())) {
      setEditableSettings([...editableSettings, {name: settingValue.trim().toLowerCase(), value: ''}]);
      setNewSetting('');
    }
  };

  const handleRemoveSetting = (setting: string) => {
    setEditableSettings(editableSettings.filter(s => s.name !== setting));
  };

  const handleSave = () => {
    // Here you would typically save to backend
    success('User details saved successfully');
    console.log('Saving user:', {
      name: editableName,
      password: editablePassword,
      role: editableRole,
      databases: editableDatabases,
      tables: editableTables,
      columns: editableColumns,
      grants: editableGrants,
      settings: editableSettings
    });
  };

  const handleCopy = () => {
    setCopyName(editableName);
    setCopyPassword('');
    setShowCopyPassword(false);
    setShowCopyModal(true);
  };

  const handleApplyCopy = () => {
    console.log('Applying copy with:', {
      name: copyName,
      password: copyPassword
    });
    success('User credentials applied successfully');
    setShowCopyModal(false);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    console.log('Deleting user:', editableName);
    success('User deleted successfully');
    setShowDeleteConfirm(false);
    onClose();
  };

  // Filter suggestions based on input
  const getDatabaseSuggestions = () => {
    if (!newDatabase) return [];
    return availableDatabases.filter(db => 
      db.toLowerCase().includes(newDatabase.toLowerCase()) && 
      !editableDatabases.includes(db)
    );
  };

  const getTableSuggestions = () => {
    if (!newTable) return [];
    return availableTables.filter(table => 
      table.toLowerCase().includes(newTable.toLowerCase()) && 
      !editableTables.includes(table)
    );
  };

  const getColumnSuggestions = () => {
    if (!newColumn) return [];
    return availableColumns.filter(column => 
      column.toLowerCase().includes(newColumn.toLowerCase()) && 
      !editableColumns.includes(column)
    );
  };

  const getGrantSuggestions = () => {
    if (!newGrant) return [];
    return availableGrants.filter(grant => 
      grant.toLowerCase().includes(newGrant.toLowerCase()) && 
      !editableGrants.includes(grant)
    );
  };

  const getSettingSuggestions = () => {
    if (!newSetting) return [];
    return availableSettings.filter(setting => 
      setting.toLowerCase().includes(newSetting.toLowerCase()) && 
      !editableSettings.some(s => s.name === setting)
    );
  };

  const getRoleSuggestions = () => {
    if (!newRole) return [];
    return availableRoles.filter(role => 
      role.toLowerCase().includes(newRole.toLowerCase())
    );
  };

  const databaseSuggestions = getDatabaseSuggestions();
  const tableSuggestions = getTableSuggestions();
  const columnSuggestions = getColumnSuggestions();
  const grantSuggestions = getGrantSuggestions();
  const settingSuggestions = getSettingSuggestions();
  const roleSuggestions = getRoleSuggestions();

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm`}
      onClick={onClose}
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div 
        className={`bg-gradient-to-br ${
          theme === 'light'
            ? 'from-white/95 to-gray-50/95 border-amber-500/30'
            : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${
              theme === 'light'
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-amber-500 to-yellow-600'
            } flex items-center justify-center`}>
              <span className="text-white text-xl font-semibold">
                {editableName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
              }`}>
                {isNewUser ? 'New User' : editableName}
              </h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm mt-0.5`}>
                {isNewUser ? 'Create New User' : 'User Details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-lg ${
              theme === 'light'
                ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
            } border transition-all duration-200 flex items-center justify-center group`}
          >
            <XCircle className={`w-5 h-5 ${
              theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
            }`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Users className="w-5 h-5" />
                <h3 className="font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Editable Name */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Users className="w-4 h-4" />
                    Name
                  </label>
                  <input
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-800 focus:border-amber-500/50'
                        : 'bg-gray-900/50 border-gray-700 text-white focus:border-yellow-500/50'
                    } focus:outline-none transition-colors text-sm`}
                  />
                </div>

                {/* Editable Password */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Lock className="w-4 h-4" />
                    Password
                  </label>
                  <input
                    type="text"
                    value={editablePassword}
                    onChange={(e) => setEditablePassword(e.target.value)}
                    placeholder="Enter new password..."
                    autoComplete="off"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                        : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                    } focus:outline-none transition-colors text-sm`}
                  />
                </div>

                {/* User ID (Read-only) - Hide for new users */}
                {!isNewUser && (
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      <Hash className="w-4 h-4" />
                      User ID
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm font-mono break-all`}>
                      {loadingBasicInfo ? 'Loading...' : (userBasicInfo?.id || user?.id || 'N/A')}
                    </p>
                  </div>
                )}

                {/* Storage (Read-only) - Hide for new users */}
                {!isNewUser && (
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      <Database className="w-4 h-4" />
                      Storage
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                      {loadingBasicInfo ? 'Loading...' : (userBasicInfo?.storage || user?.storage || 'N/A')}
                    </p>
                  </div>
                )}

                {/* Profile (Read-only) - Hide for new users */}
                {!isNewUser && userBasicInfo?.profile && (
                  <div className={`${
                    theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                  } border rounded-xl p-4`}>
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                      <Shield className="w-4 h-4" />
                      Profile
                    </div>
                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-white'} text-sm`}>
                      {loadingBasicInfo ? 'Loading...' : (userBasicInfo.profile || 'N/A')}
                    </p>
                  </div>
                )}

                {/* Editable Role */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Award className="w-4 h-4" />
                    Role
                  </label>
                  <AutocompleteInput
                    value={newRole}
                    onChange={setNewRole}
                    onAdd={(valueToAdd) => {
                      const roleValue = valueToAdd || newRole;
                      if (roleValue.trim()) {
                        setEditableRole(roleValue.trim());
                        setNewRole('');
                      }
                    }}
                    suggestions={roleSuggestions}
                    placeholder="Enter role..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newRole.trim()) {
                          setEditableRole(newRole.trim());
                          setNewRole('');
                        }
                      }
                    }}
                  />
                  
                  {/* Role tag */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editableRole ? (
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          theme === 'light'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        } group transition-all duration-200 hover:scale-105`}
                      >
                        <span>{editableRole}</span>
                        <button
                          onClick={() => setEditableRole('')}
                          className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            theme === 'light'
                              ? 'hover:bg-green-200'
                              : 'hover:bg-green-500/30'
                          } transition-colors`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                        No role assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Access Scope */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Key className="w-5 h-5" />
                <h3 className="font-semibold">Access Scope</h3>
              </div>
              
              {/* Editable Database */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4 mb-4`}>
                <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                  Database
                </label>
                <AutocompleteInput
                  value={newDatabase}
                  onChange={setNewDatabase}
                  onAdd={(valueToAdd) => {
                    const dbValue = (typeof valueToAdd === 'string' ? valueToAdd : newDatabase) || '';
                    if (dbValue.trim() && !editableDatabases.includes(dbValue.trim())) {
                      setEditableDatabases([...editableDatabases, dbValue.trim()]);
                      setNewDatabase('');
                    }
                  }}
                  suggestions={databaseSuggestions}
                  placeholder="Add database..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newDatabase.trim() && !editableDatabases.includes(newDatabase.trim())) {
                        setEditableDatabases([...editableDatabases, newDatabase.trim()]);
                        setNewDatabase('');
                      }
                    }
                  }}
                />
                
                {/* Databases tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {editableDatabases.map((database) => (
                    <div
                      key={database}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-500/20 text-yellow-400 border border-yellow-500/30'
                      } group transition-all duration-200 hover:scale-105`}
                    >
                      <span>{database}</span>
                      <button
                        onClick={() => setEditableDatabases(editableDatabases.filter(d => d !== database))}
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          theme === 'light'
                            ? 'hover:bg-amber-200'
                            : 'hover:bg-yellow-500/30'
                        } transition-colors`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editableDatabases.length === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No databases assigned
                    </p>
                  )}
                </div>
              </div>

              {/* Editable Table */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4 mb-4`}>
                <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                  Table
                </label>
                <AutocompleteInput
                  value={newTable}
                  onChange={setNewTable}
                  onAdd={(valueToAdd) => {
                    const tableValue = (typeof valueToAdd === 'string' ? valueToAdd : newTable) || '';
                    if (tableValue.trim() && !editableTables.includes(tableValue.trim())) {
                      setEditableTables([...editableTables, tableValue.trim()]);
                      setNewTable('');
                    }
                  }}
                  suggestions={tableSuggestions}
                  placeholder="Add table..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTable.trim() && !editableTables.includes(newTable.trim())) {
                        setEditableTables([...editableTables, newTable.trim()]);
                        setNewTable('');
                      }
                    }
                  }}
                />
                
                {/* Tables tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {editableTables.map((table) => (
                    <div
                      key={table}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-500/20 text-yellow-400 border border-yellow-500/30'
                      } group transition-all duration-200 hover:scale-105`}
                    >
                      <span>{table}</span>
                      <button
                        onClick={() => setEditableTables(editableTables.filter(t => t !== table))}
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          theme === 'light'
                            ? 'hover:bg-amber-200'
                            : 'hover:bg-yellow-500/30'
                        } transition-colors`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editableTables.length === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No tables assigned
                    </p>
                  )}
                </div>
              </div>

              {/* Editable Column */}
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                  Column
                </label>
                <AutocompleteInput
                  value={newColumn}
                  onChange={setNewColumn}
                  onAdd={(valueToAdd) => {
                    const columnValue = (typeof valueToAdd === 'string' ? valueToAdd : newColumn) || '';
                    if (columnValue.trim() && !editableColumns.includes(columnValue.trim())) {
                      setEditableColumns([...editableColumns, columnValue.trim()]);
                      setNewColumn('');
                    }
                  }}
                  suggestions={columnSuggestions}
                  placeholder="Add column..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newColumn.trim() && !editableColumns.includes(newColumn.trim())) {
                        setEditableColumns([...editableColumns, newColumn.trim()]);
                        setNewColumn('');
                      }
                    }
                  }}
                />
                
                {/* Columns tags */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {editableColumns.map((column) => (
                    <div
                      key={column}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-500/20 text-yellow-400 border border-yellow-500/30'
                      } group transition-all duration-200 hover:scale-105`}
                    >
                      <span>{column}</span>
                      <button
                        onClick={() => setEditableColumns(editableColumns.filter(c => c !== column))}
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          theme === 'light'
                            ? 'hover:bg-amber-200'
                            : 'hover:bg-yellow-500/30'
                        } transition-colors`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editableColumns.length === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No columns assigned
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold">Permissions ({editableGrants.length} {editableGrants.length === 1 ? 'grant' : 'grants'})</h3>
              </div>

              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                {/* Add new permission */}
                <div className="mb-4">
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Add Permission
                  </label>
                  <AutocompleteInputFlex
                    value={newGrant}
                    onChange={setNewGrant}
                    onAdd={handleAddGrant}
                    suggestions={grantSuggestions}
                    placeholder="Enter permission name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGrant();
                      }
                    }}
                  />
                </div>

                {/* Permissions tags */}
                <div className="flex flex-wrap gap-2">
                  {editableGrants.map((grant) => (
                    <div
                      key={grant}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        theme === 'light'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-amber-500/20 text-yellow-400 border border-yellow-500/30'
                      } group transition-all duration-200 hover:scale-105`}
                    >
                      <span>{grant}</span>
                      <button
                        onClick={() => handleRemoveGrant(grant)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          theme === 'light'
                            ? 'hover:bg-amber-200'
                            : 'hover:bg-yellow-500/30'
                        } transition-colors`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editableGrants.length === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No permissions assigned
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Settings */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Settings className="w-5 h-5" />
                <h3 className="font-semibold">Settings ({editableSettings.length} {editableSettings.length === 1 ? 'setting' : 'settings'})</h3>
              </div>

              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                {/* Add new setting */}
                <div className="mb-4">
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Add Setting
                  </label>
                  <AutocompleteInputFlex
                    value={newSetting}
                    onChange={setNewSetting}
                    onAdd={handleAddSetting}
                    suggestions={settingSuggestions}
                    placeholder="Enter setting name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSetting();
                      }
                    }}
                  />
                </div>

                {/* Settings list with values */}
                <div className="space-y-2">
                  {editableSettings.map((setting, index) => (
                    <div
                      key={setting.name}
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        theme === 'light'
                          ? 'bg-white/50 border border-gray-200'
                          : 'bg-gray-900/30 border border-gray-700/50'
                      }`}
                    >
                      {/* Setting name tag */}
                      <div
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                          theme === 'light'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-amber-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        <span>{setting.name}</span>
                      </div>
                      
                      {/* Equals sign */}
                      <span className={`${theme === 'light' ? 'text-gray-500' : 'text-gray-600'} text-sm`}>=</span>
                      
                      {/* Value input */}
                      <input
                        type="text"
                        value={setting.value}
                        onChange={(e) => {
                          const newSettings = [...editableSettings];
                          newSettings[index].value = e.target.value;
                          setEditableSettings(newSettings);
                        }}
                        placeholder="Enter value..."
                        className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                            : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                        } focus:outline-none transition-colors`}
                      />
                      
                      {/* Delete button */}
                      <button
                        onClick={() => handleRemoveSetting(setting.name)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          theme === 'light'
                            ? 'hover:bg-red-100 text-red-600'
                            : 'hover:bg-red-500/20 text-red-400'
                        } transition-colors`}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editableSettings.length === 0 && (
                    <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-gray-600'}`}>
                      No settings assigned
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          {!isNewUser && (
            <button
              onClick={handleDelete}
              className={`px-6 py-2.5 rounded-lg border ${
                theme === 'light'
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 hover:border-red-600 text-red-700 hover:text-red-800'
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300'
              } transition-all duration-200 flex items-center gap-2 font-medium`}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {!isNewUser && (
            <button
              onClick={handleCopy}
              className={`px-6 py-2.5 rounded-lg border ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-50 border-gray-300 hover:border-amber-500/40 text-gray-700 hover:text-amber-700'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700 hover:border-yellow-500/30 text-gray-300 hover:text-yellow-400'
              } transition-all duration-200 flex items-center gap-2 font-medium`}
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          )}
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-lg ${
              theme === 'light'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
            } transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl`}
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div 
          className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${
            theme === 'light' ? 'bg-black/50' : 'bg-black/70'
          } backdrop-blur-sm`}
          onClick={() => setShowCopyModal(false)}
          style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        >
          <div 
            className={`bg-gradient-to-br ${
              theme === 'light'
                ? 'from-white/95 to-gray-50/95 border-amber-500/30'
                : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
            } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg ${
                  theme === 'light'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                    : 'bg-gradient-to-br from-amber-500 to-yellow-600'
                } flex items-center justify-center`}>
                  <span className="text-white text-xl font-semibold">
                    {editableName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${
                    theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                  }`}>
                    {editableName}
                  </h2>
                  <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm mt-0.5`}>
                    Copy Credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyModal(false)}
                className={`w-10 h-10 rounded-lg ${
                  theme === 'light'
                    ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                    : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
                } border transition-all duration-200 flex items-center justify-center group`}
              >
                <XCircle className={`w-5 h-5 ${
                  theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
                }`} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                    <Users className="w-5 h-5" />
                    <h3 className="font-semibold">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Editable Name */}
                    <div className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}>
                      <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                        <Users className="w-4 h-4" />
                        Name
                      </label>
                      <input
                        type="text"
                        value={copyName}
                        onChange={(e) => setCopyName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 focus:border-amber-500/50'
                            : 'bg-gray-900/50 border-gray-700 text-white focus:border-yellow-500/50'
                        } focus:outline-none transition-colors text-sm`}
                      />
                    </div>

                    {/* Editable Password */}
                    <div className={`${
                      theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                    } border rounded-xl p-4`}>
                      <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                        <Lock className="w-4 h-4" />
                        Password
                      </label>
                      <input
                        type="text"
                        value={copyPassword}
                        onChange={(e) => setCopyPassword(e.target.value)}
                        placeholder="Enter new password..."
                        autoComplete="off"
                        className={`w-full px-3 py-2 rounded-lg border ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                            : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                        } focus:outline-none transition-colors text-sm`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Action Buttons */}
            <div className={`flex items-center justify-end gap-3 p-6 border-t ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}>
              <button
                onClick={handleApplyCopy}
                className={`px-6 py-2.5 rounded-lg ${
                  theme === 'light'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
                } transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl`}
              >
                <Save className="w-4 h-4" />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        userName={editableName}
      />
    </div>
  );
}