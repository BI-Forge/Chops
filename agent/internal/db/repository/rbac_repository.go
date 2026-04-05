package repository

import (
	"errors"
	"fmt"
	"time"

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

// RoleListRow is a role with user and permission counts (subqueries avoid join fan-out).
type RoleListRow struct {
	ID               int
	Name             string
	Description      string
	IsSystem         bool      `gorm:"column:is_system"`
	CreatedAt        time.Time `gorm:"column:created_at"`
	UsersCount       int64     `gorm:"column:users_count"`
	PermissionsCount int64     `gorm:"column:permissions_count"`
}

// ListRoles returns roles ordered by name with user and permission counts.
func (r *RBACRepository) ListRoles() ([]RoleListRow, error) {
	var rows []RoleListRow
	err := r.db.Table("roles").
		Select(`roles.id, roles.name, roles.description, roles.is_system, roles.created_at,
			(SELECT COUNT(*) FROM users WHERE users.role_id = roles.id) AS users_count,
			(SELECT COUNT(*) FROM role_permissions WHERE role_permissions.role_id = roles.id) AS permissions_count`).
		Order("roles.name").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	return rows, nil
}

// SystemUserAdminRow is an application user row for admin listing.
type SystemUserAdminRow struct {
	ID          int
	Username    string
	Email       string
	FirstName   *string
	LastName    *string
	IsActive    bool
	CreatedAt   time.Time
	RoleID      int
	RoleName    string
	Permissions []string
}

// ListSystemUsers returns all application users with role names and permission codes from the role.
func (r *RBACRepository) ListSystemUsers() ([]SystemUserAdminRow, error) {
	type userScan struct {
		ID        int
		Username  string
		Email     string
		FirstName *string
		LastName  *string
		IsActive  bool
		CreatedAt time.Time
		RoleID    int
		RoleName  string `gorm:"column:role_name"`
	}
	var users []userScan
	if err := r.db.Table("users").
		Select("users.id, users.username, users.email, users.first_name, users.last_name, users.is_active, users.created_at, users.role_id, roles.name AS role_name").
		Joins("JOIN roles ON roles.id = users.role_id").
		Order("users.username").
		Scan(&users).Error; err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}

	var links []struct {
		RoleID int    `gorm:"column:role_id"`
		Name   string `gorm:"column:name"`
	}
	if err := r.db.Table("role_permissions").
		Select("role_permissions.role_id, permissions.name").
		Joins("JOIN permissions ON permissions.id = role_permissions.permission_id").
		Order("permissions.name").
		Scan(&links).Error; err != nil {
		return nil, fmt.Errorf("list role permissions: %w", err)
	}
	byRole := make(map[int][]string)
	for _, l := range links {
		byRole[l.RoleID] = append(byRole[l.RoleID], l.Name)
	}

	out := make([]SystemUserAdminRow, 0, len(users))
	for _, u := range users {
		perms := byRole[u.RoleID]
		if perms == nil {
			perms = []string{}
		}
		out = append(out, SystemUserAdminRow{
			ID:          u.ID,
			Username:    u.Username,
			Email:       u.Email,
			FirstName:   u.FirstName,
			LastName:    u.LastName,
			IsActive:    u.IsActive,
			CreatedAt:   u.CreatedAt,
			RoleID:      u.RoleID,
			RoleName:    u.RoleName,
			Permissions: perms,
		})
	}
	return out, nil
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

// IsApplicationUserActive returns whether the application user row exists and is active.
func (r *RBACRepository) IsApplicationUserActive(userID int) (bool, error) {
	var u models.User
	if err := r.db.Select("is_active").First(&u, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, errors.New("user not found")
		}
		return false, fmt.Errorf("load user active flag: %w", err)
	}
	return u.IsActive, nil
}

// SetApplicationUserActive updates users.is_active.
func (r *RBACRepository) SetApplicationUserActive(userID int, active bool) error {
	res := r.db.Model(&models.User{}).Where("id = ?", userID).Update("is_active", active)
	if res.Error != nil {
		return fmt.Errorf("update user active: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}

// DeleteRole removes a non-system role with no assigned users (clears role_permissions first).
func (r *RBACRepository) DeleteRole(roleID int) error {
	var role models.Role
	if err := r.db.First(&role, roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("role not found")
		}
		return fmt.Errorf("get role: %w", err)
	}
	if role.IsSystem {
		return errors.New("cannot delete system role")
	}
	var userCount int64
	if err := r.db.Model(&models.User{}).Where("role_id = ?", roleID).Count(&userCount).Error; err != nil {
		return fmt.Errorf("count users for role: %w", err)
	}
	if userCount > 0 {
		return errors.New("cannot delete role assigned to users")
	}

	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM role_permissions WHERE role_id = ?", roleID).Error; err != nil {
			return fmt.Errorf("clear role permissions: %w", err)
		}
		if err := tx.Delete(&models.Role{}, roleID).Error; err != nil {
			return fmt.Errorf("delete role: %w", err)
		}
		return nil
	})
}
