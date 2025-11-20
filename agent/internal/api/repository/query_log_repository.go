package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"clickhouse-ops/internal/api/v1/models"
	"clickhouse-ops/internal/clickhouse"
	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"
)

const microsecondLayout = "2006-01-02T15:04:05.000000Z07:00"

// QueryLogFilter describes filters applied to system.query_log reads.
type QueryLogFilter struct {
	From        time.Time
	To          time.Time
	User        string
	Node        string
	Limit       int
	Offset      int
	RangePreset string
}

// QueryLogRepository executes filtered reads against ClickHouse system.query_log.
type QueryLogRepository struct {
	executor    *clickhouse.QueryExecutor
	logger      *logger.Logger
	clusterName string
}

// NewQueryLogRepository creates a repository backed by the shared ClickHouse executor.
func NewQueryLogRepository(cfg *config.Config, log *logger.Logger) (*QueryLogRepository, error) {
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

	return &QueryLogRepository{
		executor:    exec,
		logger:      log,
		clusterName: cluster,
	}, nil
}

// List returns paginated query log entries and the total count for the applied filters.
func (r *QueryLogRepository) List(ctx context.Context, filter QueryLogFilter) ([]models.QueryLogEntry, int64, error) {
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
FROM %s
WHERE %s
ORDER BY event_time DESC
LIMIT ?
OFFSET ?`, r.dataSource(), whereClause)

	argsWithPagination := append(append([]any{}, args...), filter.Limit, filter.Offset)

	rows, err := r.executor.Query(ctx, dataQuery, argsWithPagination...)
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
			readRows              uint64
			readBytes             uint64
			writtenRows           uint64
			writtenBytes          uint64
			resultRows            uint64
			resultBytes           uint64
			memoryUsage           uint64
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

		entry := models.QueryLogEntry{
			Node:                  node,
			EventTime:             eventTime.UTC().Format(time.RFC3339),
			EventTimeMicroseconds: eventTimeMicroseconds.UTC().Format(microsecondLayout),
			InitialUser:           initialUser,
			User:                  user,
			QueryID:               queryID,
			QueryKind:             queryKind,
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

	total, err := r.count(ctx, whereClause, args)
	if err != nil {
		return nil, 0, err
	}

	return entries, total, nil
}

func (r *QueryLogRepository) count(ctx context.Context, whereClause string, args []any) (int64, error) {
	countQuery := fmt.Sprintf(`
WITH hostName() AS node
SELECT count()
FROM %s
WHERE %s`, r.dataSource(), whereClause)

	rows, err := r.executor.Query(ctx, countQuery, args...)
	if err != nil {
		return 0, fmt.Errorf("failed to count query logs: %w", err)
	}
	defer rows.Close()

	var total int64
	if rows.Next() {
		if err := rows.Scan(&total); err != nil {
			return 0, fmt.Errorf("failed to scan count: %w", err)
		}
	}

	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("count iteration failed: %w", err)
	}

	return total, nil
}

func (r *QueryLogRepository) dataSource() string {
	if r.clusterName != "" {
		return fmt.Sprintf("clusterAllReplicas('%s', system.query_log)", r.clusterName)
	}
	return "system.query_log"
}

func (r *QueryLogRepository) buildWhereClause(filter QueryLogFilter) (string, []any) {
	conditions := []string{
		"type = 'QueryFinish'",
		"event_time >= ?",
		"event_time <= ?",
	}

	args := []any{filter.From, filter.To}

	if filter.User != "" {
		conditions = append(conditions, "(initial_user = ? OR user = ?)")
		args = append(args, filter.User, filter.User)
	}

	if filter.Node != "" {
		conditions = append(conditions, "node = ?")
		args = append(args, filter.Node)
	}

	return strings.Join(conditions, " AND "), args
}
