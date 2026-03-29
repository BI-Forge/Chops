package system

// ErrorResponse represents error response
type ErrorResponse struct {
	Error   string `json:"error" example:"Invalid credentials"`
	Message string `json:"message,omitempty" example:"The provided username or password is incorrect"`
}
