import type { Table } from '../components/tables/TablesList'

// Maps GET /tables/details response into the Table shape used by TableDetailsModal.
export function mapTableDetailsToTable(d: {
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
}): Table {
  return {
    database: d.database,
    name: d.name,
    uuid: d.uuid,
    engine: d.engine,
    is_temporary: d.is_temporary,
    data_paths: d.data_paths ?? [],
    metadata_path: d.metadata_path ?? '',
    metadata_modification_time: d.metadata_modification_time ?? '',
    metadata_version: 0,
    dependencies_database: d.dependencies_database ?? [],
    dependencies_table: d.dependencies_table ?? [],
    create_table_query: d.create_table_query ?? '',
    engine_full: d.engine_full ?? '',
    as_select: d.as_select ?? '',
    partition_key: d.partition_key ?? '',
    sorting_key: d.sorting_key ?? '',
    primary_key: d.primary_key ?? '',
    sampling_key: d.sampling_key ?? '',
    storage_policy: d.storage_policy ?? '',
    total_rows: Number(d.total_rows ?? 0),
    total_bytes: Number(d.total_bytes ?? 0),
    total_bytes_uncompressed: Number(d.total_bytes_uncompressed ?? 0),
    parts: Number(d.parts),
    active_parts: Number(d.active_parts),
    total_marks: 0,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: d.lifetime_rows ?? null,
    lifetime_bytes: d.lifetime_bytes ?? null,
    comment: d.comment ?? '',
    has_own_data: d.has_own_data,
    loading_dependencies_database: d.loading_dependencies_database ?? [],
    loading_dependencies_table: d.loading_dependencies_table ?? [],
    loading_dependent_database: d.loading_dependent_database ?? [],
    loading_dependent_table: d.loading_dependent_table ?? [],
  }
}
