import api from './api'

export interface UserList {
  name: string
  id: string
  profile: string
  storage: string
  role_name: string
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
}
