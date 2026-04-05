package repository

import (
	"errors"
	"fmt"

	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/db/models"
	"clickhouse-ops/internal/rbac"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRepository handles database operations for users
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository using the shared PostgreSQL connection.
func NewUserRepository() (*UserRepository, error) {
	gormDB, err := db.GetPostgresConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain postgres connection: %w", err)
	}

	return &UserRepository{db: gormDB}, nil
}

// NewUserRepositoryWithDB creates a user repository with a custom database connection (primarily for tests).
func NewUserRepositoryWithDB(database *gorm.DB) *UserRepository {
	return &UserRepository{db: database}
}

// CreateUser creates a user; the first user in the database gets role admin, all later users get guest.
func (r *UserRepository) CreateUser(username, email, password string) (*models.User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	var userCount int64
	if err := r.db.Model(&models.User{}).Count(&userCount).Error; err != nil {
		return nil, fmt.Errorf("count users: %w", err)
	}

	roleName := rbac.RoleNameGuest
	if userCount == 0 {
		roleName = rbac.RoleNameAdmin
	}

	var role models.Role
	if err := r.db.Where("name = ?", roleName).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("role %q not found: %w", roleName, err)
		}
		return nil, fmt.Errorf("resolve role %q: %w", roleName, err)
	}

	user := &models.User{
		Username:     username,
		Email:        email,
		PasswordHash: string(hashedPassword),
		IsActive:     true,
		RoleID:       role.ID,
	}

	if err := r.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetUserByUsername retrieves a user by username
func (r *UserRepository) GetUserByUsername(username string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetUserByID retrieves a user by ID and their assigned system role.
func (r *UserRepository) GetUserByID(id int) (*models.User, error) {
	var user models.User
	if err := r.db.Preload("Role").First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// VerifyPassword verifies a password against the stored hash
func (r *UserRepository) VerifyPassword(user *models.User, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	return err == nil
}

// UserExists checks if a user with the given username or email exists
func (r *UserRepository) UserExists(username, email string) (bool, error) {
	var count int64
	if err := r.db.Model(&models.User{}).
		Where("username = ? OR email = ?", username, email).
		Count(&count).Error; err != nil {
		return false, fmt.Errorf("failed to check user existence: %w", err)
	}
	return count > 0, nil
}
