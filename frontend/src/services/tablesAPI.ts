import api from './api'

export interface TablesListApiItem {
  uuid: string
  name: string
  database: string
  engine: string
  rows: number
  parts: number
  active_parts: number
  bytes: string
  size_bytes: number
}

export interface TablesListApiResponse {
  tables: TablesListApiItem[]
  total: number
  limit: number
  offset: number
}

export interface TablesStatsApiResponse {
  total_tables: number
  total_rows: number
  total_size: string
  total_parts: number
}

export interface TableDetailsApiResponse {
  database: string
  name: string
  uuid: string
  engine: string
  is_temporary: number
  data_paths: string[]
  metadata_path: string
  metadata_modification_time: string
  dependencies_database: string[]
  dependencies_table: string[]
  create_table_query: string
  engine_full: string
  as_select: string
  partition_key: string
  sorting_key: string
  primary_key: string
  sampling_key: string
  storage_policy: string
  total_rows?: number
  total_bytes?: number
  total_bytes_uncompressed?: number
  lifetime_rows?: number | null
  lifetime_bytes?: number | null
  comment: string
  has_own_data: number
  loading_dependencies_database: string[]
  loading_dependencies_table: string[]
  loading_dependent_database: string[]
  loading_dependent_table: string[]
  parts: number
  active_parts: number
}

export interface TableCopyResult {
  database: string
  name: string
  uuid: string
}

export interface TablesListParams {
  node?: string
  name?: string
  schema?: string
  engine?: string
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export const tablesAPI = {
  getTablesList: async (params: TablesListParams): Promise<TablesListApiResponse> => {
    const response = await api.get<TablesListApiResponse>('/clickhouse/tables/list', { params })
    return response.data
  },

  getTablesStats: async (node?: string): Promise<TablesStatsApiResponse> => {
    const response = await api.get<TablesStatsApiResponse>('/clickhouse/tables/stats', {
      params: node ? { node } : {},
    })
    return response.data
  },

  getTableDetails: async (uuid: string, node?: string): Promise<TableDetailsApiResponse> => {
    const response = await api.get<TableDetailsApiResponse>(`/clickhouse/tables/details/${encodeURIComponent(uuid)}`, {
      params: node ? { node } : {},
    })
    return response.data
  },

  deleteTable: async (uuid: string, node?: string): Promise<void> => {
    await api.delete(`/clickhouse/tables/${encodeURIComponent(uuid)}`, {
      params: node ? { node } : {},
    })
  },

  copyTable: async (uuid: string, newName: string, node?: string): Promise<TableCopyResult> => {
    const response = await api.post<TableCopyResult>(
      `/clickhouse/tables/${encodeURIComponent(uuid)}/copy`,
      { name: newName },
      { params: node ? { node } : {} }
    )
    return response.data
  },
}
