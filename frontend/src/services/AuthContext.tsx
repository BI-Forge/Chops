import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI } from './api'
import type { UserInfo } from '../types/auth'

interface AuthContextType {
  user: UserInfo | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('token')
      if (storedToken) {
        try {
          // Try to get user info, but don't block page load for too long
          const userInfo = await authAPI.getUserInfo()
          setUser(userInfo)
          setToken(storedToken)
        } catch (error) {
          // Silently fail if token is invalid or API is unavailable
          // Don't block page load - just remove invalid token
          localStorage.removeItem('token')
          setToken(null)
        }
      }
      // Always set loading to false quickly to unblock rendering
      setLoading(false)
    }

    // Set loading to false immediately if no token
    if (!localStorage.getItem('token')) {
      setLoading(false)
    } else {
      loadUser()
    }
  }, [])

  const login = async (username: string, password: string) => {
    const response = await authAPI.login({ username, password })
    localStorage.setItem('token', response.token)
    setToken(response.token)
    const userInfo = await authAPI.getUserInfo()
    setUser(userInfo)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

