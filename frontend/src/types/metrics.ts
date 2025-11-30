export interface SystemMetrics {
  node_name: string
  timestamp: string
  cpu_load: number
  memory_usage: number
  memory_used_gb: number
  memory_total_gb: number
  disk_usage: number
  disk_used_gb: number
  disk_total_gb: number
  active_conns: number
  active_queries: number
}

export interface NodeInfo {
  name: string
  host: string
  cluster_name: string
}

export interface NodesResponse {
  nodes: NodeInfo[]
}

export interface MetricSeriesPoint {
  timestamp: string
  value: number
}

export interface MetricSeriesResponse {
  node: string
  metric: string
  period: string
  step: string
  from: string
  to: string
  points: MetricSeriesPoint[]
}

