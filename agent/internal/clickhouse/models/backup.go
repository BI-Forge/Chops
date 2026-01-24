package models

// Backup represents a single backup record from ClickHouse system.backups table
type Backup struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	BaseBackupName   string `json:"base_backup_name"`
	QueryID          string `json:"query_id"`
	Status           string `json:"status"` // BACKUP_CREATED, BACKUP_FAILED, BACKUP_IN_PROGRESS, BACKUP_COMPLETED
	Error            string `json:"error"`
	StartTime        string `json:"start_time"`
	EndTime          string `json:"end_time"`
	NumFiles         uint64 `json:"num_files"`
	TotalSize        uint64 `json:"total_size"` // bytes
	NumEntries       uint64 `json:"num_entries"`
	UncompressedSize uint64 `json:"uncompressed_size"` // bytes
	CompressedSize   uint64 `json:"compressed_size"`   // bytes
	FilesRead        uint64 `json:"files_read"`
	BytesRead        uint64 `json:"bytes_read"` // bytes
	SQLQuery         string `json:"sql_query"`
}
