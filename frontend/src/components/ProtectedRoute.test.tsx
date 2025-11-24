import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthProvider } from '../services/AuthContext'
import * as authAPI from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    getUserInfo: vi.fn(),
  },
}))

const TestComponent = () => <div>Protected Content</div>

const renderWithProviders = (isAuthenticated: boolean, loading: boolean = false) => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(() => (isAuthenticated ? 'test-token' : null)),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })

  // Mock API response
  if (isAuthenticated && !loading) {
    vi.mocked(authAPI.authAPI.getUserInfo).mockResolvedValue({
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    })
  } else {
    vi.mocked(authAPI.authAPI.getUserInfo).mockRejectedValue(new Error('Unauthorized'))
  }

  return render(
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </BrowserRouter>
    </AuthProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when auth is loading', async () => {
    renderWithProviders(false, true)
    
    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  it('redirects to login when not authenticated', async () => {
    renderWithProviders(false, false)
    
    // Should redirect, so protected content should not be visible
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })
  })

  it('renders children when authenticated', async () => {
    renderWithProviders(true, false)
    
    // Wait for auth to resolve
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

