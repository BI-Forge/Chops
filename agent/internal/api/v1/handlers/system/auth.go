package system

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"clickhouse-ops/internal/api/auth"
	apiSystemModels "clickhouse-ops/internal/api/v1/models/system"
	"clickhouse-ops/internal/db/repository"
	"clickhouse-ops/internal/logger"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	jwtManager     *auth.JWTManager
	userRepository *repository.UserRepository
	logger         *logger.Logger
}

// NewAuthHandler creates a new auth handler backed by the shared user repository.
func NewAuthHandler(jwtManager *auth.JWTManager, appLogger *logger.Logger) (*AuthHandler, error) {
	userRepo, err := repository.NewUserRepository()
	if err != nil {
		return nil, fmt.Errorf("failed to create user repository: %w", err)
	}

	return &AuthHandler{
		jwtManager:     jwtManager,
		userRepository: userRepo,
		logger:         appLogger,
	}, nil
}

// Login handles user login
// @Summary      User login
// @Description  Authenticate user and return JWT token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        credentials  body      models.LoginRequest  true  "Login credentials"
// @Success      200          {object}  models.TokenResponse
// @Failure      400          {object}  models.ErrorResponse
// @Failure      401          {object}  models.ErrorResponse
// @Router       /api/v1/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req apiSystemModels.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Get user from database
	user, err := h.userRepository.GetUserByUsername(req.Username)
	if err != nil {
		h.logger.Warningf("Login attempt for non-existent user: %s", req.Username)
		c.JSON(http.StatusUnauthorized, apiSystemModels.ErrorResponse{
			Error:   "Invalid credentials",
			Message: "Username or password is incorrect",
		})
		return
	}

	// Check if user is active
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, apiSystemModels.ErrorResponse{
			Error:   "Account disabled",
			Message: "Your account has been disabled",
		})
		return
	}

	// Verify password
	if !h.userRepository.VerifyPassword(user, req.Password) {
		h.logger.Warningf("Invalid password attempt for user: %s", req.Username)
		c.JSON(http.StatusUnauthorized, apiSystemModels.ErrorResponse{
			Error:   "Invalid credentials",
			Message: "Username or password is incorrect",
		})
		return
	}

	// Generate JWT token (no roles)
	token, err := h.jwtManager.GenerateToken(strconv.Itoa(user.ID), user.Username, []string{})
	if err != nil {
		h.logger.Errorf("Failed to generate token: %v", err)
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Internal server error",
			Message: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusOK, apiSystemModels.TokenResponse{
		Token:     token,
		Type:      "Bearer",
		ExpiresIn: int64(h.jwtManager.GetTokenDuration().Seconds()),
	})
}

// Register handles user registration
// @Summary      User registration
// @Description  Register a new user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        user  body      models.RegisterRequest  true  "User registration data"
// @Success      201   {object}  models.TokenResponse
// @Failure      400   {object}  models.ErrorResponse
// @Failure      409   {object}  models.ErrorResponse
// @Router       /api/v1/auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req apiSystemModels.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, apiSystemModels.ErrorResponse{
			Error:   "Invalid request",
			Message: err.Error(),
		})
		return
	}

	// Check if user already exists
	exists, err := h.userRepository.UserExists(req.Username, req.Email)
	if err != nil {
		h.logger.Errorf("Failed to check user existence: %v", err)
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Internal server error",
			Message: "Failed to check user existence",
		})
		return
	}

	if exists {
		c.JSON(http.StatusConflict, apiSystemModels.ErrorResponse{
			Error:   "User already exists",
			Message: "A user with this username or email already exists",
		})
		return
	}

	// Create user
	user, err := h.userRepository.CreateUser(req.Username, req.Email, req.Password)
	if err != nil {
		h.logger.Errorf("Failed to create user: %v", err)
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Internal server error",
			Message: "Failed to create user",
		})
		return
	}

	// Generate JWT token (no roles)
	token, err := h.jwtManager.GenerateToken(strconv.Itoa(user.ID), user.Username, []string{})
	if err != nil {
		h.logger.Errorf("Failed to generate token: %v", err)
		c.JSON(http.StatusInternalServerError, apiSystemModels.ErrorResponse{
			Error:   "Internal server error",
			Message: "Failed to generate token",
		})
		return
	}

	c.JSON(http.StatusCreated, apiSystemModels.TokenResponse{
		Token:     token,
		Type:      "Bearer",
		ExpiresIn: int64(24 * time.Hour.Seconds()), // 24 hours default
	})
}

// GetUserInfo returns current user information
// @Summary      Get current user info
// @Description  Get information about the currently authenticated user
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  models.UserInfo
// @Failure      401  {object}  models.ErrorResponse
// @Router       /api/v1/auth/me [get]
func (h *AuthHandler) GetUserInfo(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, apiSystemModels.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	userID, err := strconv.Atoi(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusUnauthorized, apiSystemModels.ErrorResponse{
			Error: "Invalid user ID",
		})
		return
	}

	// Get user from database
	user, err := h.userRepository.GetUserByID(userID)
	if err != nil {
		h.logger.Errorf("Failed to get user: %v", err)
		c.JSON(http.StatusNotFound, apiSystemModels.ErrorResponse{
			Error:   "User not found",
			Message: "The authenticated user was not found in the database",
		})
		return
	}

	c.JSON(http.StatusOK, apiSystemModels.UserInfo{
		ID:       strconv.Itoa(user.ID),
		Username: user.Username,
		Email:    user.Email,
	})
}
