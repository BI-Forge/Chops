package repository

import (
	"context"
	"database/sql"
	"errors"
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

// AllDBSettingsQuery drives filtering, sorting, and pagination for merged system settings.
type AllDBSettingsQuery struct {
	Limit      int
	Offset     int
	Tier       string
	Type       string
	Server     *bool
	Sort       string
	OrderDesc  bool
	Search     string
}

// DBSettingRow is one merged settings row from system.settings and/or system.server_settings.
type DBSettingRow struct {
	Name                     string
	Description              string
	Value                    string
	Type                     string
	Changed                  uint8
	ChangeableWithoutRestart string
	Server                   bool
	Tier                     string
}

// DBSettingDetailRow is like DBSettingRow plus min, max, and readonly from system.settings (zeros when absent on server).
type DBSettingDetailRow struct {
	Name                     string
	Description              string
	Value                    string
	Type                     string
	Changed                  uint8
	ChangeableWithoutRestart string
	Server                   bool
	Tier                     string
	Min                      string
	Max                      string
	Readonly                 uint8
}

var allDBSettingsSortSQL = map[string]string{
	"name":    "name",
	"changed": "changed",
	"server":  "server",
}

// mergedDBSettingsUnionInner returns the UNION ALL body for session (system.settings) and optional server (system.server_settings) rows.
// Session columns are taken from system.settings; changeable_without_restart is not defined there (server-only), so it is an empty string.
// Server rows use system.server_settings columns; tier exists only on system.settings, so it is synthesized from is_obsolete or empty.
func mergedDBSettingsUnionInner(hasServerSettings bool) string {
	sessionPart := `SELECT
    s.name AS name,
    coalesce(s.description, '') AS description,
    toString(s.value) AS value,
    toString(s.type) AS type,
    s.changed AS changed,
    '' AS changeable_without_restart,
    toUInt8(0) AS server,
    toString(s.tier) AS tier
  FROM system.settings AS s`
	if !hasServerSettings {
		return sessionPart
	}
	return sessionPart + `
  UNION ALL
  SELECT
    ss.name AS name,
    coalesce(ss.description, '') AS description,
    toString(ss.value) AS value,
    toString(ss.type) AS type,
    ss.changed AS changed,
    toString(ss.changeable_without_restart) AS changeable_without_restart,
    toUInt8(1) AS server,
    multiIf(ss.is_obsolete != 0, 'obsolete', '') AS tier
  FROM system.server_settings AS ss`
}

// mergedDBSettingDetailUnionInner is like mergedDBSettingsUnionInner but adds min, max, and readonly from system.settings; server branch pads missing columns.
func mergedDBSettingDetailUnionInner(hasServerSettings bool) string {
	sessionPart := `SELECT
    s.name AS name,
    coalesce(s.description, '') AS description,
    toString(s.value) AS value,
    toString(s.type) AS type,
    s.changed AS changed,
    '' AS changeable_without_restart,
    toUInt8(0) AS server,
    toString(s.tier) AS tier,
    ifNull(toString(s.min), '') AS min,
    ifNull(toString(s.max), '') AS max,
    toUInt8(s.readonly) AS readonly
  FROM system.settings AS s`
	if !hasServerSettings {
		return sessionPart
	}
	return sessionPart + `
  UNION ALL
  SELECT
    ss.name AS name,
    coalesce(ss.description, '') AS description,
    toString(ss.value) AS value,
    toString(ss.type) AS type,
    ss.changed AS changed,
    toString(ss.changeable_without_restart) AS changeable_without_restart,
    toUInt8(1) AS server,
    multiIf(ss.is_obsolete != 0, 'obsolete', '') AS tier,
    '' AS min,
    '' AS max,
    toUInt8(0) AS readonly
  FROM system.server_settings AS ss`
}

func escapeClickHouseLike(s string) string {
	s = strings.ReplaceAll(s, `\`, `\\`)
	s = strings.ReplaceAll(s, `%`, `\%`)
	s = strings.ReplaceAll(s, `_`, `\_`)
	return s
}

func buildAllDBSettingsWhere(q AllDBSettingsQuery) (clause string, args []interface{}) {
	clause = "WHERE 1=1"
	if q.Tier != "" {
		clause += " AND lower(tier) = ?"
		args = append(args, strings.ToLower(q.Tier))
	}
	if q.Type != "" {
		clause += " AND type = ?"
		args = append(args, q.Type)
	}
	if q.Server != nil {
		var v uint8
		if *q.Server {
			v = 1
		}
		clause += " AND server = ?"
		args = append(args, v)
	}
	if q.Search != "" {
		pat := "%" + escapeClickHouseLike(q.Search) + "%"
		clause += " AND (lower(name) LIKE lower(?) OR lower(description) LIKE lower(?))"
		args = append(args, pat, pat)
	}
	return clause, args
}

// GetAllDBSettings returns merged rows from system.settings and system.server_settings (when present) with total count.
func (r *SettingsRepository) GetAllDBSettings(ctx context.Context, nodeName string, q AllDBSettingsQuery) ([]DBSettingRow, int, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, 0, err
	}

	if err := checkTableExists(ctx, conn, "system.settings"); err != nil {
		return nil, 0, err
	}

	hasServerSettings := checkTableExists(ctx, conn, "system.server_settings") == nil
	unionInner := mergedDBSettingsUnionInner(hasServerSettings)

	orderCol := "name"
	if col, ok := allDBSettingsSortSQL[q.Sort]; ok {
		orderCol = col
	}
	orderDir := "ASC"
	if q.OrderDesc {
		orderDir = "DESC"
	}

	whereClause, whereArgs := buildAllDBSettingsWhere(q)

	countSQL := `WITH unified AS (
` + unionInner + `
)
SELECT count() FROM unified
` + whereClause

	var totalU64 uint64
	if err := conn.QueryRow(ctx, countSQL, whereArgs...).Scan(&totalU64); err != nil {
		return nil, 0, fmt.Errorf("failed to count merged settings: %w", err)
	}
	total := int(totalU64)

	listSQL := `WITH unified AS (
` + unionInner + `
)
SELECT
  name,
  description,
  value,
  type,
  changed,
  changeable_without_restart,
  server,
  tier
FROM unified
` + whereClause + `
ORDER BY ` + orderCol + ` ` + orderDir + `
LIMIT ? OFFSET ?`

	listArgs := append(append([]interface{}{}, whereArgs...), q.Limit, q.Offset)

	rows, err := conn.Query(ctx, listSQL, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query merged settings: %w", err)
	}
	defer rows.Close()

	var result []DBSettingRow
	for rows.Next() {
		var row DBSettingRow
		var srv uint8
		if err := rows.Scan(
			&row.Name,
			&row.Description,
			&row.Value,
			&row.Type,
			&row.Changed,
			&row.ChangeableWithoutRestart,
			&srv,
			&row.Tier,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan merged setting row: %w", err)
		}
		row.Server = srv != 0
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("merged settings iteration failed: %w", err)
	}

	return result, total, nil
}

// GetDBSettingByName returns one merged setting row by exact name, preferring session over server; includes min, max, readonly from system.settings when applicable.
func (r *SettingsRepository) GetDBSettingByName(ctx context.Context, nodeName, settingName string) (*DBSettingDetailRow, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.settings"); err != nil {
		return nil, err
	}

	hasServerSettings := checkTableExists(ctx, conn, "system.server_settings") == nil
	unionInner := mergedDBSettingDetailUnionInner(hasServerSettings)

	querySQL := `WITH unified AS (
` + unionInner + `
)
SELECT
  name,
  description,
  value,
  type,
  changed,
  changeable_without_restart,
  server,
  tier,
  min,
  max,
  readonly
FROM unified
WHERE name = ?
ORDER BY server ASC
LIMIT 1`

	row := conn.QueryRow(ctx, querySQL, settingName)
	var out DBSettingDetailRow
	var srv uint8
	if err := row.Scan(
		&out.Name,
		&out.Description,
		&out.Value,
		&out.Type,
		&out.Changed,
		&out.ChangeableWithoutRestart,
		&srv,
		&out.Tier,
		&out.Min,
		&out.Max,
		&out.Readonly,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to query setting by name: %w", err)
	}
	out.Server = srv != 0
	return &out, nil
}
