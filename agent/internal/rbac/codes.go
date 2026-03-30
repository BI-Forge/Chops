package rbac

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
	PermSystemRolesList           = "system.roles.list"
	PermSystemRolesGet            = "system.roles.get"
	PermSystemPermissionsList     = "system.permissions.list"
)

// AllPermissionCodes lists every permission seeded by migrations (order preserved for stable IDs on fresh DB).
func AllPermissionCodes() []string {
	return []string{
		PermAuthMe,
		PermClickhouseMetricsNodes,
		PermClickhouseMetricsCurrent,
		PermClickhouseMetricsStream,
		PermClickhouseMetricsSeries,
		PermClickhouseMetricsServerInfo,
		PermClickhouseQueryLogList,
		PermClickhouseQueryLogStats,
		PermClickhouseQueryLogStatsStream,
		PermClickhouseProcessesList,
		PermClickhouseProcessesStream,
		PermClickhouseProcessesKill,
		PermClickhouseUsersDetails,
		PermClickhouseUsersList,
		PermClickhouseUsersRename,
		PermClickhouseUsersPassword,
		PermClickhouseUsersProfile,
		PermClickhouseUsersCHRole,
		PermClickhouseUsersCreate,
		PermClickhouseUsersDelete,
		PermClickhouseUsersGet,
		PermClickhouseProfilesList,
		PermClickhouseCHRolesList,
		PermClickhouseAccessScopeGet,
		PermClickhouseAccessScopePut,
		PermClickhouseBackupsStats,
		PermClickhouseBackupsInProgress,
		PermClickhouseBackupsCompleted,
		PermClickhouseBackupsGetByID,
		PermClickhouseSchemasList,
		PermClickhouseTablesList,
		PermClickhouseTablesStats,
		PermClickhouseTablesDetails,
		PermClickhouseTablesCopy,
		PermClickhouseTablesDelete,
		PermClickhouseColumnsList,
		PermClickhouseSettingsUserGet,
		PermClickhouseSettingsUserPut,
		PermClickhouseSettingsAll,
		PermClickhouseSettingsOne,
		PermClickhouseSettingsAvailable,
		PermSystemRolesCreate,
		PermSystemRolesSetPermissions,
		PermSystemUsersSetRole,
		PermSystemRolesList,
		PermSystemRolesGet,
		PermSystemPermissionsList,
	}
}
