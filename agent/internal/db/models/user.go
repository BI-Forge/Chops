package models

import "time"

// User represents an application user persisted in the database.
type User struct {
	ID           int       `gorm:"primaryKey;autoIncrement" json:"id"`
	Username     string    `gorm:"uniqueIndex;not null;size:50" json:"username"`
	Email        string    `gorm:"uniqueIndex;not null;size:100" json:"email"`
	PasswordHash string    `gorm:"column:password_hash;not null;size:255" json:"-"`
	FirstName    *string   `gorm:"size:50" json:"first_name,omitempty"`
	LastName     *string   `gorm:"size:50" json:"last_name,omitempty"`
	IsActive     bool      `gorm:"default:true" json:"is_active"`
	RoleID       int       `gorm:"not null;index" json:"role_id"`
	Role         Role      `gorm:"foreignKey:RoleID" json:"-"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

// TableName specifies the users table backing the model.
func (User) TableName() string {
	return "users"
}
