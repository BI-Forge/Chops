package sync_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"clickhouse-ops/internal/config"
	"clickhouse-ops/internal/logger"

	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
	"github.com/stretchr/testify/mock"
)

// MockConn is a mock implementation of driver.Conn
type MockConn struct {
	mock.Mock
}

func (m *MockConn) Contributors() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

func (m *MockConn) ServerVersion() (*driver.ServerVersion, error) {
	args := m.Called()
	return args.Get(0).(*driver.ServerVersion), args.Error(1)
}

func (m *MockConn) Select(ctx context.Context, dest interface{}, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Get(0).(driver.Rows), mockArgs.Error(1)
}

func (m *MockConn) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Get(0).(driver.Row)
}

func (m *MockConn) Exec(ctx context.Context, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) AsyncInsert(ctx context.Context, query string, wait bool, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, wait, args)
	return mockArgs.Error(0)
}

func (m *MockConn) AsyncInsertQuery(ctx context.Context, query string, args ...interface{}) error {
	mockArgs := m.Called(ctx, query, args)
	return mockArgs.Error(0)
}

func (m *MockConn) Ping(ctx context.Context) error {
	mockArgs := m.Called(ctx)
	return mockArgs.Error(0)
}

func (m *MockConn) Stats() driver.Stats {
	args := m.Called()
	return args.Get(0).(driver.Stats)
}

func (m *MockConn) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockConn) PrepareBatch(ctx context.Context, query string, opts ...driver.PrepareBatchOption) (driver.Batch, error) {
	mockArgs := m.Called(ctx, query, opts)
	if mockArgs.Get(0) == nil {
		return nil, mockArgs.Error(1)
	}
	return mockArgs.Get(0).(driver.Batch), mockArgs.Error(1)
}

// MockRow is a mock implementation of driver.Row
type MockRow struct {
	mock.Mock
	scanValues []interface{}
}

func NewMockRow(scanValues ...interface{}) *MockRow {
	return &MockRow{
		scanValues: scanValues,
	}
}

func (m *MockRow) Err() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockRow) Scan(dest ...interface{}) error {
	if len(dest) != len(m.scanValues) {
		return errors.New("scan values count mismatch")
	}
	for i, val := range m.scanValues {
		switch d := dest[i].(type) {
		case *int64:
			if v, ok := val.(int64); ok {
				*d = v
			} else {
				return errors.New("type mismatch for int64")
			}
		case *time.Time:
			if v, ok := val.(time.Time); ok {
				*d = v
			} else {
				return errors.New("type mismatch for time.Time")
			}
		case *string:
			if v, ok := val.(string); ok {
				*d = v
			} else {
				return errors.New("type mismatch for string")
			}
		default:
			return errors.New("unsupported scan type")
		}
	}
	return nil
}

func (m *MockRow) ScanStruct(dest interface{}) error {
	args := m.Called(dest)
	return args.Error(0)
}

// MockRows is a mock implementation of driver.Rows
type MockRows struct {
	mock.Mock
	data [][]interface{}
	pos  int
}

func NewMockRows(data [][]interface{}) *MockRows {
	return &MockRows{
		data: data,
		pos:  -1,
	}
}

func (m *MockRows) Next() bool {
	m.pos++
	return m.pos < len(m.data)
}

func (m *MockRows) Scan(dest ...interface{}) error {
	if m.pos < 0 || m.pos >= len(m.data) {
		return errors.New("no more rows")
	}
	row := m.data[m.pos]
	if len(dest) != len(row) {
		return errors.New("scan values count mismatch")
	}
	for i, val := range row {
		switch d := dest[i].(type) {
		case *int64:
			if v, ok := val.(int64); ok {
				*d = v
			}
		case *time.Time:
			if v, ok := val.(time.Time); ok {
				*d = v
			}
		case *string:
			if v, ok := val.(string); ok {
				*d = v
			}
		}
	}
	return nil
}

func (m *MockRows) Totals(dest ...interface{}) error {
	args := m.Called(dest)
	return args.Error(0)
}

func (m *MockRows) Extremes(dest ...interface{}) error {
	args := m.Called(dest)
	return args.Error(0)
}

func (m *MockRows) Columns() []string {
	args := m.Called()
	return args.Get(0).([]string)
}

func (m *MockRows) Close() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockRows) Err() error {
	args := m.Called()
	return args.Error(0)
}

// MockClusterManager is a mock implementation of cluster manager
type MockClusterManager struct {
	mock.Mock
	nodes []config.ClickHouseNode
}

func NewMockClusterManager(nodes []config.ClickHouseNode) *MockClusterManager {
	return &MockClusterManager{
		nodes: nodes,
	}
}

func (m *MockClusterManager) GetAllNodes() []config.ClickHouseNode {
	return m.nodes
}

func (m *MockClusterManager) GetWorkingConnections() int {
	args := m.Called()
	return args.Int(0)
}

func (m *MockClusterManager) GetConnection() (driver.Conn, int, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).(driver.Conn), args.Int(1), args.Error(2)
}

func (m *MockClusterManager) GetConnectionByNodeName(name string) (driver.Conn, int, error) {
	args := m.Called(name)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).(driver.Conn), args.Int(1), args.Error(2)
}

func setupTestLogger(t *testing.T) *logger.Logger {
	return logger.New(logger.InfoLevel, "text")
}
