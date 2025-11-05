export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
  email: string
}

export interface TokenResponse {
  token: string
  type: string
  expires_in: number
}

export interface ErrorResponse {
  error: string
  message?: string
}

export interface UserInfo {
  id: string
  username: string
  email: string
}

