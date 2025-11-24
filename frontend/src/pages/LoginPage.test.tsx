import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import { AuthProvider } from '../services/AuthContext'
import * as api from '../services/api'

// Mock the API
vi.mock('../services/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    getUserInfo: vi.fn(),
  },
}))

const renderLoginPage = () => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </AuthProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders login form by default', () => {
    renderLoginPage()
    
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your username or email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('switches to register tab', () => {
    renderLoginPage()
    
    const registerTab = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerTab)
    
    expect(screen.getByText('Create an account')).toBeInTheDocument()
    expect(screen.getByText('Sign up to get started')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument()
  })

  it('validates login form fields', async () => {
    renderLoginPage()
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    })
  })

  it('handles login with username', async () => {
    const mockLogin = vi.mocked(api.authAPI.login).mockResolvedValue({
      token: 'test-token',
      type: 'Bearer',
      expires_in: 3600,
    })

    vi.mocked(api.authAPI.getUserInfo).mockResolvedValue({
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    })

    renderLoginPage()
    
    const usernameInput = screen.getByPlaceholderText(/Enter your username or email/i)
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
      })
    })
  })

  it('validates register form fields', async () => {
    renderLoginPage()
    
    const registerTab = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerTab)
    
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument()
    })
  })

  it('validates password length on register', async () => {
    renderLoginPage()
    
    const registerTab = screen.getByRole('button', { name: /register/i })
    fireEvent.click(registerTab)
    
    const usernameInput = screen.getByPlaceholderText(/Enter your username/i)
    const emailInput = screen.getByPlaceholderText(/name@company.com/i)
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i)
    const submitButton = screen.getByRole('button', { name: /sign up/i })
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'short' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })
  })

  it('handles login error', async () => {
    const mockLogin = vi.mocked(api.authAPI.login).mockRejectedValue({
      response: {
        data: {
          error: 'Invalid credentials',
        },
      },
    })

    renderLoginPage()
    
    const usernameInput = screen.getByPlaceholderText(/Enter your username or email/i)
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('handles email input in login form', () => {
    renderLoginPage()
    
    const input = screen.getByPlaceholderText(/Enter your username or email/i)
    fireEvent.change(input, { target: { value: 'test@example.com' } })
    
    expect(input).toHaveValue('test@example.com')
  })

  it('toggles remember me checkbox', () => {
    renderLoginPage()
    
    const checkbox = screen.getByLabelText(/remember me/i) as HTMLInputElement
    expect(checkbox.checked).toBe(false)
    
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
  })
})

