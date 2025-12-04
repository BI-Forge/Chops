/**
 * API mock responses for E2E tests
 */

export const mockAuthResponses = {
  loginSuccess: {
    token: 'test-jwt-token-12345',
    type: 'Bearer',
    expires_in: 86400,
  },
  loginError: {
    error: 'Invalid credentials',
    message: 'Username or password is incorrect',
  },
  registerSuccess: {
    token: 'test-jwt-token-12345',
    type: 'Bearer',
    expires_in: 86400,
  },
  registerError: {
    error: 'Registration failed',
    message: 'Username or email already exists',
  },
  userInfo: {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
  },
};

export const mockMetricsResponses = {
  nodes: {
    nodes: [
      {
        name: 'test_node',
        host: 'test_clickhouse',
        port: 9000,
        available: true,
      },
    ],
  },
  currentMetrics: {
    node_name: 'test_node',
    cpu_load: 25.5,
    memory_load: 50.0,
    storage_used: 30.0,
    active_connections: 10,
    active_queries: 5,
  },
  metricSeries: {
    node: 'test_node',
    metric: 'cpu_load',
    period: '1h',
    step: '1m',
    points: [
      { timestamp: '2025-12-02T18:00:00Z', value: 25.0 },
      { timestamp: '2025-12-02T18:01:00Z', value: 26.0 },
      { timestamp: '2025-12-02T18:02:00Z', value: 27.0 },
    ],
  },
};

export const mockQueryLogResponses = {
  queries: {
    items: [
      {
        id: 'query-1',
        query: 'SELECT * FROM system.tables',
        user: 'testuser',
        timestamp: '2025-12-02T18:00:00Z',
        duration_ms: 100,
        status: 'completed',
      },
      {
        id: 'query-2',
        query: 'SELECT count() FROM system.processes',
        user: 'testuser',
        timestamp: '2025-12-02T18:01:00Z',
        duration_ms: 50,
        status: 'completed',
      },
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 50,
    },
  },
  stats: {
    total_queries: 100,
    avg_duration_ms: 150.5,
    failed_queries: 5,
    successful_queries: 95,
  },
};

