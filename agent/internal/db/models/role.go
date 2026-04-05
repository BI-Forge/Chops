package models

import "time"

// Role is a named system role; each user has exactly one role.
type Role struct {
	ID          int          `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string       `gorm:"uniqueIndex;not null;size:100" json:"name"`
	Description string       `gorm:"type:text" json:"description,omitempty"`
	IsSystem    bool         `gorm:"column:is_system;not null;default:false" json:"is_system"`
	CreatedAt   time.Time    `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time    `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}

// TableName returns the roles table name.
func (Role) TableName() string {
	return "roles"
}
