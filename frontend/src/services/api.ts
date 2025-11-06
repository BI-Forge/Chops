import axios from 'axios'
import type { LoginRequest, RegisterRequest, TokenResponse, UserInfo } from '../types/auth'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Add retry interceptor for network errors and timeouts
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {}

    // Don't retry if already retried or if it's a client error (4xx)
    if (config._retryCount >= 3 || (error.response && error.response.status >= 400 && error.response.status < 500)) {
      return Promise.reject(error)
    }

    // Retry on network errors, timeouts, or server errors (5xx)
    if (error.code === 'ECONNABORTED' || !error.response || (error.response && error.response.status >= 500)) {
      config._retryCount = (config._retryCount || 0) + 1
      config._retry = true

      // Exponential backoff: 500ms, 1000ms, 2000ms
      const delay = 500 * Math.pow(2, config._retryCount - 1)
      
      await new Promise((resolve) => setTimeout(resolve, delay))
      return api(config)
    }

    return Promise.reject(error)
  }
)

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

