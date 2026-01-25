import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { LoginRequest, RegisterRequest, TokenResponse, UserInfo } from '../types/auth'
import { alertUtils } from '../utils/alertUtils'

// Extend AxiosRequestConfig to include retry properties
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _retry?: boolean;
}

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
  async (error: AxiosError) => {
    const config = (error.config || {}) as ExtendedAxiosRequestConfig
    const retryCount = config._retryCount ?? 0

    // Handle client errors (4xx) - don't retry, show error immediately
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      const errorMessage = (error.response.data as any)?.message || 'Error';
      const statusText = error.response.statusText || `Error ${error.response.status}`;
      alertUtils.error(statusText, errorMessage, 5000);
      return Promise.reject(error)
    }

    // Handle server errors (5xx) - retry up to 3 times
    if (error.response && error.response.status >= 500) {
      if (retryCount < 3) {
        // Retry with exponential backoff
        config._retryCount = retryCount + 1
        config._retry = true
        const delay = 500 * Math.pow(2, retryCount)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return api(config)
      } else {
        // All retries exhausted, show error
        const errorMessage = (error.response.data as any)?.message || 'Error';
        const statusText = error.response.statusText || `Error ${error.response.status}`;
        alertUtils.error(statusText, errorMessage, 5000);
        return Promise.reject(error)
      }
    }

    // Handle network errors, timeouts - retry up to 3 times
    if (error.code === 'ECONNABORTED' || !error.response) {
      if (retryCount < 3) {
        // Retry with exponential backoff
        config._retryCount = retryCount + 1
        config._retry = true
        const delay = 500 * Math.pow(2, retryCount)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return api(config)
      } else {
        // All retries exhausted, show error
        alertUtils.error('Network Error', 'Error', 5000);
        return Promise.reject(error)
      }
    }

    // Fallback for any other errors
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

