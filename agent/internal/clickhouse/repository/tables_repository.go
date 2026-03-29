package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// TablesRepository executes queries to get ClickHouse tables list.
type TablesRepository struct {
	manager *clickhouse.Manager
	logger  *logger.Logger
}

// NewTablesRepository creates a repository backed by the shared ClickHouse manager.
func NewTablesRepository(cfg *config.Config, log *logger.Logger) (*TablesRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("ClickHouse manager not initialized")
	}

	return &TablesRepository{
		manager: manager,
		logger:  log,
	}, nil
}

// Allowed sort columns for GetTables (safe for ORDER BY).
var tablesSortColumns = map[string]bool{
	"name":   true,
	"engine": true,
	"rows":   true,
	"parts":  true,
	"active": true,
	"bytes":  true,
}

// GetTables returns a paginated list of ClickHouse tables with parts and size info.
// nameFilter, schemaFilter, and engineFilter are optional. sortBy: name, engine, rows, parts, active, bytes (default: database, then name).
// limit and offset are applied for pagination; total is the full count matching filters.
func (r *TablesRepository) GetTables(ctx context.Context, nodeName, nameFilter, schemaFilter, engineFilter, sortBy string, sortDesc bool, limit, offset int) ([]models.TableList, int, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, 0, err
	}

	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return nil, 0, err
	}
	if err := checkTableExists(ctx, conn, "system.parts"); err != nil {
		return nil, 0, err
	}

	orderDir := "ASC"
	if sortDesc {
		orderDir = "DESC"
	}
	orderByClause := "database " + orderDir + ", name " + orderDir
	if sortBy != "" {
		key := strings.ToLower(sortBy)
		if tablesSortColumns[key] {
			col := key
			if key == "active" {
				col = "active_parts"
			}
			orderByClause = col + " " + orderDir
		}
	}

	whereClause := "WHERE 1=1"
	var args []interface{}
	if schemaFilter != "" {
		whereClause += " AND lower(t.database) LIKE lower(?)"
		args = append(args, schemaFilter)
	}
	if nameFilter != "" {
		whereClause += " AND lower(t.name) LIKE lower(?)"
		args = append(args, "%"+nameFilter+"%")
	}
	if engineFilter != "" {
		whereClause += " AND lower(t.engine) = lower(?)"
		args = append(args, engineFilter)
	}

	// Total count (same filters, no limit/offset)
	countQuery := `SELECT count() FROM (
  SELECT t.database, t.name
  FROM system.tables t
  LEFT JOIN system.parts p ON t.database = p.database AND t.name = p.table
  ` + whereClause + `
  GROUP BY t.database, t.name
)`
	var totalU64 uint64
	if err := conn.QueryRow(ctx, countQuery, args...).Scan(&totalU64); err != nil {
		return nil, 0, fmt.Errorf("failed to count tables: %w", err)
	}
	total := int(totalU64)

	query := `SELECT
  toString(t.uuid) AS uuid,
  t.database,
  t.name,
  t.engine,
  coalesce(t.total_rows, 0) AS rows,
  coalesce(t.total_bytes, 0) AS bytes,
  count(p.active) AS parts,
  countIf(p.active) AS active_parts
FROM system.tables t
LEFT JOIN system.parts p ON t.database = p.database AND t.name = p.table
` + whereClause + `
GROUP BY t.uuid, t.database, t.name, t.engine, t.total_rows, t.total_bytes
ORDER BY ` + orderByClause + `
LIMIT ? OFFSET ?`
	args = append(args, limit, offset)

	rows, err := conn.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query tables: %w", err)
	}
	defer rows.Close()

	var result []models.TableList
	for rows.Next() {
		var row models.TableList
		if err := rows.Scan(&row.UUID, &row.Database, &row.Name, &row.Engine, &row.Rows, &row.Bytes, &row.Parts, &row.ActiveParts); err != nil {
			return nil, 0, fmt.Errorf("failed to scan table row: %w", err)
		}
		result = append(result, row)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("tables query iteration failed: %w", err)
	}

	return result, total, nil
}

// GetTableDetails returns full metadata for a table by its UUID (system.tables + parts counts from system.parts).
// Returns nil, nil (with err) when table is not found.
func (r *TablesRepository) GetTableDetails(ctx context.Context, nodeName, tableUUID string) (*models.TableDetails, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return nil, err
	}

	// Query system.tables by uuid; select columns in fixed order for Scan.
	tablesQuery := `SELECT
  database, name, uuid, engine, is_temporary,
  data_paths, metadata_path, metadata_modification_time,
  dependencies_database, dependencies_table,
  create_table_query, engine_full, as_select,
  partition_key, sorting_key, primary_key, sampling_key, storage_policy,
  total_rows, total_bytes, total_bytes_uncompressed, lifetime_rows, lifetime_bytes,
  comment, has_own_data,
  loading_dependencies_database, loading_dependencies_table,
  loading_dependent_database, loading_dependent_table
FROM system.tables
WHERE uuid = ?
LIMIT 1`
	row := conn.QueryRow(ctx, tablesQuery, tableUUID)
	var d models.TableDetails
	var metadataModTime time.Time
	err = row.Scan(
		&d.Database, &d.Name, &d.UUID, &d.Engine, &d.IsTemporary,
		&d.DataPaths, &d.MetadataPath, &metadataModTime,
		&d.DependenciesDatabase, &d.DependenciesTable,
		&d.CreateTableQuery, &d.EngineFull, &d.AsSelect,
		&d.PartitionKey, &d.SortingKey, &d.PrimaryKey, &d.SamplingKey, &d.StoragePolicy,
		&d.TotalRows, &d.TotalBytes, &d.TotalBytesUncompressed, &d.LifetimeRows, &d.LifetimeBytes,
		&d.Comment, &d.HasOwnData,
		&d.LoadingDependenciesDatabase, &d.LoadingDependenciesTable,
		&d.LoadingDependentDatabase, &d.LoadingDependentTable,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get table by uuid: %w", err)
	}
	d.MetadataModificationTime = metadataModTime.Format(time.RFC3339)

	// Parts counts from system.parts.
	if err := checkTableExists(ctx, conn, "system.parts"); err != nil {
		return nil, err
	}
	partsQuery := `SELECT count(), countIf(active) FROM system.parts WHERE database = ? AND table = ?`
	partsRow := conn.QueryRow(ctx, partsQuery, d.Database, d.Name)
	if err := partsRow.Scan(&d.Parts, &d.ActiveParts); err != nil {
		return nil, fmt.Errorf("failed to get parts count: %w", err)
	}

	return &d, nil
}

// DropTableByUUID resolves the table by UUID in system.tables and executes DROP TABLE.
// Returns sql.ErrNoRows when no table matches the UUID.
func (r *TablesRepository) DropTableByUUID(ctx context.Context, nodeName, tableUUID string) error {
	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return err
	}

	row := conn.QueryRow(ctx, `SELECT database, name FROM system.tables WHERE uuid = ? LIMIT 1`, tableUUID)
	var database, name string
	if err := row.Scan(&database, &name); err != nil {
		return fmt.Errorf("failed to resolve table by uuid: %w", err)
	}

	escapeIdentifier := func(s string) string {
		return strings.ReplaceAll(s, "`", "``")
	}
	dropSQL := fmt.Sprintf("DROP TABLE `%s`.`%s`", escapeIdentifier(database), escapeIdentifier(name))
	if err := conn.Exec(ctx, dropSQL); err != nil {
		return fmt.Errorf("failed to drop table: %w", err)
	}

	return nil
}

// CopyTableByUUID loads create_table_query from system.tables, rewrites the table name, and runs CREATE.
// newTableName must be a safe identifier; source and target names must differ.
func (r *TablesRepository) CopyTableByUUID(ctx context.Context, nodeName, tableUUID, newTableName string) (*models.TableCopyResult, error) {
	if err := validateNewTableName(newTableName); err != nil {
		return nil, err
	}

	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return nil, err
	}

	row := conn.QueryRow(ctx,
		`SELECT database, name, create_table_query FROM system.tables WHERE uuid = ? LIMIT 1`,
		tableUUID,
	)
	var database, oldName, createQuery string
	if err := row.Scan(&database, &oldName, &createQuery); err != nil {
		return nil, fmt.Errorf("failed to resolve table by uuid: %w", err)
	}

	if oldName == newTableName {
		return nil, fmt.Errorf("new table name must differ from the source table name")
	}

	newDDL, err := rewriteCreateTableDDL(createQuery, database, oldName, newTableName)
	if err != nil {
		return nil, err
	}

	if err := conn.Exec(ctx, newDDL); err != nil {
		return nil, fmt.Errorf("failed to create copied table: %w", err)
	}

	uuidRow := conn.QueryRow(ctx,
		`SELECT uuid FROM system.tables WHERE database = ? AND name = ? LIMIT 1`,
		database, newTableName,
	)
	var newUUID string
	if err := uuidRow.Scan(&newUUID); err != nil {
		return nil, fmt.Errorf("failed to read new table uuid: %w", err)
	}

	return &models.TableCopyResult{Database: database, Name: newTableName, UUID: newUUID}, nil
}

// GetTablesTotals returns aggregated counters across all tables.
func (r *TablesRepository) GetTablesTotals(ctx context.Context, nodeName string) (models.TablesTotals, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return models.TablesTotals{}, err
	}

	if err := checkTableExists(ctx, conn, "system.tables"); err != nil {
		return models.TablesTotals{}, err
	}
	if err := checkTableExists(ctx, conn, "system.parts"); err != nil {
		return models.TablesTotals{}, err
	}

	var totalTables uint64
	if err := conn.QueryRow(ctx, "SELECT count() FROM system.tables").Scan(&totalTables); err != nil {
		return models.TablesTotals{}, fmt.Errorf("failed to count tables: %w", err)
	}

	var totalRows uint64
	totalRowsQuery := "SELECT coalesce(sum(coalesce(total_rows, 0)), 0) FROM system.tables"
	if err := conn.QueryRow(ctx, totalRowsQuery).Scan(&totalRows); err != nil {
		return models.TablesTotals{}, fmt.Errorf("failed to count rows: %w", err)
	}

	var totalBytes uint64
	totalBytesQuery := "SELECT coalesce(sum(coalesce(total_bytes, 0)), 0) FROM system.tables"
	if err := conn.QueryRow(ctx, totalBytesQuery).Scan(&totalBytes); err != nil {
		return models.TablesTotals{}, fmt.Errorf("failed to count bytes: %w", err)
	}

	var totalParts uint64
	if err := conn.QueryRow(ctx, "SELECT count() FROM system.parts").Scan(&totalParts); err != nil {
		return models.TablesTotals{}, fmt.Errorf("failed to count parts: %w", err)
	}

	return models.TablesTotals{
		TotalTables: totalTables,
		TotalRows:   totalRows,
		TotalBytes:  totalBytes,
		TotalParts:  totalParts,
	}, nil
}
