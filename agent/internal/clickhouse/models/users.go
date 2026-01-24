package models

// UserList represents user information in the list view.
type UserList struct {
	Name     string   `json:"name"`
	ID       string   `json:"id"`
	Profile  string   `json:"profile"`
	Storage  string   `json:"storage"`
	RoleName string   `json:"role_name"`
	Grants   []string `json:"grants"`
}
