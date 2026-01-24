import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { TableDetailsModal } from '../components/tables/TableDetailsModal';
import { ConfirmDeleteTableModal } from '../components/tables/ConfirmDeleteTableModal';
import { CopyTableModal } from '../components/tables/CopyTableModal';
import { TablesStatsCards } from '../components/tables/TablesStatsCards';
import { TablesFilter } from '../components/tables/TablesFilter';
import { TablesList, Table } from '../components/tables/TablesList';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';

interface TablesPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

// Mock data
const mockTables: Table[] = [
  {
    database: "mdm",
    name: "location_dedup",
    uuid: "3c33df02-5a93-414f-bffd-5e344b9c2abd",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/3c3/3c33df02-5a93-414f-bffd-5e344b9c2abd/",
      "/mnt/clickhouse/data2/store/3c3/3c33df02-5a93-414f-bffd-5e344b9c2abd/",
      "/mnt/clickhouse/data3/store/3c3/3c33df02-5a93-414f-bffd-5e344b9c2abd/"
    ],
    metadata_path: "store/279/27995447-d58f-447e-8d9d-a39bcd4a4623/location_dedup.sql",
    metadata_modification_time: "2025-12-05 01:03:32",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE mdm.location_dedup (`id` UUID, `street_id` Nullable(UUID), `status_id` Nullable(UUID), `house` Nullable(String), `building` Nullable(String), `postal_index` Nullable(String), `longitude` Nullable(String), `latitude` Nullable(String), `created_at` DateTime('UTC'), `updated_at` Nullable(DateTime('UTC')), `ver` DateTime('UTC') DEFAULT now()) ENGINE = MergeTree PARTITION BY toYYYYMM(created_at) ORDER BY id SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMM(created_at) ORDER BY id SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMM(created_at)",
    sorting_key: "id",
    primary_key: "id",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 11158799,
    total_bytes: 528734758,
    total_bytes_uncompressed: 918409446,
    parts: 65,
    active_parts: 65,
    total_marks: 1470,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "analytics",
    name: "events",
    uuid: "4d44ef03-6b94-525g-cgge-6f455c0d3bce",
    engine: "ReplicatedMergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/4d4/4d44ef03-6b94-525g-cgge-6f455c0d3bce/"
    ],
    metadata_path: "store/380/38006558-e69g-558f-9e0e-b40cde5b5734/events.sql",
    metadata_modification_time: "2025-12-04 15:22:18",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE analytics.events (`event_id` UUID, `user_id` UUID, `event_type` String, `event_data` String, `timestamp` DateTime('UTC')) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/analytics/events', '{replica}') PARTITION BY toYYYYMM(timestamp) ORDER BY (event_type, timestamp) SETTINGS index_granularity = 8192",
    engine_full: "ReplicatedMergeTree('/clickhouse/tables/{shard}/analytics/events', '{replica}') PARTITION BY toYYYYMM(timestamp) ORDER BY (event_type, timestamp) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMM(timestamp)",
    sorting_key: "event_type, timestamp",
    primary_key: "event_type, timestamp",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 45892341,
    total_bytes: 2156789012,
    total_bytes_uncompressed: 3845623901,
    parts: 124,
    active_parts: 124,
    total_marks: 5890,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "User events tracking table",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "production",
    name: "orders",
    uuid: "5e55fg04-7c05-636h-dhhe-7g566d1e4cdf",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/5e5/5e55fg04-7c05-636h-dhhe-7g566d1e4cdf/",
      "/mnt/clickhouse/data2/store/5e5/5e55fg04-7c05-636h-dhhe-7g566d1e4cdf/"
    ],
    metadata_path: "store/491/49117669-f70h-669g-0f1f-c51def6c6845/orders.sql",
    metadata_modification_time: "2025-12-03 09:45:51",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE production.orders (`order_id` UUID, `customer_id` UUID, `product_id` UUID, `quantity` Int32, `amount` Decimal(18, 2), `status` String, `created_at` DateTime('UTC'), `updated_at` Nullable(DateTime('UTC'))) ENGINE = MergeTree PARTITION BY toYYYYMM(created_at) ORDER BY (status, created_at) SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMM(created_at) ORDER BY (status, created_at) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMM(created_at)",
    sorting_key: "status, created_at",
    primary_key: "status, created_at",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 8934567,
    total_bytes: 445678234,
    total_bytes_uncompressed: 789234567,
    parts: 48,
    active_parts: 48,
    total_marks: 1156,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "logs",
    name: "system_logs",
    uuid: "6f66gh05-8d16-747i-eife-8h677e2f5deg",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/6f6/6f66gh05-8d16-747i-eife-8h677e2f5deg/"
    ],
    metadata_path: "store/502/50228770-g81i-770h-1g2g-d62efg7d7956/system_logs.sql",
    metadata_modification_time: "2025-12-02 18:30:22",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE logs.system_logs (`log_id` UUID, `level` String, `message` String, `source` String, `timestamp` DateTime('UTC')) ENGINE = MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY timestamp SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY timestamp SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMMDD(timestamp)",
    sorting_key: "timestamp",
    primary_key: "timestamp",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 123456789,
    total_bytes: 5678901234,
    total_bytes_uncompressed: 9876543210,
    parts: 456,
    active_parts: 456,
    total_marks: 15678,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "System logs storage",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "monitoring",
    name: "metrics_realtime",
    uuid: "7g77hi06-9e27-858j-fijf-9i788f3g6efh",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/7g7/7g77hi06-9e27-858j-fijf-9i788f3g6efh/"
    ],
    metadata_path: "store/613/61339881-h92j-881i-2h3h-e73fgh8e8067/metrics_realtime.sql",
    metadata_modification_time: "2025-12-01 12:15:40",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE monitoring.metrics_realtime (`metric_id` UUID, `name` String, `value` Float64, `tags` Map(String, String), `timestamp` DateTime('UTC')) ENGINE = MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY (name, timestamp) SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY (name, timestamp) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMMDD(timestamp)",
    sorting_key: "name, timestamp",
    primary_key: "name, timestamp",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 234567890,
    total_bytes: 8901234567,
    total_bytes_uncompressed: 15678901234,
    parts: 892,
    active_parts: 892,
    total_marks: 28901,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "Real-time metrics collection",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "warehouse",
    name: "sales_fact",
    uuid: "8h88ij07-0f38-969k-gjkg-0j899g4h7fgi",
    engine: "ReplicatedMergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/8h8/8h88ij07-0f38-969k-gjkg-0j899g4h7fgi/"
    ],
    metadata_path: "store/724/72440992-i03k-992j-3i4i-f84ghi9f9178/sales_fact.sql",
    metadata_modification_time: "2025-11-28 08:22:55",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE warehouse.sales_fact (`sale_id` UUID, `product_id` UUID, `customer_id` UUID, `sale_date` Date, `amount` Decimal(18, 2), `quantity` Int32) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/warehouse/sales_fact', '{replica}') PARTITION BY toYYYYMM(sale_date) ORDER BY (sale_date, product_id) SETTINGS index_granularity = 8192",
    engine_full: "ReplicatedMergeTree('/clickhouse/tables/{shard}/warehouse/sales_fact', '{replica}') PARTITION BY toYYYYMM(sale_date) ORDER BY (sale_date, product_id) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMM(sale_date)",
    sorting_key: "sale_date, product_id",
    primary_key: "sale_date, product_id",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 56789012,
    total_bytes: 3456789012,
    total_bytes_uncompressed: 6789012345,
    parts: 234,
    active_parts: 234,
    total_marks: 7890,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "staging",
    name: "temp_imports",
    uuid: "9i99jk08-1g49-070l-hklh-1k900h5i8ghj",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/9i9/9i99jk08-1g49-070l-hklh-1k900h5i8ghj/"
    ],
    metadata_path: "store/835/83551003-j14l-003k-4j5j-g95hij0g0289/temp_imports.sql",
    metadata_modification_time: "2025-12-05 06:45:12",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE staging.temp_imports (`import_id` UUID, `source` String, `data` String, `status` String, `created_at` DateTime('UTC')) ENGINE = MergeTree PARTITION BY toYYYYMMDD(created_at) ORDER BY created_at SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMMDD(created_at) ORDER BY created_at SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMMDD(created_at)",
    sorting_key: "created_at",
    primary_key: "created_at",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 2345678,
    total_bytes: 234567890,
    total_bytes_uncompressed: 456789012,
    parts: 45,
    active_parts: 45,
    total_marks: 567,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "Temporary import staging",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "metrics",
    name: "server_stats",
    uuid: "0j00kl09-2h50-181m-ilmi-2l011i6j9hik",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/0j0/0j00kl09-2h50-181m-ilmi-2l011i6j9hik/"
    ],
    metadata_path: "store/946/94662114-k25m-114l-5k6k-h06ijk1h1390/server_stats.sql",
    metadata_modification_time: "2025-12-04 20:10:33",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE metrics.server_stats (`server_id` String, `cpu_usage` Float32, `memory_usage` Float32, `disk_usage` Float32, `network_in` UInt64, `network_out` UInt64, `timestamp` DateTime('UTC')) ENGINE = MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY (server_id, timestamp) SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY (server_id, timestamp) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMMDD(timestamp)",
    sorting_key: "server_id, timestamp",
    primary_key: "server_id, timestamp",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 98765432,
    total_bytes: 4567890123,
    total_bytes_uncompressed: 8901234567,
    parts: 567,
    active_parts: 567,
    total_marks: 12345,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "kafka_streams",
    name: "incoming_messages",
    uuid: "1k11lm10-3i61-292n-jmnj-3m122j7k0ijl",
    engine: "Kafka",
    is_temporary: 0,
    data_paths: [],
    metadata_path: "store/057/05773225-l36n-225m-6l7l-i17jkl2i2401/incoming_messages.sql",
    metadata_modification_time: "2025-11-30 14:35:22",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE kafka_streams.incoming_messages (`message_id` String, `topic` String, `payload` String, `timestamp` DateTime('UTC')) ENGINE = Kafka SETTINGS kafka_broker_list = 'localhost:9092', kafka_topic_list = 'messages', kafka_group_name = 'clickhouse_consumer', kafka_format = 'JSONEachRow'",
    engine_full: "Kafka SETTINGS kafka_broker_list = 'localhost:9092', kafka_topic_list = 'messages', kafka_group_name = 'clickhouse_consumer', kafka_format = 'JSONEachRow'",
    as_select: "",
    partition_key: "",
    sorting_key: "",
    primary_key: "",
    sampling_key: "",
    storage_policy: "",
    total_rows: 0,
    total_bytes: 0,
    total_bytes_uncompressed: 0,
    parts: 0,
    active_parts: 0,
    total_marks: 0,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "Kafka stream table",
    has_own_data: 0,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "reports",
    name: "daily_summary",
    uuid: "2l22mn11-4j72-303o-knok-4n233k8l1jkm",
    engine: "SummingMergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/2l2/2l22mn11-4j72-303o-knok-4n233k8l1jkm/"
    ],
    metadata_path: "store/168/16884336-m47o-336n-7m8m-j28klm3j3512/daily_summary.sql",
    metadata_modification_time: "2025-12-03 11:20:45",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE reports.daily_summary (`report_date` Date, `category` String, `total_sales` Decimal(18, 2), `total_orders` Int32) ENGINE = SummingMergeTree PARTITION BY toYYYYMM(report_date) ORDER BY (report_date, category) SETTINGS index_granularity = 8192",
    engine_full: "SummingMergeTree PARTITION BY toYYYYMM(report_date) ORDER BY (report_date, category) SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMM(report_date)",
    sorting_key: "report_date, category",
    primary_key: "report_date, category",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 1234567,
    total_bytes: 123456789,
    total_bytes_uncompressed: 234567890,
    parts: 24,
    active_parts: 24,
    total_marks: 345,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  },
  {
    database: "external_data",
    name: "api_responses",
    uuid: "3m33no12-5k83-414p-lopl-5o344l9m2kln",
    engine: "MergeTree",
    is_temporary: 0,
    data_paths: [
      "/mnt/clickhouse/data1/store/3m3/3m33no12-5k83-414p-lopl-5o344l9m2kln/"
    ],
    metadata_path: "store/279/27995447-n58p-447o-8n9n-k39lmn4k4623/api_responses.sql",
    metadata_modification_time: "2025-12-02 16:55:18",
    metadata_version: 0,
    dependencies_database: [],
    dependencies_table: [],
    create_table_query: "CREATE TABLE external_data.api_responses (`request_id` UUID, `endpoint` String, `response_code` Int16, `response_body` String, `response_time_ms` Int32, `timestamp` DateTime('UTC')) ENGINE = MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY timestamp SETTINGS index_granularity = 8192",
    engine_full: "MergeTree PARTITION BY toYYYYMMDD(timestamp) ORDER BY timestamp SETTINGS index_granularity = 8192",
    as_select: "",
    partition_key: "toYYYYMMDD(timestamp)",
    sorting_key: "timestamp",
    primary_key: "timestamp",
    sampling_key: "",
    storage_policy: "default",
    total_rows: 34567890,
    total_bytes: 2345678901,
    total_bytes_uncompressed: 4567890123,
    parts: 178,
    active_parts: 178,
    total_marks: 4567,
    active_on_fly_data_mutations: 0,
    active_on_fly_alter_mutations: 0,
    active_on_fly_metadata_mutations: 0,
    lifetime_rows: null,
    lifetime_bytes: null,
    comment: "External API responses log",
    has_own_data: 1,
    loading_dependencies_database: [],
    loading_dependencies_table: [],
    loading_dependent_database: [],
    loading_dependent_table: []
  }
];

export function TablesPage({ onLogout, activePage, onPageChange }: TablesPageProps) {
  const { theme } = useTheme();
  const { success } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [tableToCopy, setTableToCopy] = useState<Table | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('All Databases');
  const [selectedEngine, setSelectedEngine] = useState('All Engines');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Get unique databases and engines
  const databases = Array.from(new Set(mockTables.map(t => t.database)));
  const engines = Array.from(new Set(mockTables.map(t => t.engine)));

  // Filter tables
  const filteredTables = mockTables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         table.database.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDatabase = selectedDatabase === 'All Databases' || table.database === selectedDatabase;
    const matchesEngine = selectedEngine === 'All Engines' || table.engine === selectedEngine;
    
    return matchesSearch && matchesDatabase && matchesEngine;
  });

  // Calculate stats
  const totalTables = filteredTables.length;
  const totalRows = filteredTables.reduce((sum, t) => sum + t.total_rows, 0);
  const totalSize = filteredTables.reduce((sum, t) => sum + t.total_bytes, 0);
  const totalParts = filteredTables.reduce((sum, t) => sum + t.parts, 0);

  // Pagination
  const totalPages = Math.ceil(filteredTables.length / itemsPerPage);

  const handleDeleteTable = () => {
    if (tableToDelete) {
      success(`Table ${tableToDelete.name} deleted successfully!`);
      setTableToDelete(null);
    }
  };

  const handleCopyTable = (newName: string) => {
    if (tableToCopy) {
      success(`Table ${tableToCopy.name} copied to ${newName} successfully!`);
      setTableToCopy(null);
    }
  };
  
  return (
    <div className="h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onCollapse={setSidebarCollapsed}
            onLogout={onLogout}
            activePage={activePage}
            onPageChange={onPageChange}
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={onLogout}
          activePage={activePage}
          onPageChange={onPageChange}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader 
            title="Tables" 
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          {/* Main Content */}
          <main className={`flex-1 overflow-y-auto custom-scrollbar ${
            theme === 'light' ? 'bg-gray-50/50' : 'bg-transparent'
          }`}>
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <TablesStatsCards
                totalTables={totalTables}
                totalRows={totalRows}
                totalSize={totalSize}
                totalParts={totalParts}
              />

              {/* Filter */}
              <TablesFilter
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                selectedDatabase={selectedDatabase}
                onDatabaseChange={(value) => {
                  setSelectedDatabase(value);
                  setCurrentPage(1);
                }}
                selectedEngine={selectedEngine}
                onEngineChange={(value) => {
                  setSelectedEngine(value);
                  setCurrentPage(1);
                }}
                databases={databases}
                engines={engines}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                isApplyingFilters={isApplyingFilters}
                onApplyFilters={() => {
                  setCurrentPage(1);
                  setIsApplyingFilters(true);
                  setTimeout(() => setIsApplyingFilters(false), 1000);
                }}
              />

              {/* Tables List */}
              <TablesList
                tables={filteredTables}
                onTableClick={(table) => setSelectedTable(table)}
                onDeleteClick={(table) => setTableToDelete(table)}
                onCopyClick={(table) => setTableToCopy(table)}
                itemsPerPage={itemsPerPage}
              />
            </div>
          </main>
        </div>
      </div>

      {/* Table Details Modal */}
      <TableDetailsModal
        isOpen={selectedTable !== null}
        onClose={() => setSelectedTable(null)}
        table={selectedTable}
        onDelete={(table) => setTableToDelete(table)}
        onCopy={(table) => setTableToCopy(table)}
      />

      {/* Confirm Delete Table Modal */}
      <ConfirmDeleteTableModal
        isOpen={tableToDelete !== null}
        onClose={() => setTableToDelete(null)}
        table={tableToDelete}
        onConfirm={handleDeleteTable}
      />

      {/* Copy Table Modal */}
      <CopyTableModal
        isOpen={tableToCopy !== null}
        onClose={() => setTableToCopy(null)}
        table={tableToCopy}
        onConfirm={handleCopyTable}
      />
    </div>
  );
}