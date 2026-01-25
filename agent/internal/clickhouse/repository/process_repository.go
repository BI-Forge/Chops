package repository

import (
	"context"
	"fmt"
	"sync"
	"time"

	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/clickhouse/models"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

// ProcessRepository executes queries against ClickHouse system.processes
type ProcessRepository struct {
	manager     *clickhouse.Manager
	logger      *logger.Logger
	clusterName string
	killGuards  sync.Map // map[string]time.Time
}

// NewProcessRepository creates a repository backed by the shared ClickHouse manager
func NewProcessRepository(cfg *config.Config, log *logger.Logger) (*ProcessRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	cluster := ""
	if cfg != nil {
		cluster = cfg.Database.ClickHouse.ClusterName
	}

	return &ProcessRepository{
		manager:     manager,
		logger:      log,
		clusterName: cluster,
	}, nil
}

// GetCurrentProcesses returns all currently running queries from system.processes
func (r *ProcessRepository) GetCurrentProcesses(ctx context.Context, nodeName string) ([]models.Process, error) {
	conn, err := getConnection(nodeName)
	if err != nil {
		return nil, err
	}

	if err := checkTableExists(ctx, conn, "system.processes"); err != nil {
		return nil, err
	}

	whereClause, args := r.buildWhereClause(nodeName)

	query := fmt.Sprintf(`
SELECT
	hostName() AS node,
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
	now() - toIntervalSecond(elapsed) AS query_start_time,
	elapsed * 1000 AS query_duration_ms,
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
FROM system.processes
WHERE %s
ORDER BY elapsed DESC`, whereClause)

	var rows interface {
		Next() bool
		Scan(dest ...interface{}) error
		Close() error
		Err() error
	}
	if len(args) > 0 {
		rows, err = conn.Query(ctx, query, args...)
	} else {
		rows, err = conn.Query(ctx, query)
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
			memoryUsage        int64 // Changed to int64 to match ClickHouse Int64 type
			queryText          string
			queryStartTime     time.Time
			queryDurationMs    float64 // Read as float64, then convert to uint64
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

		// Convert memoryUsage from int64 to uint64 (handle negative values as 0)
		memoryUsageUint := uint64(0)
		if memoryUsage > 0 {
			memoryUsageUint = uint64(memoryUsage)
		}

		// Convert queryDurationMs from float64 to uint64
		queryDurationMsUint := uint64(0)
		if queryDurationMs > 0 {
			queryDurationMsUint = uint64(queryDurationMs)
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
			MemoryUsage:     memoryUsageUint,
			Query:           queryText,
			QueryStartTime:  queryStartTime.UTC().Format(time.RFC3339),
			QueryDurationMs: queryDurationMsUint,
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
	// Deduplicate rapid duplicate kill calls (same queryId + node)
	killKey := fmt.Sprintf("%s:%s", queryID, nodeName)
	if last, ok := r.killGuards.Load(killKey); ok {
		if ts, ok := last.(time.Time); ok && time.Since(ts) < 5*time.Second {
			if r.logger != nil {
				r.logger.Infof("Skipping duplicate kill request for query %s on node %s", queryID, nodeName)
			}
			return nil
		}
	}

	conn, err := getConnection(nodeName)
	if err != nil {
		return err
	}

	// Build KILL QUERY statement (no cluster, direct query to node)
	killQuery := fmt.Sprintf("KILL QUERY WHERE query_id = '%s'", queryID)

	err = conn.Exec(ctx, killQuery)
	if err != nil {
		return fmt.Errorf("failed to kill query: %w", err)
	}

	// Record kill timestamp and cleanup later
	r.killGuards.Store(killKey, time.Now())
	go func() {
		time.Sleep(30 * time.Second)
		r.killGuards.Delete(killKey)
	}()

	return nil
}

func (r *ProcessRepository) buildWhereClause(nodeName string) (string, []interface{}) {
	// When querying specific node, we don't need WHERE clause for node filtering
	// since we're querying that specific node directly
	// The node will be returned by hostName() function
	return "1=1", []interface{}{}
}
