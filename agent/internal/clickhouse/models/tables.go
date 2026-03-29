package models

// TableList holds raw table metadata from system.tables joined with system.parts aggregates.
type TableList struct {
	UUID        string
	Name        string
	Database    string
	Engine      string
	Rows        uint64
	Parts       uint64
	ActiveParts uint64
	Bytes       uint64
}

// TableDetails holds full table metadata from system.tables plus parts counts from system.parts.
// All fields from system.tables are included; Parts and ActiveParts come from join with system.parts.
type TableDetails struct {
	// system.tables columns
	Database                   string   `json:"database"`
	Name                       string   `json:"name"`
	UUID                       string   `json:"uuid"`
	Engine                     string   `json:"engine"`
	IsTemporary                uint8    `json:"is_temporary"`
	DataPaths                  []string `json:"data_paths"`
	MetadataPath               string   `json:"metadata_path"`
	MetadataModificationTime    string   `json:"metadata_modification_time"`
	DependenciesDatabase       []string `json:"dependencies_database"`
	DependenciesTable          []string `json:"dependencies_table"`
	CreateTableQuery           string   `json:"create_table_query"`
	EngineFull                 string   `json:"engine_full"`
	AsSelect                   string   `json:"as_select"`
	PartitionKey               string   `json:"partition_key"`
	SortingKey                 string   `json:"sorting_key"`
	PrimaryKey                 string   `json:"primary_key"`
	SamplingKey                string   `json:"sampling_key"`
	StoragePolicy              string   `json:"storage_policy"`
	TotalRows                  *uint64  `json:"total_rows,omitempty"`
	TotalBytes                 *uint64  `json:"total_bytes,omitempty"`
	TotalBytesUncompressed     *uint64  `json:"total_bytes_uncompressed,omitempty"`
	LifetimeRows               *uint64 `json:"lifetime_rows,omitempty"`
	LifetimeBytes              *uint64  `json:"lifetime_bytes,omitempty"`
	Comment                    string   `json:"comment"`
	HasOwnData                 uint8    `json:"has_own_data"`
	LoadingDependenciesDatabase []string `json:"loading_dependencies_database"`
	LoadingDependenciesTable    []string `json:"loading_dependencies_table"`
	LoadingDependentDatabase    []string `json:"loading_dependent_database"`
	LoadingDependentTable       []string `json:"loading_dependent_table"`
	// From system.parts join
	Parts       uint64 `json:"parts"`
	ActiveParts uint64 `json:"active_parts"`
}

// TableCopyResult identifies a table created by copy-from-UUID.
type TableCopyResult struct {
	Database string `json:"database"`
	Name     string `json:"name"`
	UUID     string `json:"uuid"`
}

// TablesTotals provides aggregated counters across all ClickHouse tables.
type TablesTotals struct {
	TotalTables uint64
	TotalRows   uint64
	TotalBytes  uint64
	TotalParts  uint64
} 
