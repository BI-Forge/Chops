package models

// LoginRequest represents login request
type LoginRequest struct {
	Username string `json:"username" binding:"required" example:"admin"`
	Password string `json:"password" binding:"required" example:"password123"`
}

// RegisterRequest represents registration request
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50" example:"newuser"`
	Password string `json:"password" binding:"required,min=8" example:"securepass123"`
	Email    string `json:"email" binding:"required,email" example:"user@example.com"`
}

// TokenResponse represents JWT token response
type TokenResponse struct {
	Token     string `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	Type      string `json:"type" example:"Bearer"`
	ExpiresIn int64  `json:"expires_in" example:"3600"`
}

// ErrorResponse represents error response
type ErrorResponse struct {
	Error   string `json:"error" example:"Invalid credentials"`
	Message string `json:"message,omitempty" example:"The provided username or password is incorrect"`
}

// UserInfo represents user information
type UserInfo struct {
	ID       string `json:"id" example:"123e4567-e89b-12d3-a456-426614174000"`
	Username string `json:"username" example:"admin"`
	Email    string `json:"email" example:"admin@example.com"`
}
