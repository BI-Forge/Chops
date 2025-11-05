import axios from 'axios'
import type { LoginRequest, RegisterRequest, TokenResponse, UserInfo } from '../types/auth'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register', data)
    return response.data
  },

  getUserInfo: async (): Promise<UserInfo> => {
    const response = await api.get<UserInfo>('/auth/me')
    return response.data
  },
}

export default api

