import api from './api'

export interface UserList {
  name: string
  id: string
  profile: string
  storage: string
  role_name: string
  grants: string[]
}

export interface UserBasicInfo {
  name: string
  id: string
  profile: string
  user_settings: string[]
  profile_settings: Record<string, string>
  storage: string
  role_name: string
  scope: string
  grants: string[]
}

export interface UsersListResponse {
  users: UserList[]
}

export interface UpdateUserLoginRequest {
  old_name: string
  new_name: string
}

export interface UpdateUserLoginResponse {
  message: string
  old_name: string
  new_name: string
}

export interface CreateUserRequest {
  name: string
  password: string
}

export interface CreateUserResponse {
  message: string
  name: string
}

export interface DeleteUserResponse {
  message: string
  name: string
}

export interface UpdateUserPasswordRequest {
  user_name: string
  password: string
}

export interface UpdateUserPasswordResponse {
  message: string
  user_name: string
}

export interface UpdateUserProfileRequest {
  user_name: string
  profile_name: string
}

export interface UpdateUserProfileResponse {
  message: string
  user_name: string
  profile_name: string
}

export interface ProfilesListResponse {
  profiles: string[]
}

export interface RolesListResponse {
  roles: string[]
}

export interface AccessScope {
  database: string
  table: string
  column: string
  permissions: string[]
}

export interface AccessScopeListResponse {
  access_scopes: AccessScope[]
}

// API returns string[] for schemas/columns (backend: /clickhouse/schemas|columns/list)
export interface SchemasListResponse {
  schemas: string[]
}

export interface TablesListItem {
  uuid: string
  name: string
  database: string
  engine: string
  rows: number
  parts: number
  active_parts: number
  bytes: string
  size_bytes: number
}

export interface TablesListResponse {
  tables: TablesListItem[]
  total?: number
  limit?: number
  offset?: number
}

export interface ColumnsListResponse {
  columns: string[]
}

export interface AvailableSetting {
  name: string
  type: string
  default: string
  description: string
  min?: string
  max?: string
}

export interface AvailableSettingsResponse {
  settings: AvailableSetting[]
}

export interface UserSettingItem {
  name: string
  value: string
}

export interface UpdateUserSettingsRequest {
  user_name: string
  settings: UserSettingItem[]
}

export interface UserSettingsResponse {
  user_name: string
  user_settings: Record<string, string>
  profile_settings: Record<string, string>
}

export interface UpdateUserRoleRequest {
  user_name: string
  role_name: string
}

export interface UpdateUserRoleResponse {
  message: string
  user_name: string
  role_name: string
}

export const usersAPI = {
  getUsersList: async (node?: string): Promise<UserList[]> => {
    const params = node ? { node } : {}
    const response = await api.get<UsersListResponse>('/clickhouse/users/list', { params })
    return response.data.users
  },
  
  getUserBasicInfo: async (userName: string, node?: string): Promise<UserBasicInfo> => {
    const params: { name: string; node?: string } = { name: userName }
    if (node) params.node = node
    const response = await api.get<UserBasicInfo>('/clickhouse/users/details', { params })
    return response.data
  },

  updateUserLogin: async (oldName: string, newName: string, node?: string): Promise<UpdateUserLoginResponse> => {
    const params = node ? { node } : {}
    const response = await api.put<UpdateUserLoginResponse>('/clickhouse/users/rename', {
      old_name: oldName,
      new_name: newName
    }, { params })
    return response.data
  },

  createUser: async (name: string, password: string, node?: string): Promise<CreateUserResponse> => {
    const params = node ? { node } : {}
    const response = await api.post<CreateUserResponse>('/clickhouse/users', {
      name,
      password
    }, { params })
    return response.data
  },

  deleteUser: async (userName: string, node?: string): Promise<DeleteUserResponse> => {
    const params: { node?: string; name: string } = { name: userName }
    if (node) params.node = node
    const response = await api.delete<DeleteUserResponse>('/clickhouse/users', { params })
    return response.data
  },

  updateUserPassword: async (userName: string, password: string, node?: string): Promise<UpdateUserPasswordResponse> => {
    const params = node ? { node } : {};
    const requestBody: UpdateUserPasswordRequest = { user_name: userName, password: password };
    const response = await api.put<UpdateUserPasswordResponse>('/clickhouse/users/password', requestBody, { params });
    return response.data;
  },

  updateUserProfile: async (userName: string, profileName: string, node?: string): Promise<UpdateUserProfileResponse> => {
    const params = node ? { node } : {};
    const requestBody: UpdateUserProfileRequest = { user_name: userName, profile_name: profileName };
    // Disable retry for profile updates to prevent multiple requests
    const response = await api.put<UpdateUserProfileResponse>('/clickhouse/users/profile', requestBody, { 
      params,
      // Mark request to skip retry logic
      _skipRetry: true 
    } as any);
    return response.data;
  },

  getProfilesList: async (node?: string): Promise<string[]> => {
    const params = node ? { node } : {}
    const response = await api.get<ProfilesListResponse>('/clickhouse/profiles/list', { params })
    return response.data?.profiles || []
  },

  getRolesList: async (node?: string): Promise<string[]> => {
    const params = node ? { node } : {}
    const response = await api.get<RolesListResponse>('/clickhouse/roles/list', { params })
    return response.data?.roles || []
  },

  updateUserRole: async (userName: string, roleName: string, node?: string): Promise<UpdateUserRoleResponse> => {
    const params = node ? { node } : {};
    const requestBody: UpdateUserRoleRequest = { user_name: userName, role_name: roleName };
    // Disable retry for role updates to prevent multiple requests
    const response = await api.put<UpdateUserRoleResponse>('/clickhouse/users/role', requestBody, { 
      params,
      // Mark request to skip retry logic
      _skipRetry: true 
    } as any);
    return response.data;
  },

  getUserAccessScopes: async (userName: string, node?: string): Promise<AccessScope[]> => {
    const params: { user_name: string; node?: string } = { user_name: userName }
    if (node) params.node = node
    const response = await api.get<AccessScopeListResponse>('/clickhouse/access-scope', { params })
    return response.data?.access_scopes || []
  },

  /** Replaces all access scopes for the user (same request/response shape as getUserAccessScopes). */
  updateUserAccessScopes: async (userName: string, accessScopes: AccessScope[], node?: string): Promise<AccessScope[]> => {
    const params = node ? { node } : {}
    const response = await api.put<AccessScopeListResponse>('/clickhouse/access-scope', {
      user_name: userName,
      access_scopes: accessScopes,
    }, { params })
    return response.data?.access_scopes || []
  },

  getSchemasList: async (node?: string, name?: string): Promise<string[]> => {
    const params: { node?: string; name?: string } = {}
    if (node) params.node = node
    if (name) params.name = name
    const response = await api.get<SchemasListResponse>('/clickhouse/schemas/list', { params })
    const raw = response.data?.schemas || []
    return raw.filter((s): s is string => typeof s === 'string' && s.length > 0)
  },

  getTablesList: async (node?: string, schema?: string, name?: string): Promise<string[]> => {
    const params: { node?: string; schema?: string; name?: string; limit?: number } = { limit: 500 }
    if (node) params.node = node
    if (schema) params.schema = schema
    if (name) params.name = name
    const response = await api.get<TablesListResponse>('/clickhouse/tables/list', { params })
    const raw = response.data?.tables || []
    return raw.map((t) => t.name).filter((n) => typeof n === 'string' && n.length > 0)
  },

  getColumnsList: async (node?: string, schema?: string, table?: string, name?: string): Promise<string[]> => {
    const params: { node?: string; schema?: string; table?: string; name?: string } = {}
    if (node) params.node = node
    if (schema) params.schema = schema
    if (table) params.table = table
    if (name) params.name = name
    const response = await api.get<ColumnsListResponse>('/clickhouse/columns/list', { params })
    const raw = response.data?.columns || []
    return raw.filter((c): c is string => typeof c === 'string' && c.length > 0)
  },

  getUserSettings: async (userName: string, node?: string): Promise<UserSettingsResponse> => {
    const params: { user_name: string; node?: string } = { user_name: userName }
    if (node) params.node = node
    const response = await api.get<UserSettingsResponse>('/clickhouse/settings', { params })
    return response.data
  },

  getAvailableSettings: async (node?: string): Promise<AvailableSetting[]> => {
    const params = node ? { node } : {}
    const response = await api.get<AvailableSettingsResponse>('/clickhouse/settings/available', { params })
    return response.data?.settings ?? []
  },

  updateUserSettings: async (userName: string, settings: UserSettingItem[], node?: string): Promise<UserSettingsResponse> => {
    const params = node ? { node } : {}
    const response = await api.put<UserSettingsResponse>('/clickhouse/settings', {
      user_name: userName,
      settings,
    }, { params })
    return response.data
  },
}
