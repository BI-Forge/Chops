import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authAPI } from './api'
import type { LoginRequest, RegisterRequest, TokenResponse, UserInfo } from '../types/auth'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  }
})

const mockedAxios = vi.mocked(axios)

describe('authAPI', () => {
  let mockAxiosInstance: any

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any)
  })

  describe('login', () => {
    it('calls login endpoint with correct data', async () => {
      const mockResponse: TokenResponse = {
        token: 'test-token',
        type: 'Bearer',
        expires_in: 3600,
      }

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse })

      const loginData: LoginRequest = {
        username: 'testuser',
        password: 'password123',
      }

      const result = await authAPI.login(loginData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', loginData)
      expect(result).toEqual(mockResponse)
    })

    it('handles login error', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Invalid credentials'))

      const loginData: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword',
      }

      await expect(authAPI.login(loginData)).rejects.toThrow()
    })
  })

  describe('register', () => {
    it('calls register endpoint with correct data', async () => {
      const mockResponse: TokenResponse = {
        token: 'test-token',
        type: 'Bearer',
        expires_in: 3600,
      }

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse })

      const registerData: RegisterRequest = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
      }

      const result = await authAPI.register(registerData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', registerData)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getUserInfo', () => {
    it('calls getUserInfo endpoint and returns user data', async () => {
      const mockUser: UserInfo = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockUser })

      const result = await authAPI.getUserInfo()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockUser)
    })
  })
})

