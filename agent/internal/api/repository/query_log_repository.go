package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

const microsecondLayout = "2006-01-02T15:04:05.000000Z07:00"

// QueryLogFilter describes filters applied to system.query_log reads.
type QueryLogFilter struct {
	From        time.Time
	To          time.Time
	User        string
	Node        string
	Search      string
	Status      string // "completed", "failed", or empty for all
	Limit       int
	Offset      int
	RangePreset string
}

// QueryLogRepository executes filtered reads against ClickHouse system.query_log.
type QueryLogRepository struct {
	manager     *clickhouse.Manager
	logger      *logger.Logger
	clusterName string
}

// NewQueryLogRepository creates a repository backed by the shared ClickHouse manager.
func NewQueryLogRepository(cfg *config.Config, log *logger.Logger) (*QueryLogRepository, error) {
	manager := clickhouse.GetInstance()
	if manager == nil {
		return nil, fmt.Errorf("clickhouse manager not initialized")
	}

	cluster := ""
	if cfg != nil {
		cluster = cfg.Database.ClickHouse.ClusterName
	}

	return &QueryLogRepository{
		manager:     manager,
		logger:      log,
		clusterName: cluster,
	}, nil
}

// List returns paginated query log entries and the total count for the applied filters.
func (r *QueryLogRepository) List(ctx context.Context, filter QueryLogFilter) ([]models.QueryLogEntry, int64, error) {
	// Get connection to specific node
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, 0, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if filter.Node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(filter.Node)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get connection for node %s: %w", filter.Node, err)
		}
	} else {
		// Use default connection if no node specified
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, 0, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	whereClause, args := r.buildWhereClause(filter)

	dataQuery := fmt.Sprintf(`
WITH hostName() AS node
SELECT
	node,
	event_time,
	event_time_microseconds,
	initial_user,
	user,
	query_id,
	query,
	query_kind,
	type,
	Settings,
	read_rows,
	read_bytes,
	written_rows,
	written_bytes,
	result_rows,
	result_bytes,
	memory_usage,
	query_duration_ms,
	exception_code,
	exception,
	client_hostname,
	databases,
	tables
FROM system.query_log
WHERE %s
ORDER BY event_time DESC
LIMIT ?
OFFSET ?`, whereClause)

	argsWithPagination := append(append([]any{}, args...), filter.Limit, filter.Offset)

	rows, err := conn.Query(ctx, dataQuery, argsWithPagination...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query ClickHouse: %w", err)
	}
	defer rows.Close()

	entries := make([]models.QueryLogEntry, 0, filter.Limit)
	for rows.Next() {
		var (
			node                  string
			eventTime             time.Time
			eventTimeMicroseconds time.Time
			initialUser           string
			user                  string
			queryID               string
			queryText             string
			queryKind             string
			queryType             string
			settings              map[string]string
			readRows              uint64
			readBytes             uint64
			writtenRows           uint64
			writtenBytes          uint64
			resultRows            uint64
			resultBytes           uint64
			memoryUsage           uint64 // UInt64 in system.query_log
			durationMs            uint64
			exceptionCode         int32
			exceptionText         string
			clientHostname        string
			databases             []string
			tables                []string
		)

		if err := rows.Scan(
			&node,
			&eventTime,
			&eventTimeMicroseconds,
			&initialUser,
			&user,
			&queryID,
			&queryText,
			&queryKind,
			&queryType,
			&settings,
			&readRows,
			&readBytes,
			&writtenRows,
			&writtenBytes,
			&resultRows,
			&resultBytes,
			&memoryUsage,
			&durationMs,
			&exceptionCode,
			&exceptionText,
			&clientHostname,
			&databases,
			&tables,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan query log row: %w", err)
		}

		// Convert settings map to JSON string
		settingsJSON := ""
		if len(settings) > 0 {
			settingsBytes, err := json.Marshal(settings)
			if err == nil {
				settingsJSON = string(settingsBytes)
			}
		}

		entry := models.QueryLogEntry{
			Node:                  node,
			EventTime:             eventTime.UTC().Format(time.RFC3339),
			EventTimeMicroseconds: eventTimeMicroseconds.UTC().Format(microsecondLayout),
			InitialUser:           initialUser,
			User:                  user,
			QueryID:               queryID,
			QueryKind:             queryKind,
			Type:                  queryType,
			Settings:              settingsJSON,
			QueryText:             queryText,
			ReadRows:              readRows,
			ReadBytes:             readBytes,
			WrittenRows:           writtenRows,
			WrittenBytes:          writtenBytes,
			ResultRows:            resultRows,
			ResultBytes:           resultBytes,
			MemoryUsage:           memoryUsage,
			DurationMs:            durationMs,
			ExceptionCode:         exceptionCode,
			Exception:             exceptionText,
			ClientHostname:        clientHostname,
			Databases:             databases,
			Tables:                tables,
		}

		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("query log iteration failed: %w", err)
	}

	total, err := r.count(ctx, filter, whereClause, args)
	if err != nil {
		return nil, 0, err
	}

	return entries, total, nil
}

func (r *QueryLogRepository) count(ctx context.Context, filter QueryLogFilter, whereClause string, args []any) (int64, error) {
	// Get connection to specific node
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return 0, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if filter.Node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(filter.Node)
		if err != nil {
			return 0, fmt.Errorf("failed to get connection for node %s: %w", filter.Node, err)
		}
	} else {
		// Use default connection if no node specified
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return 0, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	countQuery := fmt.Sprintf(`
WITH hostName() AS node
SELECT count()
FROM system.query_log
WHERE %s`, whereClause)

	rows, err := conn.Query(ctx, countQuery, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to count query logs: %w", err)
	}
	defer rows.Close()

	var total uint64
	if rows.Next() {
		if err := rows.Scan(&total); err != nil {
			return 0, fmt.Errorf("failed to scan count: %w", err)
		}
	}

	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("count iteration failed: %w", err)
	}

	return int64(total), nil
}

// GetStats returns query count statistics by status (running, finished, error).
func (r *QueryLogRepository) GetStats(ctx context.Context, filter QueryLogFilter) (models.QueryLogStatsResponse, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return models.QueryLogStatsResponse{}, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if filter.Node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(filter.Node)
		if err != nil {
			return models.QueryLogStatsResponse{}, fmt.Errorf("failed to get connection for node %s: %w", filter.Node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return models.QueryLogStatsResponse{}, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	// Build base WHERE clause for stats (without status filter, as we need all queries for stats)
	baseWhere, baseArgs := r.buildStatsWhereClause(filter)

	stats := models.QueryLogStatsResponse{}

	// Count running queries from system.processes (faster than query_log)
	runningWhere, runningArgs := r.buildProcessesWhereClause(filter)
	runningQuery := fmt.Sprintf(`
SELECT count()
FROM system.processes
WHERE %s`, runningWhere)

	rows, err := conn.Query(ctx, runningQuery, runningArgs...)
	if err != nil {
		return models.QueryLogStatsResponse{}, fmt.Errorf("failed to count running queries: %w", err)
	}
	if rows.Next() {
		var count uint64
		if err := rows.Scan(&count); err != nil {
			rows.Close()
			return models.QueryLogStatsResponse{}, fmt.Errorf("failed to scan running count: %w", err)
		}
		stats.Running = int64(count)
	}
	rows.Close()

	// Count finished queries: QueryFinish with exception_code = 0 or NULL
	finishedQuery := fmt.Sprintf(`
SELECT count()
FROM system.query_log
WHERE type = 'QueryFinish'
	AND (exception_code = 0 OR exception_code IS NULL)
	AND %s`, baseWhere)

	// Count error queries: QueryFinish with exception_code != 0
	errorQuery := fmt.Sprintf(`
SELECT count()
FROM system.query_log
WHERE exception_code != 0
	AND %s`, baseWhere)

	// Execute finished count
	rows, err = conn.Query(ctx, finishedQuery, baseArgs...)
	if err != nil {
		return models.QueryLogStatsResponse{}, fmt.Errorf("failed to count finished queries: %w", err)
	}
	if rows.Next() {
		var count uint64
		if err := rows.Scan(&count); err != nil {
			rows.Close()
			return models.QueryLogStatsResponse{}, fmt.Errorf("failed to scan finished count: %w", err)
		}
		stats.Finished = int64(count)
	}
	rows.Close()

	// Execute error count
	rows, err = conn.Query(ctx, errorQuery, baseArgs...)
	if err != nil {
		return models.QueryLogStatsResponse{}, fmt.Errorf("failed to count error queries: %w", err)
	}
	if rows.Next() {
		var count uint64
		if err := rows.Scan(&count); err != nil {
			rows.Close()
			return models.QueryLogStatsResponse{}, fmt.Errorf("failed to scan error count: %w", err)
		}
		stats.Error = int64(count)
	}
	rows.Close()

	return stats, nil
}

func (r *QueryLogRepository) buildWhereClause(filter QueryLogFilter) (string, []any) {
	conditions := []string{
		"event_time >= ?", // Date From filter - filters by event_time column
		"event_time <= ?", // Date To filter - filters by event_time column
		"NOT has(databases, 'system')",
		"lower(query_kind) NOT IN 'show'",
		"type != 'QueryStart'",
	}

	args := []any{filter.From, filter.To}

	if filter.User != "" {
		conditions = append(conditions, "(initial_user = ? OR user = ?)")
		args = append(args, filter.User, filter.User)
	}

	if filter.Search != "" {
		conditions = append(conditions, "query LIKE ?")
		args = append(args, "%"+filter.Search+"%")
	}

	// Filter by status: failed (exception_code IS NOT NULL AND exception_code != 0) or completed (exception_code = 0 OR exception_code IS NULL)
	if filter.Status == "failed" {
		conditions = append(conditions, "exception_code != 0")
	} else if filter.Status == "completed" {
		conditions = append(conditions, "(exception_code = 0 OR exception_code IS NULL)")
		conditions = append(conditions, "type = 'QueryFinish'")
	}

	return strings.Join(conditions, " AND "), args
}

// buildStatsWhereClause builds WHERE clause for stats queries (without type and status filters).
// Filters by event_time (Date Range, Date From, Date To filters affect counters here).
// Note: Node filtering is handled by connection selection, not WHERE clause.
func (r *QueryLogRepository) buildStatsWhereClause(filter QueryLogFilter) (string, []any) {
	conditions := []string{
		"event_time >= ?", // Date From filter
		"event_time <= ?", // Date To filter
		"NOT has(databases, 'system')",
		"lower(query_kind) NOT IN 'show'",
	}

	args := []any{filter.From, filter.To}

	if filter.User != "" {
		conditions = append(conditions, "(initial_user = ? OR user = ?)")
		args = append(args, filter.User, filter.User)
	}

	if filter.Search != "" {
		conditions = append(conditions, "query LIKE ?")
		args = append(args, "%"+filter.Search+"%")
	}

	return strings.Join(conditions, " AND "), args
}

// buildProcessesWhereClause builds WHERE clause for system.processes queries.
// For running queries, we only filter by user and search, not by time range,
// because running queries are current and don't have a completion time.
// Note: Node filtering is handled by connection selection, not WHERE clause.
func (r *QueryLogRepository) buildProcessesWhereClause(filter QueryLogFilter) (string, []any) {
	conditions := []string{}

	args := []any{}

	// Don't apply time filters to running queries - they are current queries
	// that may have started at any time. Only apply user and search filters.

	if filter.User != "" {
		conditions = append(conditions, "user = ?")
		args = append(args, filter.User)
	}

	if filter.Search != "" {
		conditions = append(conditions, "query LIKE ?")
		args = append(args, "%"+filter.Search+"%")
	}

	// If no conditions, return a condition that's always true
	if len(conditions) == 0 {
		return "1 = 1", args
	}

	return strings.Join(conditions, " AND "), args
}

// QueryLoadEntry represents CPU and memory load data for a query.
type QueryLoadEntry struct {
	EventTime   time.Time
	QueryID     string
	User        string
	DurationMs  uint64
	MemoryUsage uint64
	UserUs      uint64
	SystemUs    uint64
	VirtUs      uint64
	WaitUs      uint64
	NumCores    uint64
	RealUs      uint64
	CPULoad     float64
}

// GetLoadData returns CPU and memory load data for queries matching the filter (without pagination).
func (r *QueryLogRepository) GetLoadData(ctx context.Context, filter QueryLogFilter) ([]QueryLoadEntry, error) {
	clusterManager := r.manager.GetClusterManager()
	if clusterManager == nil {
		return nil, fmt.Errorf("cluster manager not available")
	}

	var conn driver.Conn
	var err error
	if filter.Node != "" {
		conn, _, err = clusterManager.GetConnectionByNodeName(filter.Node)
		if err != nil {
			return nil, fmt.Errorf("failed to get connection for node %s: %w", filter.Node, err)
		}
	} else {
		conn, _, err = clusterManager.GetConnection()
		if err != nil {
			return nil, fmt.Errorf("failed to get connection: %w", err)
		}
	}

	whereClause, args := r.buildWhereClause(filter)

	loadQuery := fmt.Sprintf(`
SELECT
	event_time,
	query_id,
	user,
	query_duration_ms,
	memory_usage,
	ProfileEvents['UserTimeMicroseconds'] AS user_us,
	ProfileEvents['SystemTimeMicroseconds'] AS system_us,
	ProfileEvents['OSCPUVirtualTimeMicroseconds'] AS virt_us,
	ProfileEvents['OSCPUWaitMicroseconds'] AS wait_us,
	peak_threads_usage AS num_cores,
	query_duration_ms * 1000 AS real_us,
	(((user_us + system_us + virt_us) / (real_us * num_cores))
        +
    (wait_us / (real_us * num_cores))) * 100
     AS cpu_load
FROM system.query_log
WHERE %s
ORDER BY event_time DESC`, whereClause)

	rows, err := conn.Query(ctx, loadQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query load data: %w", err)
	}
	defer rows.Close()

	entries := make([]QueryLoadEntry, 0)
	for rows.Next() {
		var (
			eventTime   time.Time
			queryID     string
			user        string
			durationMs  uint64
			memoryUsage uint64
			userUs      uint64
			systemUs    uint64
			virtUs      uint64
			waitUs      uint64
			numCores    uint64
			realUs      uint64
			cpuLoad     float64
		)

		if err := rows.Scan(
			&eventTime,
			&queryID,
			&user,
			&durationMs,
			&memoryUsage,
			&userUs,
			&systemUs,
			&virtUs,
			&waitUs,
			&numCores,
			&realUs,
			&cpuLoad,
		); err != nil {
			return nil, fmt.Errorf("failed to scan load data row: %w", err)
		}

		entry := QueryLoadEntry{
			EventTime:   eventTime,
			QueryID:     queryID,
			User:        user,
			DurationMs:  durationMs,
			MemoryUsage: memoryUsage,
			UserUs:      userUs,
			SystemUs:    systemUs,
			VirtUs:      virtUs,
			WaitUs:      waitUs,
			NumCores:    numCores,
			RealUs:      realUs,
			CPULoad:     cpuLoad,
		}

		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load data iteration failed: %w", err)
	}

	return entries, nil
}
