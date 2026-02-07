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

// UserDetails represents detailed user information including settings and scope.
type UserDetails struct {
	Name            string            `json:"name"`
	ID              string            `json:"id"`
	Profile         string            `json:"profile"`
	UserSettings    []string          `json:"user_settings"`
	ProfileSettings map[string]string `json:"profile_settings"`
	Storage         string            `json:"storage"`
	RoleName        string            `json:"role_name"`
	Scope           string            `json:"scope"`
	Grants          []string          `json:"grants"`
}
