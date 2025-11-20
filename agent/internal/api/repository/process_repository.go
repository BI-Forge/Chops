package repository

import (
	"context"
	"fmt"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// ProcessRepository executes queries against ClickHouse system.processes
type ProcessRepository struct {
	executor    *clickhouse.QueryExecutor
	logger      *logger.Logger
	clusterName string
}

// NewProcessRepository creates a repository backed by the shared ClickHouse executor
func NewProcessRepository(cfg *config.Config, log *logger.Logger) (*ProcessRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	exec := manager.GetExecutor()
	if exec == nil {
		return nil, fmt.Errorf("clickhouse executor not available")
	}

	cluster := ""
	if cfg != nil {
		cluster = cfg.Database.ClickHouse.ClusterName
	}

	return &ProcessRepository{
		executor:    exec,
		logger:      log,
		clusterName: cluster,
	}, nil
}

// GetCurrentProcesses returns all currently running queries from system.processes
func (r *ProcessRepository) GetCurrentProcesses(ctx context.Context, nodeName string) ([]models.Process, error) {
	whereClause, args := r.buildWhereClause(nodeName)

	query := fmt.Sprintf(`
WITH hostName() AS node
SELECT
	node,
	query_id,
	user,
	address,
	elapsed,
	read_rows,
	read_bytes,
	total_rows_approx,
	written_rows,
	written_bytes,
	memory_usage,
	query,
	query_start_time,
	query_duration_ms,
	current_database,
	client_name,
	client_version_major,
	client_version_minor,
	client_version_patch,
	os_user,
	thread_ids,
	ProfileEvents.Names AS profile_event_names,
	ProfileEvents.Values AS profile_event_values,
	Settings.Names AS setting_names,
	Settings.Values AS setting_values
FROM %s
WHERE %s
ORDER BY query_start_time DESC`, r.dataSource(), whereClause)

	var rows interface {
		Next() bool
		Scan(dest ...interface{}) error
		Close() error
		Err() error
	}
	var err error
	if len(args) > 0 {
		rows, err = r.executor.Query(ctx, query, args...)
	} else {
		rows, err = r.executor.Query(ctx, query)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to query ClickHouse: %w", err)
	}
	defer rows.Close()

	processes := make([]models.Process, 0)
	for rows.Next() {
		var (
			node               string
			queryID            string
			user               string
			address            string
			elapsed            float64
			readRows           uint64
			readBytes          uint64
			totalRowsApprox    uint64
			writtenRows        uint64
			writtenBytes       uint64
			memoryUsage        uint64
			queryText          string
			queryStartTime     time.Time
			queryDurationMs    uint64
			currentDatabase    string
			clientName         string
			clientVersionMajor uint64
			clientVersionMinor uint64
			clientVersionPatch uint64
			osUser             string
			threadIDs          []uint64
			profileEventNames  []string
			profileEventValues []uint64
			settingNames       []string
			settingValues      []string
		)

		if err := rows.Scan(
			&node,
			&queryID,
			&user,
			&address,
			&elapsed,
			&readRows,
			&readBytes,
			&totalRowsApprox,
			&writtenRows,
			&writtenBytes,
			&memoryUsage,
			&queryText,
			&queryStartTime,
			&queryDurationMs,
			&currentDatabase,
			&clientName,
			&clientVersionMajor,
			&clientVersionMinor,
			&clientVersionPatch,
			&osUser,
			&threadIDs,
			&profileEventNames,
			&profileEventValues,
			&settingNames,
			&settingValues,
		); err != nil {
			return nil, fmt.Errorf("failed to scan process row: %w", err)
		}

		// Build profile events map
		profileEvents := make(map[string]uint64)
		if len(profileEventNames) == len(profileEventValues) {
			for i, name := range profileEventNames {
				if i < len(profileEventValues) {
					profileEvents[name] = profileEventValues[i]
				}
			}
		}

		// Build settings map
		settings := make(map[string]string)
		if len(settingNames) == len(settingValues) {
			for i, name := range settingNames {
				if i < len(settingValues) {
					settings[name] = settingValues[i]
				}
			}
		}

		clientVersion := ""
		if clientVersionMajor > 0 || clientVersionMinor > 0 || clientVersionPatch > 0 {
			clientVersion = fmt.Sprintf("%d.%d.%d", clientVersionMajor, clientVersionMinor, clientVersionPatch)
		}

		process := models.Process{
			QueryID:         queryID,
			User:            user,
			Address:         address,
			Elapsed:         elapsed,
			ReadRows:        readRows,
			ReadBytes:       readBytes,
			TotalRowsApprox: totalRowsApprox,
			WrittenRows:     writtenRows,
			WrittenBytes:    writtenBytes,
			MemoryUsage:     memoryUsage,
			Query:           queryText,
			QueryStartTime:  queryStartTime.UTC().Format(time.RFC3339),
			QueryDurationMs: queryDurationMs,
			CurrentDatabase: currentDatabase,
			Node:            node,
			ClientName:      clientName,
			ClientVersion:   clientVersion,
			OSUser:          osUser,
			ThreadIDs:       threadIDs,
			ProfileEvents:   profileEvents,
			Settings:        settings,
		}

		processes = append(processes, process)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("process iteration failed: %w", err)
	}

	return processes, nil
}

// KillQuery kills a query by query_id
func (r *ProcessRepository) KillQuery(ctx context.Context, queryID string, nodeName string) error {
	// Build KILL QUERY statement
	killQuery := fmt.Sprintf("KILL QUERY WHERE query_id = '%s'", queryID)

	// If cluster is configured, use ON CLUSTER
	if r.clusterName != "" {
		killQuery = fmt.Sprintf("KILL QUERY ON CLUSTER '%s' WHERE query_id = '%s'", r.clusterName, queryID)
	}

	err := r.executor.Exec(ctx, killQuery)
	if err != nil {
		return fmt.Errorf("failed to kill query: %w", err)
	}

	return nil
}

func (r *ProcessRepository) dataSource() string {
	if r.clusterName != "" {
		return fmt.Sprintf("clusterAllReplicas('%s', system.processes)", r.clusterName)
	}
	return "system.processes"
}

func (r *ProcessRepository) buildWhereClause(nodeName string) (string, []interface{}) {
	if nodeName != "" {
		return "node = ?", []interface{}{nodeName}
	}
	return "1=1", []interface{}{}
}
