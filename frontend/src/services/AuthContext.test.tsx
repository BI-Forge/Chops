import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'
import * as authAPI from './api'
import { ReactNode } from 'react'

// Mock the API
vi.mock('./api', () => ({
  authAPI: {
    login: vi.fn(),
    getUserInfo: vi.fn(),
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('provides initial state when no token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.token).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('loads user info when token exists', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    }

    localStorage.setItem('token', 'test-token')
    vi.mocked(authAPI.authAPI.getUserInfo).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.token).toBe('test-token')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
    })
  })

  it('removes invalid token on getUserInfo error', async () => {
    localStorage.setItem('token', 'invalid-token')
    vi.mocked(authAPI.authAPI.getUserInfo).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.token).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  it('handles login successfully', async () => {
    const mockTokenResponse = {
      token: 'new-token',
      type: 'Bearer',
      expires_in: 3600,
    }

    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    }

    vi.mocked(authAPI.authAPI.login).mockResolvedValue(mockTokenResponse)
    vi.mocked(authAPI.authAPI.getUserInfo).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login('testuser', 'password123')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.token).toBe('new-token')
    expect(result.current.user).toEqual(mockUser)
    expect(localStorage.getItem('token')).toBe('new-token')
  })

  it('handles logout', async () => {
    localStorage.setItem('token', 'test-token')
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    }

    vi.mocked(authAPI.authAPI.getUserInfo).mockResolvedValue(mockUser)

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.token).toBeNull()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })
})

