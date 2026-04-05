package rbac

// Built-in system role names (lowercase in DB).
const (
	RoleNameAdmin = "admin"
	RoleNameGuest = "guest"
)

// Permission code constants; must match rows seeded in DB migrations.
const (
	PermAuthMe = "auth.me"

	PermClickhouseMetricsNodes      = "clickhouse.metrics.nodes"
	PermClickhouseMetricsCurrent    = "clickhouse.metrics.current"
	PermClickhouseMetricsStream     = "clickhouse.metrics.stream"
	PermClickhouseMetricsSeries     = "clickhouse.metrics.series"
	PermClickhouseMetricsServerInfo = "clickhouse.metrics.server_info"

	PermClickhouseQueryLogList        = "clickhouse.query_log.list"
	PermClickhouseQueryLogStats       = "clickhouse.query_log.stats"
	PermClickhouseQueryLogStatsStream = "clickhouse.query_log.stats_stream"

	PermClickhouseProcessesList   = "clickhouse.processes.list"
	PermClickhouseProcessesStream = "clickhouse.processes.stream"
	PermClickhouseProcessesKill   = "clickhouse.processes.kill"

	PermClickhouseUsersDetails  = "clickhouse.users.details"
	PermClickhouseUsersList     = "clickhouse.users.list"
	PermClickhouseUsersRename   = "clickhouse.users.rename"
	PermClickhouseUsersPassword = "clickhouse.users.password"
	PermClickhouseUsersProfile  = "clickhouse.users.profile"
	PermClickhouseUsersCHRole   = "clickhouse.users.ch_role"
	PermClickhouseUsersCreate   = "clickhouse.users.create"
	PermClickhouseUsersDelete   = "clickhouse.users.delete"
	PermClickhouseUsersGet      = "clickhouse.users.get"

	PermClickhouseProfilesList = "clickhouse.profiles.list"

	PermClickhouseCHRolesList = "clickhouse.ch_roles.list"

	PermClickhouseAccessScopeGet = "clickhouse.access_scope.get"
	PermClickhouseAccessScopePut = "clickhouse.access_scope.put"

	PermClickhouseBackupsStats      = "clickhouse.backups.stats"
	PermClickhouseBackupsInProgress = "clickhouse.backups.in_progress"
	PermClickhouseBackupsCompleted  = "clickhouse.backups.completed"
	PermClickhouseBackupsGetByID    = "clickhouse.backups.get_by_id"

	PermClickhouseSchemasList = "clickhouse.schemas.list"

	PermClickhouseTablesList    = "clickhouse.tables.list"
	PermClickhouseTablesStats   = "clickhouse.tables.stats"
	PermClickhouseTablesDetails = "clickhouse.tables.details"
	PermClickhouseTablesCopy    = "clickhouse.tables.copy"
	PermClickhouseTablesDelete  = "clickhouse.tables.delete"

	PermClickhouseColumnsList = "clickhouse.columns.list"

	PermClickhouseSettingsUserGet   = "clickhouse.settings.user_get"
	PermClickhouseSettingsUserPut   = "clickhouse.settings.user_put"
	PermClickhouseSettingsAll       = "clickhouse.settings.all"
	PermClickhouseSettingsOne       = "clickhouse.settings.one"
	PermClickhouseSettingsAvailable = "clickhouse.settings.available"

	PermSystemRolesCreate         = "system.roles.create"
	PermSystemRolesSetPermissions = "system.roles.set_permissions"
	PermSystemUsersSetRole        = "system.users.set_role"
	PermSystemUsersList           = "system.users.list"
	PermSystemRolesList           = "system.roles.list"
	PermSystemRolesGet            = "system.roles.get"
	PermSystemRolesDelete         = "system.roles.delete"
	PermSystemPermissionsList     = "system.permissions.list"
	PermSystemUsersSetActive      = "system.users.set_active"
)

// PermissionSeed is a row inserted into the permissions table by migrations.
type PermissionSeed struct {
	Name        string
	Description string
}

// AllPermissionSeeds returns name and description for each permission (order preserved for stable IDs on fresh DB).
func AllPermissionSeeds() []PermissionSeed {
	return []PermissionSeed{
		{PermAuthMe, "Read the authenticated user's profile and permission set (GET /auth/me)."},
		{PermClickhouseMetricsNodes, "List ClickHouse nodes available for metrics and monitoring."},
		{PermClickhouseMetricsCurrent, "Read current metrics snapshot for a node."},
		{PermClickhouseMetricsStream, "Subscribe to live metrics stream for a node."},
		{PermClickhouseMetricsSeries, "Query historical metric series for charts."},
		{PermClickhouseMetricsServerInfo, "Read ClickHouse server version and build info for metrics context."},
		{PermClickhouseQueryLogList, "List query log entries from ClickHouse."},
		{PermClickhouseQueryLogStats, "Read aggregated query log statistics."},
		{PermClickhouseQueryLogStatsStream, "Stream query log statistics updates."},
		{PermClickhouseProcessesList, "List running queries and processes on ClickHouse."},
		{PermClickhouseProcessesStream, "Stream process list updates."},
		{PermClickhouseProcessesKill, "Terminate a running query or process on ClickHouse."},
		{PermClickhouseUsersDetails, "Read detailed ClickHouse user profile, grants, and settings."},
		{PermClickhouseUsersList, "List ClickHouse users with roles and grants."},
		{PermClickhouseUsersRename, "Rename a ClickHouse user account."},
		{PermClickhouseUsersPassword, "Change a ClickHouse user's password."},
		{PermClickhouseUsersProfile, "Assign or change a ClickHouse user's profile."},
		{PermClickhouseUsersCHRole, "Assign ClickHouse roles to a user."},
		{PermClickhouseUsersCreate, "Create a new ClickHouse user."},
		{PermClickhouseUsersDelete, "Delete a ClickHouse user."},
		{PermClickhouseUsersGet, "Read ClickHouse users in legacy aggregate form."},
		{PermClickhouseProfilesList, "List ClickHouse settings profiles."},
		{PermClickhouseCHRolesList, "List ClickHouse server roles."},
		{PermClickhouseAccessScopeGet, "Read a user's database/table/column access scopes."},
		{PermClickhouseAccessScopePut, "Update a user's access scopes in ClickHouse."},
		{PermClickhouseBackupsStats, "Read backup statistics and summary."},
		{PermClickhouseBackupsInProgress, "List backups currently in progress."},
		{PermClickhouseBackupsCompleted, "List completed backups."},
		{PermClickhouseBackupsGetByID, "Read a single backup record by identifier."},
		{PermClickhouseSchemasList, "List databases (schemas) on ClickHouse."},
		{PermClickhouseTablesList, "List tables with metadata (size, engine, rows)."},
		{PermClickhouseTablesStats, "Read table-level statistics."},
		{PermClickhouseTablesDetails, "Read detailed metadata for one table."},
		{PermClickhouseTablesCopy, "Copy table data or structure between tables."},
		{PermClickhouseTablesDelete, "Drop or delete a ClickHouse table."},
		{PermClickhouseColumnsList, "List columns for a table."},
		{PermClickhouseSettingsUserGet, "Read user-level ClickHouse settings."},
		{PermClickhouseSettingsUserPut, "Update user-level ClickHouse settings."},
		{PermClickhouseSettingsAll, "List or read all server settings (broad access)."},
		{PermClickhouseSettingsOne, "Read a single named server setting."},
		{PermClickhouseSettingsAvailable, "List settings available for assignment to users or roles."},
		{PermSystemRolesCreate, "Create a new application (system) RBAC role."},
		{PermSystemRolesSetPermissions, "Replace permission set linked to a system role."},
		{PermSystemUsersSetRole, "Assign a system role to an application user."},
		{PermSystemUsersList, "List application users with roles and effective permission codes."},
		{PermSystemRolesList, "List system roles."},
		{PermSystemRolesGet, "Read one system role including its permissions."},
		{PermSystemRolesDelete, "Delete a system role with no assigned users (reserved admin role cannot be deleted)."},
		{PermSystemPermissionsList, "List all system permission definitions (catalog)."},
		{PermSystemUsersSetActive, "Activate or deactivate an application user account."},
	}
}

// AllPermissionCodes lists every permission code seeded by migrations (order preserved for stable IDs on fresh DB).
func AllPermissionCodes() []string {
	seeds := AllPermissionSeeds()
	out := make([]string, len(seeds))
	for i, s := range seeds {
		out[i] = s.Name
	}
	return out
}

// PermissionDescription returns the seeded description for a permission code, or empty if unknown.
func PermissionDescription(name string) string {
	for _, s := range AllPermissionSeeds() {
		if s.Name == name {
			return s.Description
		}
	}
	return ""
}
