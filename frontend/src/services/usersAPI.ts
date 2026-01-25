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

export const usersAPI = {
  getUsersList: async (node?: string): Promise<UserList[]> => {
    const params = node ? { node } : {}
    const response = await api.get<UsersListResponse>('/clickhouse/users/list', { params })
    return response.data.users
  },
  
  getUserBasicInfo: async (userName: string, node?: string): Promise<UserBasicInfo> => {
    const params: { name: string; node?: string } = { name: userName }
    if (node) params.node = node
    const response = await api.get<UserBasicInfo>('/clickhouse/users/basic-info', { params })
    return response.data
  },
}
