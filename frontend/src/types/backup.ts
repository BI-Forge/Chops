export interface Backup {
  id: string
  name: string
  base_backup_name: string
  query_id: string
  status: string // BACKUP_CREATED, BACKUP_FAILED, BACKUP_IN_PROGRESS, BACKUP_COMPLETED
  error: string
  start_time: string
  end_time: string
  num_files: number // uint64 from backend
  total_size: number // uint64 from backend, bytes
  num_entries: number // uint64 from backend
  uncompressed_size: number // uint64 from backend, bytes
  compressed_size: number // uint64 from backend, bytes
  files_read: number // uint64 from backend
  bytes_read: number // uint64 from backend, bytes
  sql_query?: string // SQL query used for backup
}

export interface BackupStatsResponse {
  total: number // uint64 from backend
  in_progress: number // uint64 from backend
  completed: number // uint64 from backend
  failed: number // uint64 from backend
}

export interface BackupListResponse {
  items: Backup[]
  pagination: BackupPagination
}

export interface BackupPagination {
  limit: number
  offset: number
  total: number // uint64 from backend
}

