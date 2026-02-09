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
}
