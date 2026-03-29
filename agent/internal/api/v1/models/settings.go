package models

// UserSettingsResponse wraps user-level and profile-level settings for a ClickHouse user.
type UserSettingsResponse struct {
	UserName        string            `json:"user_name"`
	UserSettings    map[string]string `json:"user_settings"`    // User-level setting name -> value
	ProfileSettings map[string]string `json:"profile_settings"` // Profile setting name -> value
}

// AvailableSetting describes a single user setting from system.settings (assignable to users/roles).
type AvailableSetting struct {
	Name        string `json:"name"`
	Type        string `json:"type"`
	Default     string `json:"default"`
	Description string `json:"description"`
	Min         string `json:"min,omitempty"`
	Max         string `json:"max,omitempty"`
}

// AvailableSettingsResponse is the response for the list of all assignable user settings.
type AvailableSettingsResponse struct {
	Settings []AvailableSetting `json:"settings"`
}

// UserSettingItem is a single name=value setting for update request.
type UserSettingItem struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// UpdateUserSettingsRequest is the request body for PUT /clickhouse/settings.
type UpdateUserSettingsRequest struct {
	UserName string            `json:"user_name"`
	Settings []UserSettingItem `json:"settings"`
}

// DBSettingItem is one merged row from system.settings and system.server_settings.
type DBSettingItem struct {
	Name                     string `json:"name"`
	Description              string `json:"description"`
	Value                    string `json:"value"`
	Type                     string `json:"type"`
	Changed                  bool   `json:"changed"`
	ChangeableWithoutRestart string `json:"changeable_without_restart"`
	Server                   bool   `json:"server"`
	Tier                     string `json:"tier"`
}

// AllDBSettingsResponse is the paginated list of merged ClickHouse settings.
type AllDBSettingsResponse struct {
	Settings []DBSettingItem `json:"settings"`
	Total    int             `json:"total"`
	Limit    int             `json:"limit"`
	Offset   int             `json:"offset"`
}

// DBSettingDetailItem is the GET /settings/one response: merged setting plus min, max, and readonly from system.settings (zeroed for server-only rows).
type DBSettingDetailItem struct {
	Name                     string `json:"name"`
	Description              string `json:"description"`
	Value                    string `json:"value"`
	Type                     string `json:"type"`
	Changed                  bool   `json:"changed"`
	ChangeableWithoutRestart string `json:"changeable_without_restart"`
	Server                   bool   `json:"server"`
	Tier                     string `json:"tier"`
	Min                      string `json:"min,omitempty"`
	Max                      string `json:"max,omitempty"`
	Readonly                 bool   `json:"readonly"`
}
