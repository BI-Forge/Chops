export interface LoginRequest {
  username: string
  password: string
  /** When true, server issues a token valid for 7 days; otherwise 1 day. */
  remember_me?: boolean
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
  /** System RBAC role id; omitted on older API responses until refresh. */
  role_id?: number
  /** System role name (e.g. admin, guest). */
  role_name?: string
}

