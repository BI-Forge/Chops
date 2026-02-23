import { useState, useEffect, useRef } from 'react';
import { Users, XCircle, Database, Key, Hash, Save, Copy, Lock, Eye, EyeOff, Trash2, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { AutocompleteInput } from '../AutocompleteInput';
import { AutocompleteInputFlex } from '../AutocompleteInputFlex';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { CascadingAccessSelector, type AccessScopeRow } from '../CascadingAccessSelector';
import { usersAPI } from '../../services/usersAPI';
import type { User } from './UsersTable';

function sameAccessScopesPayload(a: Array<{ database: string; table: string; column: string; permissions: string[] }>, b: Array<{ database: string; table: string; column: string; permissions: string[] }> | null): boolean {
  if (b === null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].database !== b[i].database || a[i].table !== b[i].table || a[i].column !== b[i].column) return false;
    const pa = a[i].permissions || [];
    const pb = b[i].permissions || [];
    if (pa.length !== pb.length) return false;
    for (let j = 0; j < pa.length; j++) if (pa[j] !== pb[j]) return false;
  }
  return true;
}

function sameSettingsPayload(a: Array<{ name: string; value: string }>, b: Array<{ name: string; value: string }> | null): boolean {
  if (b === null) return false;
  if (a.length !== b.length) return false;
  const am = new Map(a.map((s) => [s.name, s.value]));
  const bm = new Map(b.map((s) => [s.name, s.value]));
  if (am.size !== bm.size) return false;
  for (const [k, v] of am) if (bm.get(k) !== v) return false;
  return true;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isNewUser?: boolean;
  /** When set, form is pre-filled from this user and Save creates a new user (POST). */
  copyFromUser?: User | null;
  selectedNode?: string;
  onRefreshUsers?: () => void;
  /** When set, Copy button in edit mode opens copy-user flow (create new user from current). */
  onCopyUser?: (user: User) => void;
}

export function UserDetailsModal({ isOpen, onClose, user, isNewUser = false, copyFromUser = null, selectedNode, onRefreshUsers, onCopyUser }: UserDetailsModalProps) {
  const isCopyMode = !!copyFromUser && copyFromUser === user;
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  
  // State for user basic info from API
  const [userBasicInfo, setUserBasicInfo] = useState<{ id: string; profile: string; storage: string; role_name: string; grants: string[]; user_settings?: string[]; profile_settings?: Record<string, string>; scope?: string } | null>(null);
  const [loadingBasicInfo, setLoadingBasicInfo] = useState(false);
  const [originalUserName, setOriginalUserName] = useState<string>('');
  const [originalProfile, setOriginalProfile] = useState<string>('');
  const [originalRole, setOriginalRole] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [profileUpdateInProgress, setProfileUpdateInProgress] = useState(false);
  // Use refs to track active requests to prevent duplicate calls even in StrictMode
  const profileUpdateRequestRef = useRef<Promise<void> | null>(null);
  const saveRequestRef = useRef<Promise<void> | null>(null);
  // Initial payloads when loaded (to skip update if unchanged)
  type AccessScopePayload = { database: string; table: string; column: string; permissions: string[] };
  const initialAccessScopesRef = useRef<AccessScopePayload[] | null>(null);
  const initialSettingsRef = useRef<Array<{ name: string; value: string }> | null>(null);

  // State for profiles list from API
  const [availableProfiles, setAvailableProfiles] = useState<string[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const profilesLoadedRef = useRef(false);
  
  // State for roles list from API
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const rolesLoadedRef = useRef(false);

  // State for available settings list from API (for Settings block)
  const [availableSettingsFromAPI, setAvailableSettingsFromAPI] = useState<string[]>([]);
  const [loadingAvailableSettings, setLoadingAvailableSettings] = useState(false);
  const availableSettingsLoadedRef = useRef(false);

  // User settings from GET /clickhouse/settings (key-value for display and initial form)
  const [userSettingsFromAPI, setUserSettingsFromAPI] = useState<{ user_name: string; user_settings: Record<string, string>; profile_settings: Record<string, string> } | null>(null);

  const availableGrants = [
    // Basic data operations
    'SELECT', 'INSERT', 'UPDATE', 'DELETE',
    // DDL operations
    'ALTER', 'ALTER TABLE', 'ALTER VIEW', 'ALTER DATABASE', 'ALTER TTL', 'ALTER SETTINGS',
    'CREATE', 'CREATE TABLE', 'CREATE VIEW', 'CREATE DATABASE', 'CREATE DICTIONARY', 'CREATE FUNCTION',
    'DROP', 'DROP TABLE', 'DROP VIEW', 'DROP DATABASE', 'DROP DICTIONARY', 'DROP FUNCTION',
    'TRUNCATE', 'UNDROP TABLE',
    // Query operations
    'SHOW', 'SHOW TABLES', 'SHOW DATABASES', 'SHOW DICTIONARIES', 'SHOW PROCESSLIST',
    'OPTIMIZE', 'OPTIMIZE TABLE',
    // System operations
    'SYSTEM', 'SYSTEM SHUTDOWN', 'SYSTEM KILL', 'SYSTEM DROP DNS CACHE', 'SYSTEM DROP MARK CACHE',
    'KILL QUERY', 'KILL TRANSACTION', 'KILL MUTATION',
    // Backup and restore
    'BACKUP', 'RESTORE',
    // Cluster operations
    'CLUSTER', 'MOVE PARTITION BETWEEN SHARDS',
    // Introspection
    'INTROSPECTION', 'INTROSPECTION FUNCTIONS',
    // Dictionary operations
    'dictGet',
    // Table engine operations
    'TABLE ENGINE',
    // Data validation
    'CHECK', 'CHECK TABLE',
    // Access control
    'ALL', 'READ', 'WRITE', 'ACCESS MANAGEMENT',
    // External data sources
    'FILE', 'URL', 'REMOTE', 'S3', 'HDFS', 'AZURE', 'HIVE',
    // Database connectors
    'MYSQL', 'POSTGRES', 'SQLITE', 'ODBC', 'JDBC', 'MONGO', 'REDIS',
    // Message queues
    'KAFKA', 'NATS', 'RABBITMQ',
    // Other
    'SOURCES', 'SET DEFINER', 'displaySecretsInShowAndSelect'
  ];
  // Editable states
  const [editableName, setEditableName] = useState('');
  const [editablePassword, setEditablePassword] = useState('');
  const [editableProfile, setEditableProfile] = useState('');
  const [editableRole, setEditableRole] = useState('');
  const [accessScopeRows, setAccessScopeRows] = useState<AccessScopeRow[]>([]);
  const [editableSettings, setEditableSettings] = useState<Array<{name: string, value: string}>>([]);
  const [newSetting, setNewSetting] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newProfile, setNewProfile] = useState('');
  
  
  // Copy modal states
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyPassword, setCopyPassword] = useState('');
  const [showCopyPassword, setShowCopyPassword] = useState(false);

  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load user basic info from API when modal opens (edit existing user or copy-from user)
  useEffect(() => {
    if (isOpen && user && user.name && (!isNewUser || isCopyMode)) {
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
          if (isCopyMode) {
            const copyName = `${basicInfo.name || user.name}_copy`;
            setEditableName(copyName);
            setOriginalUserName('');
            setEditablePassword('');
          } else {
            setEditableName(basicInfo.name);
            setOriginalUserName(basicInfo.name);
          }
          setEditableProfile(basicInfo.profile || '');
          setOriginalProfile(basicInfo.profile || '');
          setEditableRole(basicInfo.role_name || '');
          setOriginalRole(basicInfo.role_name || '');
          // Password is not returned from API, so we track changes by non-empty editablePassword
          
          // Load access scopes from API
          try {
            const accessScopes = await usersAPI.getUserAccessScopes(user.name, selectedNode);
            // Convert AccessScope[] to AccessScopeRow[]
            // Note: "all" from API means empty string in UI (represents "All" wildcard)
            const baseTimestamp = Date.now();
            const accessScopeRows: AccessScopeRow[] = accessScopes.map((scope, index) => ({
              id: `row-${baseTimestamp}-${index}-${Math.random()}`,
              database: scope.database === 'all' ? '' : scope.database,
              table: scope.table === 'all' ? '' : scope.table,
              column: scope.column === 'all' ? '' : scope.column,
              permissions: scope.permissions || [],
              isReadOnly: true // Existing scopes from API are read-only
            }));
            setAccessScopeRows(accessScopeRows);
            // Don't set initial ref here — set it only after successful save, so first Save after open always sends
          } catch (err) {
            console.error('[UserDetailsModal] Failed to load access scopes:', err);
            // Don't show error to user - just use empty array
            setAccessScopeRows([]);
            initialAccessScopesRef.current = [];
          }

          // Load user settings from GET /clickhouse/settings for key-value display and form
          try {
            const settingsResp = await usersAPI.getUserSettings(user.name, selectedNode);
            const userSettings = settingsResp.user_settings || {};
            const profileSettings = settingsResp.profile_settings || {};
            setUserSettingsFromAPI({
              user_name: settingsResp.user_name,
              user_settings: userSettings,
              profile_settings: profileSettings,
            });
            // Editable list: only user_settings (profile_settings are read-only and not sent on update)
            const pairs: Array<{ name: string; value: string }> = Object.entries(userSettings).map(([name, value]) => ({ name, value }));
            setEditableSettings(pairs);
            // Don't set initial ref here — set it only after successful save, so first Save after open always sends
          } catch (err) {
            console.error('[UserDetailsModal] Failed to load user settings:', err);
            setUserSettingsFromAPI(null);
            setEditableSettings([]);
            initialSettingsRef.current = null;
          }
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
      setUserSettingsFromAPI(null);
    }
  }, [isOpen, user, isNewUser, isCopyMode, selectedNode, showError]);

  // Initialize editable states when user changes (but don't override API-loaded data)
  useEffect(() => {
    if (isNewUser && !isCopyMode) {
      // New user - start with empty fields (copy mode is filled by the load effect above)
      setEditableName('');
      setOriginalUserName('');
      setOriginalProfile('');
      setEditablePassword('');
      setEditableProfile('');
      setEditableRole('');
      setOriginalRole('');
      setNewRole('');
      setNewProfile('');
      setAccessScopeRows([]);
      setEditableSettings([]);
      setUserSettingsFromAPI(null);
      initialAccessScopesRef.current = [];
      initialSettingsRef.current = [];
    } else if (user && !loadingBasicInfo && !userBasicInfo && !isCopyMode) {
      // Only initialize if we're not currently loading from API and userBasicInfo is not set
      // This means we're using props data, not API data
      setEditableName(user.name);
      setOriginalUserName(user.name);
      setEditablePassword('');
      setEditableProfile(user.profile || '');
      setOriginalProfile(user.profile || '');
      setEditableRole(user.role_name || '');
      setOriginalRole(user.role_name || '');
      setNewRole('');
      setNewProfile('');
      // Don't clear access scope rows here - they may be loaded from API
      setEditableSettings([]);
    } else if (user && userBasicInfo && !loadingBasicInfo) {
      // Update fields from API data if available
      // editableName is already set from API in the first useEffect
      setEditableProfile(userBasicInfo.profile || '');
      setOriginalProfile(userBasicInfo.profile || '');
      setEditableRole(userBasicInfo.role_name || '');
      setOriginalRole(userBasicInfo.role_name || '');
      // Password is not returned from API
      // Access scope rows are already set in the first useEffect - DO NOT CLEAR THEM
    }
  }, [user, isNewUser, isCopyMode, userBasicInfo, loadingBasicInfo]);

  // Clear access scope rows when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAccessScopeRows([]);
    }
  }, [isOpen]);
  
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

  // Load profiles list when modal opens or selectedNode changes
  // This ensures profiles are ready when user focuses on the input
  useEffect(() => {
    if (!isOpen) {
      profilesLoadedRef.current = false;
      setAvailableProfiles([]);
      return;
    }

    // Load profiles when modal opens (only once per modal session)
    if (!loadingProfiles && !profilesLoadedRef.current) {
      profilesLoadedRef.current = true;
      setLoadingProfiles(true);
      (async () => {
        try {
          const profiles = await usersAPI.getProfilesList(selectedNode);
          setAvailableProfiles(profiles || []);
        } catch (err) {
          console.error('Failed to load profiles list:', err);
          setAvailableProfiles([]);
        } finally {
          setLoadingProfiles(false);
        }
      })();
    }
  }, [isOpen, selectedNode, loadingProfiles]);

  // Load roles list when modal opens or selectedNode changes
  // This ensures roles are ready when user focuses on the input
  useEffect(() => {
    if (!isOpen) {
      rolesLoadedRef.current = false;
      setAvailableRoles([]);
      return;
    }

    // Load roles when modal opens (only once per modal session)
    if (!loadingRoles && !rolesLoadedRef.current) {
      rolesLoadedRef.current = true;
      setLoadingRoles(true);
      (async () => {
        try {
          const roles = await usersAPI.getRolesList(selectedNode);
          setAvailableRoles(roles || []);
        } catch (err) {
          console.error('Failed to load roles list:', err);
          setAvailableRoles([]);
        } finally {
          setLoadingRoles(false);
        }
      })();
    }
  }, [isOpen, selectedNode, loadingRoles]);

  // Load available settings list when modal opens (for Settings block input)
  useEffect(() => {
    if (!isOpen) {
      availableSettingsLoadedRef.current = false;
      setAvailableSettingsFromAPI([]);
      return;
    }

    if (!loadingAvailableSettings && !availableSettingsLoadedRef.current) {
      availableSettingsLoadedRef.current = true;
      setLoadingAvailableSettings(true);
      (async () => {
        try {
          const list = await usersAPI.getAvailableSettings(selectedNode);
          setAvailableSettingsFromAPI(list.map((s) => s.name));
        } catch (err) {
          console.error('Failed to load available settings list:', err);
          setAvailableSettingsFromAPI([]);
        } finally {
          setLoadingAvailableSettings(false);
        }
      })();
    }
  }, [isOpen, selectedNode, loadingAvailableSettings]);

  if (!isOpen || (!user && !isNewUser && !copyFromUser)) return null;


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

  const handleSave = async () => {
    // Prevent multiple simultaneous save operations
    if (isSaving || saveRequestRef.current) {
      return;
    }

    // Helper function to check for Cyrillic characters
    const containsCyrillic = (str: string): boolean => {
      return /[\u0400-\u04FF]/.test(str);
    };

    // Create a promise for this save operation
    const savePromise = (async () => {
      try {
        setIsSaving(true);

      // If it's a new user or copy-from user, create the user (POST)
      if (isNewUser || isCopyMode) {
        const trimmedName = editableName.trim();
        const trimmedPassword = editablePassword.trim();

        if (!trimmedName) {
          showError('User name is required');
          return;
        }

        if (!trimmedPassword) {
          showError('Password is required');
          return;
        }

        // Validate Cyrillic characters
        if (containsCyrillic(trimmedName)) {
          showError('User name cannot contain Cyrillic characters');
          return;
        }

        if (containsCyrillic(trimmedPassword)) {
          showError('Password cannot contain Cyrillic characters');
          return;
        }

        try {
          await usersAPI.createUser(trimmedName, trimmedPassword, selectedNode);
          
          // If profile is specified, update it after user creation
          const trimmedProfile = editableProfile.trim();
          if (trimmedProfile) {
            // Validate Cyrillic characters in profile
            if (containsCyrillic(trimmedProfile)) {
              showError('Profile name cannot contain Cyrillic characters');
              return;
            }
            
            try {
              await usersAPI.updateUserProfile(trimmedName, trimmedProfile, selectedNode);
              // Notification is shown automatically by api interceptor
            } catch (profileErr: any) {
              console.error('Failed to update user profile after creation:', profileErr);
              // Error notification is already shown by api interceptor
              return;
            }
          }

          // If role is specified, update it after user creation (and profile update if any)
          const trimmedRole = editableRole.trim();
          if (trimmedRole) {
            // Validate Cyrillic characters in role
            if (containsCyrillic(trimmedRole)) {
              showError('Role name cannot contain Cyrillic characters');
              return;
            }
            
            try {
              await usersAPI.updateUserRole(trimmedName, trimmedRole, selectedNode);
              // Notification is shown automatically by api interceptor
            } catch (roleErr: any) {
              console.error('Failed to update user role after creation:', roleErr);
              // Error notification is already shown by api interceptor
              return;
            }
          }

          // Save user settings from form (before access scopes)
          try {
            const settingsPayload = editableSettings.map((s) => ({ name: s.name, value: s.value }));
            await usersAPI.updateUserSettings(trimmedName, settingsPayload, selectedNode);
          } catch (settingsErr: any) {
            console.error('Failed to update user settings after creation:', settingsErr);
            return;
          }

          // Save access scopes from form (same as for existing user)
          if (accessScopeRows.length > 0) {
            try {
              const accessScopes = accessScopeRows.map((row) => ({
                database: row.database || '',
                table: row.table || '',
                column: row.column || '',
                permissions: row.permissions || [],
              }));
              await usersAPI.updateUserAccessScopes(trimmedName, accessScopes, selectedNode);
              success('Access scopes updated successfully');
            } catch (scopeErr: any) {
              console.error('Failed to update user access scopes after creation:', scopeErr);
              return;
            }
          }
          
          if (isCopyMode) {
            success(`User ${trimmedName} created successfully`);
          }
          if (onRefreshUsers) {
            onRefreshUsers();
          }
          onClose();
          return;
        } catch (err: any) {
          console.error('Failed to create user:', err);
          // Error notification is already shown by api interceptor
          return;
        }
      }

      // Determine the current user name (will be updated if name changes)
      let currentUserName = editableName.trim() || originalUserName;

      // Step 1: If name changed and it's not a new user, update the login
      if (editableName.trim() && editableName.trim() !== originalUserName) {
        // Validate Cyrillic characters
        const trimmedNewName = editableName.trim();
        if (containsCyrillic(trimmedNewName)) {
          showError('User name cannot contain Cyrillic characters');
          return;
        }

        try {
          await usersAPI.updateUserLogin(originalUserName, trimmedNewName, selectedNode);
          setOriginalUserName(trimmedNewName);
          currentUserName = trimmedNewName; // Update current user name after successful login update
          // Notification is shown automatically by api interceptor
        } catch (err: any) {
          console.error('Failed to update user login:', err);
          // Error notification is already shown by api interceptor
          return;
        }
      }

      // Step 2: If password changed and it's not a new user, update the password
      const trimmedPassword = editablePassword.trim();
      if (trimmedPassword) {
        // Validate Cyrillic characters in password
        if (containsCyrillic(trimmedPassword)) {
          showError('Password cannot contain Cyrillic characters');
          return;
        }

        try {
          await usersAPI.updateUserPassword(currentUserName, trimmedPassword, selectedNode);
          setEditablePassword(''); // Clear password field after successful update
          // Notification is shown automatically by api interceptor
        } catch (err: any) {
          console.error('Failed to update user password:', err);
          // Error notification is already shown by api interceptor
          return;
        }
      }

      // Step 3: If profile changed and it's not a new user, update the profile
      const trimmedProfile = editableProfile.trim();
      // Check if profile actually changed (handle both empty and non-empty cases)
      // Send update if profile changed, even if one of them is empty
      // Also check if profile update is already in progress to prevent duplicate calls
      if (trimmedProfile !== originalProfile && !profileUpdateInProgress && !profileUpdateRequestRef.current) {
        // Validate Cyrillic characters in profile (only if profile is not empty)
        if (trimmedProfile && containsCyrillic(trimmedProfile)) {
          showError('Profile name cannot contain Cyrillic characters');
          return;
        }

        // Create a promise for this profile update to prevent duplicate calls
        const profileUpdatePromise = (async () => {
          try {
            setProfileUpdateInProgress(true);
            await usersAPI.updateUserProfile(currentUserName, trimmedProfile, selectedNode);
            setOriginalProfile(trimmedProfile);
            // Notification is shown automatically by api interceptor
          } catch (err: any) {
            console.error('Failed to update user profile:', err);
            // Error notification is already shown by api interceptor
            throw err; // Re-throw to be caught by outer try-catch
          } finally {
            setProfileUpdateInProgress(false);
            profileUpdateRequestRef.current = null;
          }
        })();

        profileUpdateRequestRef.current = profileUpdatePromise;
        await profileUpdatePromise;
      }

      // Step 4: If role changed and it's not a new user, update the role
      const trimmedRole = editableRole.trim();
      // Normalize originalRole to handle null/undefined cases
      const normalizedOriginalRole = (originalRole || '').trim();
      // Check if role actually changed (handle both empty and non-empty cases)
      // Send update if role changed, even if one of them is empty
      // This handles both setting a role and removing a role (empty string)
      if (trimmedRole !== normalizedOriginalRole) {
        // Validate Cyrillic characters in role (only if role is not empty)
        if (trimmedRole && containsCyrillic(trimmedRole)) {
          showError('Role name cannot contain Cyrillic characters');
          return;
        }

        try {
          // Pass trimmedRole (which can be empty string to remove role)
          await usersAPI.updateUserRole(currentUserName, trimmedRole, selectedNode);
          setOriginalRole(trimmedRole);
          // Notification is shown automatically by api interceptor
        } catch (err: any) {
          console.error('Failed to update user role:', err);
          // Error notification is already shown by api interceptor
          return;
        }
      }

      // Step 5: Save user settings from form only if changed (ref is set after successful save)
      const settingsPayload = editableSettings.map((s) => ({ name: s.name, value: s.value }));
      if (!sameSettingsPayload(settingsPayload, initialSettingsRef.current)) {
        try {
          await usersAPI.updateUserSettings(currentUserName, settingsPayload, selectedNode);
          initialSettingsRef.current = settingsPayload.map((s) => ({ name: s.name, value: s.value }));
        } catch (err: any) {
          console.error('Failed to update user settings:', err);
          return;
        }
      }

      // Step 6: Save access scopes from form only if changed (ref is set after successful save)
      const accessScopes = accessScopeRows.map((row) => ({
        database: row.database || '',
        table: row.table || '',
        column: row.column || '',
        permissions: row.permissions || [],
      }));
      if (!sameAccessScopesPayload(accessScopes, initialAccessScopesRef.current)) {
        try {
          await usersAPI.updateUserAccessScopes(currentUserName, accessScopes, selectedNode);
          initialAccessScopesRef.current = accessScopes.map((s) => ({
            database: s.database,
            table: s.table,
            column: s.column,
            permissions: [...(s.permissions || [])],
          }));
          success('Access scopes updated successfully');
        } catch (err: any) {
          console.error('Failed to update user access scopes:', err);
          return;
        }
      }

      // Refresh users list once after all successful updates
      if (onRefreshUsers) {
        onRefreshUsers();
      }
      } catch (err) {
        console.error('Failed to save user details:', err);
        // Error notification is already shown by api interceptor with server response
        // Don't show duplicate notification here
      } finally {
        setIsSaving(false);
        saveRequestRef.current = null;
      }
    })();

    saveRequestRef.current = savePromise;
    await savePromise;
  };
  
  // Access Scope handlers
  const handleAddAccessScopeRow = () => {
    setAccessScopeRows([...accessScopeRows, {
      id: `row-${Date.now()}-${Math.random()}`,
      database: '',
      table: '',
      column: '',
      permissions: []
    }]);
  };
  
  const handleRemoveAccessScopeRow = (id: string) => {
    setAccessScopeRows(accessScopeRows.filter(row => row.id !== id));
  };
  
  const handleUpdateAccessScopeRow = (id: string, field: 'database' | 'table' | 'column', value: string) => {
    setAccessScopeRows(prevRows => {
      return prevRows.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      );
    });
  };

  const handleAddPermissionToRow = (id: string, permission: string) => {
    setAccessScopeRows(accessScopeRows.map(row => {
      if (row.id === id) {
        const permissions = row.permissions || [];
        if (!permissions.includes(permission)) {
          return { ...row, permissions: [...permissions, permission] };
        }
      }
      return row;
    }));
  };

  const handleRemovePermissionFromRow = (id: string, permission: string) => {
    setAccessScopeRows(accessScopeRows.map(row => {
      if (row.id === id) {
        const permissions = row.permissions || [];
        return { ...row, permissions: permissions.filter(p => p !== permission) };
      }
      return row;
    }));
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

  const handleConfirmDelete = async () => {
    if (!selectedNode) {
      showError('No node selected');
      return;
    }
    setIsDeleting(true);
    try {
      await usersAPI.deleteUser(editableName, selectedNode);
      success('User deleted successfully');
      setShowDeleteConfirm(false);
      onClose();
      onRefreshUsers?.();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err && typeof (err as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
        ? (err as { response: { data: { error: string } } }).response.data.error
        : 'Failed to delete user';
      showError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter suggestions based on input (use settings from API; show all when empty, like roles/profiles)
  const getSettingSuggestions = () => {
    const settings = availableSettingsFromAPI || [];
    const notYetAdded = settings.filter(s => !editableSettings.some(ed => ed.name === s));
    if (!newSetting || newSetting.length === 0) return notYetAdded;
    return notYetAdded.filter(setting =>
      setting.toLowerCase().includes(newSetting.toLowerCase())
    );
  };

  const getRoleSuggestions = () => {
    // Ensure availableRoles is always an array
    const roles = availableRoles || [];
    // If user hasn't typed anything, show all roles (for focus display)
    if (!newRole || newRole.length === 0) {
      return roles;
    }
    // If user has typed 1+ characters, filter roles
    return roles.filter(role => 
      role.toLowerCase().includes(newRole.toLowerCase())
    );
  };

  const getProfileSuggestions = () => {
    // Ensure availableProfiles is always an array
    const profiles = availableProfiles || [];
    // If user hasn't typed anything, show all profiles (for focus display)
    if (!newProfile || newProfile.length === 0) {
      return profiles;
    }
    // If user has typed 1+ characters, filter profiles
    return profiles.filter(profile => 
      profile.toLowerCase().includes(newProfile.toLowerCase())
    );
  };

  const settingSuggestions = getSettingSuggestions();
  const roleSuggestions = getRoleSuggestions();
  const profileSuggestions = getProfileSuggestions();

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
                {isCopyMode ? 'Copy User' : isNewUser ? 'New User' : editableName}
              </h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm mt-0.5`}>
                {isCopyMode ? `Create user from ${copyFromUser?.name || ''}` : isNewUser ? 'Create New User' : 'User Details'}
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

                {/* User ID (Read-only) - Hide for new/copy users */}
                {!isNewUser && !isCopyMode && (
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

                {/* Storage (Read-only) - Hide for new/copy users */}
                {!isNewUser && !isCopyMode && (
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

                {/* Profile and Role in one row */}
                <div className={`md:col-span-2 ${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Editable Profile */}
                    <div>
                      <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                        Profile
                      </label>
                      <AutocompleteInput
                        value={newProfile}
                        onChange={setNewProfile}
                        onAdd={(valueToAdd) => {
                          const profileValue = valueToAdd || newProfile;
                          if (profileValue.trim()) {
                            setEditableProfile(profileValue.trim());
                            setNewProfile('');
                          }
                        }}
                        suggestions={profileSuggestions}
                        placeholder="Enter profile..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newProfile.trim()) {
                              setEditableProfile(newProfile.trim());
                              setNewProfile('');
                            }
                          }
                        }}
                      />
                      
                      {/* Profile display */}
                      {editableProfile && (
                        <div className="mt-2">
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              theme === 'light'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            <span>{editableProfile}</span>
                            <button
                              onClick={() => setEditableProfile('')}
                              className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                theme === 'light'
                                  ? 'hover:bg-blue-200'
                                  : 'hover:bg-blue-500/30'
                              } transition-colors`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Editable Role */}
                    <div>
                      <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
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
                      
                      {/* Role display */}
                      {editableRole && (
                        <div className="mt-2">
                          <div
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                              theme === 'light'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-green-500/20 text-green-400 border border-green-500/30'
                            }`}
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
                        </div>
                      )}
                    </div>
                  </div>
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
                {/* User-level settings (editable below) and profile settings (read-only, cannot be changed) */}
                {userSettingsFromAPI && Object.keys(userSettingsFromAPI.user_settings).length > 0 && (
                  <div className="mb-4">
                    <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                      User-level settings
                    </label>
                    <div className={`rounded-lg border ${
                      theme === 'light' ? 'bg-white/50 border-gray-200' : 'bg-gray-900/30 border-gray-700/50'
                    } overflow-hidden`}>
                      {editableSettings.map((s) => (
                        <div
                          key={s.name}
                          className={`flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 ${
                            theme === 'light' ? 'border-gray-200' : 'border-gray-700/50'
                          }`}
                        >
                          <span className={`font-medium ${theme === 'light' ? 'text-amber-800' : 'text-yellow-400'}`}>{s.name}</span>
                          <span className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}>=</span>
                          <span className={theme === 'light' ? 'text-gray-800' : 'text-gray-200'}>{s.value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {userSettingsFromAPI && Object.keys(userSettingsFromAPI.profile_settings).length > 0 && (
                  <div className="mb-4">
                    <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                      From profile (read-only)
                    </label>
                    <div className={`rounded-lg border ${
                      theme === 'light' ? 'bg-white/50 border-gray-200' : 'bg-gray-900/30 border-gray-700/50'
                    } overflow-hidden`}>
                      {Object.entries(userSettingsFromAPI.profile_settings).map(([name, value]) => (
                        <div
                          key={name}
                          className={`flex items-center gap-2 px-3 py-2 text-sm border-b last:border-b-0 ${
                            theme === 'light' ? 'border-gray-200' : 'border-gray-700/50'
                          }`}
                        >
                          <span className={`font-medium ${theme === 'light' ? 'text-amber-800' : 'text-yellow-400'}`}>{name}</span>
                          <span className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}>=</span>
                          <span className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>{value || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                    placeholder={loadingAvailableSettings ? 'Loading settings...' : 'Select or enter setting name...'}
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

            {/* Access Scope */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Key className="w-5 h-5" />
                <h3 className="font-semibold">Access Scope</h3>
              </div>
              
              <CascadingAccessSelector
                rows={accessScopeRows}
                onAddRow={handleAddAccessScopeRow}
                onRemoveRow={handleRemoveAccessScopeRow}
                onUpdateRow={handleUpdateAccessScopeRow}
                onAddPermission={handleAddPermissionToRow}
                onRemovePermission={handleRemovePermissionFromRow}
                availablePermissions={availableGrants}
                selectedNode={selectedNode}
              />
            </div>
          </div>
        </div>

        {/* Footer with Action Buttons */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          {!isNewUser && !isCopyMode && (
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
          {!isNewUser && !isCopyMode && (
            <button
              onClick={() => {
                if (onCopyUser && user) {
                  onCopyUser(user);
                  onClose();
                } else {
                  handleCopy();
                }
              }}
              className={`px-6 py-2.5 rounded-lg border ${
                theme === 'light'
                  ? 'bg-white hover:bg-gray-50 border-gray-300 hover:border-amber-500/40 text-gray-700 hover:text-amber-700'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700 hover:border-yellow-500/30 text-gray-300 hover:text-yellow-400'
              } transition-all duration-200 flex items-center gap-2 font-medium`}
            >
              <Copy className="w-4 h-4" />
              {onCopyUser ? 'Copy user' : 'Copy'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-6 py-2.5 rounded-lg ${
              isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : theme === 'light'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
            } transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
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
                      <div className="relative">
                        <input
                          type={showCopyPassword ? 'text' : 'password'}
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
                        <button
                          onClick={() => setShowCopyPassword(!showCopyPassword)}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                            theme === 'light'
                              ? 'text-gray-400 hover:text-amber-500'
                              : 'text-gray-500 hover:text-yellow-500'
                          }`}
                        >
                          {showCopyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
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
        isConfirming={isDeleting}
      />
    </div>
  );
}