package repository

import (
	"errors"
	"fmt"

	"clickhouse-ops/internal/db"
	"clickhouse-ops/internal/db/models"

	"gorm.io/gorm"
)

// RBACRepository persists roles, permissions, and role–permission links for system users.
type RBACRepository struct {
	db *gorm.DB
}

// NewRBACRepository creates an RBAC repository using the shared PostgreSQL connection.
func NewRBACRepository() (*RBACRepository, error) {
	gormDB, err := db.GetPostgresConnection()
	if err != nil {
		return nil, fmt.Errorf("failed to obtain postgres connection: %w", err)
	}

	return &RBACRepository{db: gormDB}, nil
}

// NewRBACRepositoryWithDB creates an RBAC repository with a custom DB (primarily for tests).
func NewRBACRepositoryWithDB(database *gorm.DB) *RBACRepository {
	return &RBACRepository{db: database}
}

// ListPermissionNamesForUser returns distinct permission codes granted through the user's role.
func (r *RBACRepository) ListPermissionNamesForUser(userID int) ([]string, error) {
	var names []string
	err := r.db.Model(&models.Permission{}).
		Joins("JOIN role_permissions rp ON rp.permission_id = permissions.id").
		Joins("JOIN users u ON u.role_id = rp.role_id").
		Where("u.id = ?", userID).
		Distinct().
		Order("permissions.name").
		Pluck("permissions.name", &names).Error
	if err != nil {
		return nil, fmt.Errorf("list permissions for user: %w", err)
	}
	return names, nil
}

// CreateRole inserts a new role with no permissions.
func (r *RBACRepository) CreateRole(name, description string) (*models.Role, error) {
	role := &models.Role{Name: name, Description: description}
	if err := r.db.Create(role).Error; err != nil {
		return nil, fmt.Errorf("create role: %w", err)
	}
	return role, nil
}

// GetRoleByID returns a role and its permissions.
func (r *RBACRepository) GetRoleByID(id int) (*models.Role, error) {
	var role models.Role
	if err := r.db.Preload("Permissions", func(db *gorm.DB) *gorm.DB {
		return db.Order("permissions.name")
	}).First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("role not found")
		}
		return nil, fmt.Errorf("get role: %w", err)
	}
	return &role, nil
}

// ListRoles returns all roles ordered by name (permissions not loaded).
func (r *RBACRepository) ListRoles() ([]models.Role, error) {
	var roles []models.Role
	if err := r.db.Order("name").Find(&roles).Error; err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	return roles, nil
}

// SetRolePermissions replaces all permissions linked to the role.
func (r *RBACRepository) SetRolePermissions(roleID int, permissionIDs []int) error {
	var roleCount int64
	if err := r.db.Model(&models.Role{}).Where("id = ?", roleID).Count(&roleCount).Error; err != nil {
		return fmt.Errorf("check role: %w", err)
	}
	if roleCount == 0 {
		return errors.New("role not found")
	}

	if len(permissionIDs) > 0 {
		var permCount int64
		if err := r.db.Model(&models.Permission{}).Where("id IN ?", permissionIDs).Count(&permCount).Error; err != nil {
			return fmt.Errorf("check permissions: %w", err)
		}
		if int(permCount) != len(permissionIDs) {
			return errors.New("one or more permission ids are invalid")
		}
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID).Error; err != nil {
			return fmt.Errorf("clear role permissions: %w", err)
		}
		for _, pid := range permissionIDs {
			if err := tx.Exec("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", roleID, pid).Error; err != nil {
				return fmt.Errorf("assign permission %d: %w", pid, err)
			}
		}
		return nil
	})
}

// AssignUserRole sets the user's system role (exactly one).
func (r *RBACRepository) AssignUserRole(userID, roleID int) error {
	var roleCount int64
	if err := r.db.Model(&models.Role{}).Where("id = ?", roleID).Count(&roleCount).Error; err != nil {
		return fmt.Errorf("check role: %w", err)
	}
	if roleCount == 0 {
		return errors.New("role not found")
	}

	res := r.db.Model(&models.User{}).Where("id = ?", userID).Update("role_id", roleID)
	if res.Error != nil {
		return fmt.Errorf("assign user role: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}

// ListPermissions returns all permissions, optionally filtered to those linked to roleID.
func (r *RBACRepository) ListPermissions(roleID *int) ([]models.Permission, error) {
	q := r.db.Model(&models.Permission{})
	if roleID != nil {
		q = q.Joins("JOIN role_permissions rp ON rp.permission_id = permissions.id AND rp.role_id = ?", *roleID)
	}
	var list []models.Permission
	if err := q.Order("permissions.name").Find(&list).Error; err != nil {
		return nil, fmt.Errorf("list permissions: %w", err)
	}
	return list, nil
}
