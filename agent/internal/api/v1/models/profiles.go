package models

// ProfilesListResponse wraps list of ClickHouse profiles.
type ProfilesListResponse struct {
	Profiles []string `json:"profiles"`
}

