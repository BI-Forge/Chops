package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// AvailableSettingRow represents one row from system.settings for assignable settings.
type AvailableSettingRow struct {
	Name        string
	Type        string
	Default     string
	Description string
	Min         sql.NullString
	Max         sql.NullString
}

// SettingsRepository reads user settings from ClickHouse system tables.
type SettingsRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewSettingsRepository creates a repository backed by the shared ClickHouse manager.
func NewSettingsRepository(cfg *config.Config, log *logger.Logger) (*SettingsRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}
	return &SettingsRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// GetUserSettings returns user-level settings (name->value) and profile-level settings (name->value) for the given user.
// Returns error if user does not exist.
func (r *SettingsRepository) GetUserSettings(ctx context.Context, nodeName, userName string) (userSettings map[string]string, profileSettings map[string]string, err error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, nil, err
	}

	if err := checkTableExists(ctx, conn, "system.users"); err != nil {
		return nil, nil, err
	}
	if err := checkTableExists(ctx, conn, "system.settings_profile_elements"); err != nil {
		return nil, nil, err
	}

	query := `SELECT
    users.name,
    ups.user_settings,
    ups.profile_settings
FROM system.users AS users
LEFT JOIN (
    SELECT spe.user_name AS user_name,
           user_setting.settings AS user_settings,
           profile_setting.settings AS profile_settings
    FROM system.settings_profile_elements AS spe
    LEFT JOIN (
        SELECT user_name, mapFromArrays(groupArray(setting_name), groupArray(coalesce(value, ''))) AS settings
        FROM system.settings_profile_elements
        WHERE setting_name IS NOT NULL AND user_name IS NOT NULL
        GROUP BY user_name
    ) AS user_setting ON spe.user_name = user_setting.user_name
    LEFT JOIN (
        SELECT profile_name, mapFromArrays(groupArray(setting_name), groupArray(value)) AS settings
        FROM system.settings_profile_elements
        WHERE setting_name IS NOT NULL AND profile_name IS NOT NULL AND value IS NOT NULL
        GROUP BY profile_name
    ) AS profile_setting ON spe.inherit_profile = profile_setting.profile_name
    WHERE spe.user_name IS NOT NULL
) AS ups ON ups.user_name = users.name
WHERE users.name = ?`

	row := conn.QueryRow(ctx, query, userName)
	var name sql.NullString
	var uSettings map[string]string
	var pSettings map[string]string

	if err := row.Scan(&name, &uSettings, &pSettings); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, fmt.Errorf("user %s not found", userName)
		}
		return nil, nil, fmt.Errorf("failed to query user settings: %w", err)
	}

	if !name.Valid || name.String == "" {
		return nil, nil, fmt.Errorf("user %s not found", userName)
	}

	if uSettings == nil {
		uSettings = map[string]string{}
	}
	if pSettings == nil {
		pSettings = map[string]string{}
	}
	return uSettings, pSettings, nil
}

// GetAllAvailableSettings returns all session settings that can be assigned to a user (from system.settings).
// Excludes obsolete settings. See: https://clickhouse.com/docs/en/operations/system-tables/settings
func (r *SettingsRepository) GetAllAvailableSettings(ctx context.Context, nodeName string) ([]AvailableSettingRow, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.settings"); err != nil {
		return nil, err
	}

	// system.settings: name, type, default, description, min, max, is_obsolete, tier
	query := `SELECT name, type, default, description, min, max
		FROM system.settings
		WHERE is_obsolete = 0
		ORDER BY name`

	rows, err := conn.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query system.settings: %w", err)
	}
	defer rows.Close()

	var result []AvailableSettingRow
	for rows.Next() {
		var row AvailableSettingRow
		if err := rows.Scan(&row.Name, &row.Type, &row.Default, &row.Description, &row.Min, &row.Max); err != nil {
			return nil, fmt.Errorf("failed to scan setting row: %w", err)
		}
		result = append(result, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("settings query iteration failed: %w", err)
	}

	return result, nil
}

// UserSettingPair is a name-value pair for user settings.
type UserSettingPair struct {
	Name  string
	Value string
}

// UpdateUserSettings removes all user-level settings for the user, then adds the given settings.
// Does not check users.xml; caller (handler) must ensure user is not in users.xml.
func (r *SettingsRepository) UpdateUserSettings(ctx context.Context, nodeName, userName string, settings []UserSettingPair) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	if err := checkTableExists(ctx, conn, "system.users"); err != nil {
		return err
	}

	escapeIdentifier := func(s string) string {
		return strings.ReplaceAll(s, "`", "``")
	}
	escapeStringLiteral := func(s string) string {
		return strings.ReplaceAll(s, "'", "''")
	}

	// 1. Drop all user settings
	dropQuery := fmt.Sprintf("ALTER USER `%s` DROP ALL SETTINGS", escapeIdentifier(userName))
	fmt.Println(dropQuery)
	if err := conn.Exec(ctx, dropQuery); err != nil {
		return fmt.Errorf("failed to drop user settings: %w", err)
	}

	// 2. Add new settings if any
	if len(settings) > 0 {
		var parts []string
		for _, s := range settings {
			name := strings.TrimSpace(s.Name)
			if name == "" {
				continue
			}
			// Value as string literal (ClickHouse accepts quoted values for settings)
			parts = append(parts, fmt.Sprintf("`%s` = '%s'", escapeIdentifier(name), escapeStringLiteral(s.Value)))
		}
		if len(parts) > 0 {
			addQuery := fmt.Sprintf("ALTER USER `%s` ADD SETTINGS %s", escapeIdentifier(userName), strings.Join(parts, ", "))
			fmt.Println(addQuery)
			if err := conn.Exec(ctx, addQuery); err != nil {
				return fmt.Errorf("failed to add user settings: %w", err)
			}
		}
	}

	if r.logger != nil {
		r.logger.Infof("Successfully updated settings for user %s on node %s", userName, nodeName)
	}
	return nil
}
