-- ClickHouse SQL Queries for User Creation
-- This file contains SQL queries for creating profiles, roles, users, databases, and tables in ClickHouse

-- ============================================
-- 0. CREATE DATABASE
-- ============================================
-- Creates a database (schema) in ClickHouse
-- Databases in ClickHouse are similar to schemas in other databases

-- Simple database creation
CREATE DATABASE IF NOT EXISTS `analytics`;

CREATE DATABASE IF NOT EXISTS `production`;

CREATE DATABASE IF NOT EXISTS `staging`;

CREATE DATABASE IF NOT EXISTS `test`;

-- Database with engine (for distributed setups)
CREATE DATABASE IF NOT EXISTS `analytics_replicated`
ENGINE = Replicated('/clickhouse/databases/analytics', '{replica}');

-- Database with cluster engine (for sharded setups)
CREATE DATABASE IF NOT EXISTS `analytics_sharded`
ENGINE = Distributed('my_cluster', 'analytics', 'shard');

-- ============================================
-- 0.1. CREATE TABLES
-- ============================================
-- Creates tables in ClickHouse with various engines and configurations

-- Example 1: MergeTree table (most common for analytics)
CREATE TABLE IF NOT EXISTS `analytics`.`events`
(
    `id` UUID,
    `user_id` UUID,
    `event_type` String,
    `event_data` String,
    `timestamp` DateTime('UTC'),
    `created_at` DateTime DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, timestamp)
SETTINGS index_granularity = 8192;

-- Example 2: ReplicatedMergeTree table (for high availability)
CREATE TABLE IF NOT EXISTS `analytics`.`events_replicated`
(
    `id` UUID,
    `user_id` UUID,
    `event_type` String,
    `event_data` String,
    `timestamp` DateTime('UTC'),
    `created_at` DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/analytics/events_replicated', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, timestamp)
SETTINGS index_granularity = 8192;

-- Example 3: Users table with various data types
CREATE TABLE IF NOT EXISTS `analytics`.`users`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `name` String,
    `email` String,
    `status` Enum8('active' = 1, 'inactive' = 2, 'suspended' = 3),
    `metadata` Map(String, String),
    `settings` Map(String, String),
    `created_at` DateTime('UTC') DEFAULT now(),
    `updated_at` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (id, created_at)
SETTINGS index_granularity = 8192;

-- Example 4: Logs table with TTL (Time To Live)
CREATE TABLE IF NOT EXISTS `analytics`.`logs`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `level` String,
    `message` String,
    `source` String,
    `timestamp` DateTime('UTC') DEFAULT now(),
    `metadata` Map(String, String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (level, timestamp)
TTL timestamp + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- Example 5: Metrics table with Map type
CREATE TABLE IF NOT EXISTS `analytics`.`metrics_snapshot`
(
    `timestamp` DateTime('UTC'),
    `node_name` String,
    `profile` Map(String, Float64)
)
ENGINE = MergeTree
PARTITION BY toDate(timestamp)
ORDER BY (node_name, timestamp)
SETTINGS index_granularity = 8192;

-- Example 6: Orders table with complex partitioning
CREATE TABLE IF NOT EXISTS `production`.`orders`
(
    `order_id` UUID DEFAULT generateUUIDv4(),
    `user_id` UUID,
    `product_id` UUID,
    `quantity` UInt32,
    `price` Decimal(10, 2),
    `status` String,
    `created_at` DateTime('UTC') DEFAULT now(),
    `updated_at` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY (toYYYYMM(created_at), status)
ORDER BY (order_id, created_at)
SETTINGS index_granularity = 8192;

-- Example 7: Settings table
CREATE TABLE IF NOT EXISTS `analytics`.`settings`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `name` String,
    `value` String,
    `type` String,
    `description` String,
    `created_at` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (name, created_at)
SETTINGS index_granularity = 8192;

-- Example 8: Reports table
CREATE TABLE IF NOT EXISTS `production`.`reports`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `name` String,
    `status` String,
    `data` String,
    `created_at` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(created_at)
ORDER BY (id, created_at)
SETTINGS index_granularity = 8192;

-- ============================================
-- 1. CREATE PROFILE
-- ============================================
-- Creates a settings profile that can be assigned to users
-- Profiles define user-level settings like memory limits, query timeouts, etc.

CREATE PROFILE IF NOT EXISTS `analyst_profile` SETTINGS
    max_memory_usage = 10000000000,           -- 10GB memory limit
    max_execution_time = 300,                 -- 5 minutes query timeout
    max_rows_to_read = 1000000000,            -- 1 billion rows limit
    max_bytes_to_read = 100000000000,         -- 100GB read limit
    max_result_rows = 10000000,               -- 10 million result rows
    max_result_bytes = 1000000000,            -- 1GB result size
    readonly = 0,                             -- Allow writes (0 = false)
    allow_ddl = 1,                            -- Allow DDL operations
    max_columns_to_read = 1000,               -- Maximum columns to read
    max_temporary_columns = 1000,             -- Maximum temporary columns
    max_subquery_depth = 100,                 -- Maximum subquery depth
    max_pipeline_depth = 1000,                -- Maximum pipeline depth
    max_ast_depth = 1000,                     -- Maximum AST depth
    max_ast_elements = 50000;                 -- Maximum AST elements

-- Example: Create a readonly profile
CREATE PROFILE IF NOT EXISTS `readonly_profile` SETTINGS
    readonly = 1,                             -- Read-only mode
    max_memory_usage = 5000000000,            -- 5GB memory limit
    max_execution_time = 600,                 -- 10 minutes query timeout
    max_rows_to_read = 500000000,             -- 500 million rows limit
    max_result_rows = 5000000,                -- 5 million result rows
    allow_ddl = 0,                            -- Disallow DDL operations
    allow_introspection_functions = 0;        -- Disallow introspection functions

-- ============================================
-- 2. CREATE ROLE
-- ============================================
-- Creates a role that can be assigned to users
-- Roles group permissions (grants) together

CREATE ROLE IF NOT EXISTS `analyst_role`;

CREATE ROLE IF NOT EXISTS `developer_role`;

CREATE ROLE IF NOT EXISTS `readonly_role`;

-- ============================================
-- 3. GRANT PERMISSIONS TO ROLE
-- ============================================
-- Grant permissions to roles before assigning roles to users

-- Grant SELECT on specific database to analyst_role
GRANT SELECT ON `analytics`.* TO `analyst_role`;

-- Grant SELECT, INSERT on specific database to developer_role
GRANT SELECT, INSERT ON `analytics`.* TO `developer_role`;

-- Grant ALL on specific database to developer_role
GRANT ALL ON `analytics`.* TO `developer_role`;

-- Grant SELECT on specific table to readonly_role
GRANT SELECT ON `analytics`.`events` TO `readonly_role`;

-- Grant SELECT on specific columns to readonly_role
GRANT SELECT(`id`, `name`, `created_at`) ON `analytics`.`users` TO `readonly_role`;

-- Grant system-level permissions
GRANT SYSTEM ON CLUSTER `my_cluster` TO `developer_role`;

-- Grant access to specific functions
GRANT dictGet ON `analytics`.`dictionary_name` TO `analyst_role`;

-- ============================================
-- 4. CREATE USER WITH PROFILE, ROLE, GRANTS, DATABASES, AND TABLES
-- ============================================
-- Creates a user with all settings in one operation
-- Note: In ClickHouse, you cannot create user with all settings in a single statement
-- You need to execute multiple statements in sequence

-- Step 1: Create the user with password and default profile
CREATE USER IF NOT EXISTS `new_user` 
    IDENTIFIED BY 'secure_password_123'
    DEFAULT ROLE `analyst_role`
    PROFILE `analyst_profile`
    HOST IP '::/0';  -- Allow from any IP (use specific IPs in production)

-- Step 2: Grant role to user (if not set as default role)
GRANT `analyst_role` TO `new_user`;

-- Step 3: Grant additional permissions directly to user (if needed)
-- These grants are in addition to role-based grants
GRANT SELECT ON `production`.* TO `new_user`;
GRANT SELECT, INSERT ON `staging`.* TO `new_user`;

-- Step 4: Grant permissions on specific tables
GRANT SELECT ON `analytics`.`events` TO `new_user`;
GRANT SELECT, INSERT ON `analytics`.`logs` TO `new_user`;

-- Step 5: Grant permissions on specific columns
GRANT SELECT(`id`, `name`, `email`) ON `analytics`.`users` TO `new_user`;
GRANT SELECT(`id`, `name`), INSERT(`id`, `name`, `value`) ON `analytics`.`settings` TO `new_user`;

-- Step 6: Grant database-level permissions
GRANT CREATE DATABASE ON `analytics` TO `new_user`;
GRANT DROP DATABASE ON `staging` TO `new_user`;

-- Step 7: Grant additional system permissions (if needed)
GRANT SYSTEM ON CLUSTER `my_cluster` TO `new_user`;

-- ============================================
-- COMPLETE EXAMPLE: Create user with all components
-- ============================================

-- 1. Create profile
CREATE PROFILE IF NOT EXISTS `custom_profile` SETTINGS
    max_memory_usage = 20000000000,
    max_execution_time = 600,
    readonly = 0,
    allow_ddl = 1;

-- 2. Create role
CREATE ROLE IF NOT EXISTS `custom_role`;

-- 3. Grant permissions to role
GRANT SELECT ON `analytics`.* TO `custom_role`;
GRANT SELECT, INSERT ON `staging`.* TO `custom_role`;
GRANT ALL ON `test`.* TO `custom_role`;

-- 4. Create user
CREATE USER IF NOT EXISTS `john_doe` 
    IDENTIFIED BY 'MySecurePassword123!'
    DEFAULT ROLE `custom_role`
    PROFILE `custom_profile`
    HOST IP '192.168.1.0/24', IP '10.0.0.0/8';  -- Allow from specific networks

-- 5. Grant role to user (if not already default)
GRANT `custom_role` TO `john_doe`;

-- 6. Grant additional direct permissions to user
GRANT SELECT ON `production`.`reports` TO `john_doe`;
GRANT SELECT(`id`, `name`, `status`) ON `production`.`orders` TO `john_doe`;

-- 7. Grant system permissions (optional)
GRANT SYSTEM ON CLUSTER `my_cluster` TO `john_doe`;

-- ============================================
-- ALTERNATIVE: Create user with SHA256 password
-- ============================================
-- For better security, use SHA256 password hash instead of plain text

CREATE USER IF NOT EXISTS `secure_user`
    IDENTIFIED WITH sha256_hash BY '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'  -- SHA256 of 'password'
    DEFAULT ROLE `readonly_role`
    PROFILE `readonly_profile`
    HOST IP '::/0';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check created profiles
SELECT * FROM system.settings_profiles;

-- Check created roles
SELECT * FROM system.roles;

-- Check created users
SELECT name, id, storage, auth_type FROM system.users WHERE name = 'john_doe';

-- Check user grants
SELECT * FROM system.grants WHERE user_name = 'john_doe';

-- Check role grants
SELECT * FROM system.grants WHERE role_name = 'custom_role';

-- Check user profile assignments
SELECT * FROM system.settings_profile_elements WHERE user_name = 'john_doe';

-- Check user roles
SELECT * FROM system.role_grants WHERE user_name = 'john_doe';

-- Check databases
SELECT name, engine, data_path, metadata_path FROM system.databases WHERE name IN ('analytics', 'production', 'staging');

-- Check tables
SELECT database, name, engine, partition_key, sorting_key, primary_key FROM system.tables WHERE database IN ('analytics', 'production', 'staging');

-- Check table columns
SELECT database, table, name, type, default_kind, default_expression FROM system.columns WHERE database = 'analytics' AND table = 'events';

-- ============================================
-- CLEANUP (if needed)
-- ============================================

-- Revoke permissions
REVOKE SELECT ON `analytics`.* FROM `john_doe`;
REVOKE `custom_role` FROM `john_doe`;

-- Drop user
DROP USER IF EXISTS `john_doe`;

-- Drop role
DROP ROLE IF EXISTS `custom_role`;

-- Drop profile
DROP PROFILE IF EXISTS `custom_profile`;

-- Drop tables
DROP TABLE IF EXISTS `analytics`.`events`;
DROP TABLE IF EXISTS `analytics`.`users`;
DROP TABLE IF EXISTS `analytics`.`logs`;
DROP TABLE IF EXISTS `analytics`.`metrics_snapshot`;
DROP TABLE IF EXISTS `production`.`orders`;
DROP TABLE IF EXISTS `production`.`reports`;
DROP TABLE IF EXISTS `analytics`.`settings`;

-- Drop databases
DROP DATABASE IF EXISTS `analytics`;
DROP DATABASE IF EXISTS `production`;
DROP DATABASE IF EXISTS `staging`;
DROP DATABASE IF EXISTS `test`;

-- ============================================
-- COMPLETE WORKFLOW EXAMPLE
-- ============================================
-- Full example: Create database, tables, profile, role, and user

-- Step 1: Create database
CREATE DATABASE IF NOT EXISTS `example_db`;

-- Step 2: Create tables
CREATE TABLE IF NOT EXISTS `example_db`.`users`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `name` String,
    `email` String,
    `created_at` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
ORDER BY (id, created_at)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS `example_db`.`events`
(
    `id` UUID DEFAULT generateUUIDv4(),
    `user_id` UUID,
    `event_type` String,
    `timestamp` DateTime('UTC') DEFAULT now()
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, timestamp)
SETTINGS index_granularity = 8192;

-- Step 3: Create profile
CREATE PROFILE IF NOT EXISTS `example_profile` SETTINGS
    max_memory_usage = 10000000000,
    max_execution_time = 300,
    readonly = 0,
    allow_ddl = 1;

-- Step 4: Create role
CREATE ROLE IF NOT EXISTS `example_role`;

-- Step 5: Grant permissions to role
GRANT SELECT ON `example_db`.* TO `example_role`;
GRANT SELECT, INSERT ON `example_db`.`events` TO `example_role`;
GRANT SELECT(`id`, `name`, `email`) ON `example_db`.`users` TO `example_role`;

-- Step 6: Create user
CREATE USER IF NOT EXISTS `example_user`
    IDENTIFIED BY 'ExamplePassword123!'
    DEFAULT ROLE `example_role`
    PROFILE `example_profile`
    HOST IP '::/0';

-- Step 7: Grant role to user
GRANT `example_role` TO `example_user`;

