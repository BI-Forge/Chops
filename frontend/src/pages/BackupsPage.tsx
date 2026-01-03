import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { BackupDetailsModal } from '../components/BackupDetailsModal';
import { BackupStatsCards } from '../components/backups/BackupStatsCards';
import { InProgressBackups } from '../components/backups/InProgressBackups';
import { CompletedBackups } from '../components/backups/CompletedBackups';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../services/AuthContext';

interface Backup {
  id: string;
  name: string;
  base_backup_name: string;
  query_id: string;
  status: string; // BACKUP_CREATED, BACKUP_FAILED, etc.
  error: string;
  start_time: string;
  end_time: string;
  num_files: number;
  total_size: number; // bytes
  num_entries: number;
  uncompressed_size: number; // bytes
  compressed_size: number; // bytes
  files_read: number;
  bytes_read: number; // bytes
  sql_query?: string; // SQL query used for backup
}

export function BackupsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePageChange = (pageId: string) => {
    if (pageId === 'dashboard') {
      navigate('/dashboard');
    } else if (pageId === 'queries') {
      navigate('/query-history');
    } else if (pageId === 'backups') {
      navigate('/backups');
    } else if (pageId === 'tables') {
      navigate('/tables');
    } else if (pageId === 'users') {
      navigate('/users');
    } else if (pageId === 'settings') {
      navigate('/settings');
    } else if (pageId === 'admin-settings') {
      navigate('/admin-settings');
    }
  };

  // Mock data
  const allBackups: Backup[] = [
    {
      id: 'backup-001',
      name: 'backup_analytics_db_2024-12-04',
      base_backup_name: 'analytics_base',
      query_id: 'q-12345',
      status: 'BACKUP_COMPLETED',
      error: '',
      start_time: '2024-12-04 14:23:15',
      end_time: '2024-12-04 14:45:32',
      num_files: 5678,
      total_size: 214748364800, // 200 GB
      num_entries: 234567,
      uncompressed_size: 429496729600, // 400 GB
      compressed_size: 214748364800, // 200 GB
      files_read: 5678,
      bytes_read: 214748364800, // 200 GB
      sql_query: `BACKUP DATABASE rabbit_payments
TO Disk ('s3_minio', '190/2025-12-04/rabbit_payments')
SETTINGS
    base_backup = Disk ('s3_minio', '190/2025-12-03/rabbit_payments'),
    s3_strict_upload_part_size = 268435456,
    s3_min_upload_part_size    = 134217728,
    s3_max_single_part_upload_size = 67108864,
    s3_max_inflight_parts_for_one_file = 0,
    s3_max_put_rps = 0, s3_max_put_burst = 0,
    s3_request_timeout_ms = 120000,
    s3_retry_attempts = 10;`
    },
    {
      id: 'backup-002',
      name: 'hourly_backup_logs_2024-12-04-14',
      base_backup_name: 'logs_base',
      query_id: 'q-12346',
      status: 'BACKUP_IN_PROGRESS',
      error: '',
      start_time: '2024-12-04 14:35:15',
      end_time: '',
      num_files: 567,
      total_size: 8796093000, // 8.2 GB
      num_entries: 23456,
      uncompressed_size: 13002342400, // 12.1 GB
      compressed_size: 8796093000, // 8.2 GB
      files_read: 320,
      bytes_read: 5153960704, // 4.8 GB
      sql_query: 'BACKUP TABLE logs_db.access_logs TO Disk(\'s3_minio\', \'backups/hourly/logs_2024-12-04-14\') SETTINGS compression_level=3'
    },
    {
      id: 'backup-003',
      name: 'full_backup_production_2024-12-04',
      base_backup_name: 'production_base',
      query_id: 'q-12340',
      status: 'BACKUP_COMPLETED',
      error: '',
      start_time: '2024-12-04 13:00:00',
      end_time: '2024-12-04 13:45:32',
      num_files: 3456,
      total_size: 135281356800, // 125.8 GB
      num_entries: 156789,
      uncompressed_size: 263802240000, // 245.3 GB
      compressed_size: 135281356800, // 125.8 GB
      files_read: 3456,
      bytes_read: 135281356800, // 125.8 GB
      sql_query: 'BACKUP DATABASE production_db TO Disk(\'s3_minio\', \'backups/full/production_2024-12-04\') SETTINGS base_backup=Disk(\'s3_minio\', \'backups/full/production_base\')'
    },
    {
      id: 'backup-004',
      name: 'daily_backup_ecommerce_2024-12-04',
      base_backup_name: 'ecommerce_base',
      query_id: 'q-12341',
      status: 'BACKUP_COMPLETED',
      error: '',
      start_time: '2024-12-04 12:00:00',
      end_time: '2024-12-04 12:28:15',
      num_files: 2134,
      total_size: 72340224000, // 67.4 GB
      num_entries: 89456,
      uncompressed_size: 146486400000, // 134.2 GB
      compressed_size: 72340224000, // 67.4 GB
      files_read: 2134,
      bytes_read: 72340224000, // 67.4 GB
      sql_query: 'BACKUP TABLE ecommerce_db.orders TO Disk(\'s3_minio\', \'backups/daily/ecommerce_2024-12-04\') SETTINGS compression_method=\'lz4\', async=false'
    },
    {
      id: 'backup-005',
      name: 'backup_users_db_2024-12-04',
      base_backup_name: 'users_base',
      query_id: 'q-12342',
      status: 'BACKUP_FAILED',
      error: 'Connection timeout: Unable to reach backup storage',
      start_time: '2024-12-04 11:30:00',
      end_time: '2024-12-04 11:35:45',
      num_files: 456,
      total_size: 13218891776, // 12.3 GB
      num_entries: 34567,
      uncompressed_size: 25165824000, // 23.4 GB
      compressed_size: 13218891776, // 12.3 GB
      files_read: 234,
      bytes_read: 7161600000 // 6.7 GB
    },
    {
      id: 'backup-006',
      name: 'incremental_backup_logs_2024-12-04',
      base_backup_name: 'logs_base',
      query_id: 'q-12343',
      status: 'BACKUP_COMPLETED',
      error: '',
      start_time: '2024-12-04 10:00:00',
      end_time: '2024-12-04 10:15:22',
      num_files: 890,
      total_size: 25264514560, // 23.5 GB
      num_entries: 45678,
      uncompressed_size: 48318382080, // 45.2 GB
      compressed_size: 25264514560, // 23.5 GB
      files_read: 890,
      bytes_read: 25264514560 // 23.5 GB
    },
    {
      id: 'backup-007',
      name: 'weekly_backup_analytics_2024-12-01',
      base_backup_name: 'analytics_base',
      query_id: 'q-12344',
      status: 'BACKUP_COMPLETED',
      error: '',
      start_time: '2024-12-01 02:00:00',
      end_time: '2024-12-01 03:12:45',
      num_files: 5678,
      total_size: 252645145600, // 234.7 GB
      num_entries: 345678,
      uncompressed_size: 490737418240, // 456.8 GB
      compressed_size: 252645145600, // 234.7 GB
      files_read: 5678,
      bytes_read: 252645145600 // 234.7 GB
    }
  ];

  const inProgressBackups = allBackups.filter(b => b.status === 'BACKUP_IN_PROGRESS');
  const completedBackups = allBackups.filter(b => b.status === 'BACKUP_COMPLETED');
  const failedBackups = allBackups.filter(b => b.status === 'BACKUP_FAILED');

  // Stats
  const stats = {
    total: allBackups.length,
    inProgress: inProgressBackups.length,
    completed: completedBackups.length,
    failed: failedBackups.length
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(id).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        }).catch(() => {
          // Fallback for clipboard API not available
          fallbackCopyTextToClipboard(id);
        });
      } else {
        fallbackCopyTextToClipboard(id);
      }
    } catch (err) {
      fallbackCopyTextToClipboard(id);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
  };

  const formatBytes = (size: number) => {
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
  };

  const calculateDuration = (start: string, end: string) => {
    if (!end) return 'In progress...';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    return `${diffMins}m ${diffSecs}s`;
  };

  const calculateProgress = (backup: Backup) => {
    if (backup.status !== 'BACKUP_IN_PROGRESS') return 100;
    return Math.round((backup.files_read / backup.num_files) * 100);
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
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader 
            title="Backups" 
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          {/* Main Content */}
          <main className={`flex-1 overflow-y-auto ${
            theme === 'light' ? 'bg-gray-50/50' : 'bg-transparent'
          }`}>
            <div className="p-6 space-y-6">
              {/* Stats Cards */}
              <BackupStatsCards
                totalCount={stats.total}
                inProgressCount={stats.inProgress}
                completedCount={stats.completed}
                failedCount={stats.failed}
              />

              {/* Backups in Progress */}
              <InProgressBackups
                backups={inProgressBackups}
                onSelectBackup={setSelectedBackup}
                onCopyId={handleCopyId}
                copiedId={copiedId}
                calculateProgress={calculateProgress}
              />

              {/* Completed Backups */}
              <CompletedBackups
                completedBackups={completedBackups}
                failedBackups={failedBackups}
                onSelectBackup={setSelectedBackup}
                onCopyId={handleCopyId}
                copiedId={copiedId}
                calculateDuration={calculateDuration}
              />

              {/* Backup Details Modal */}
              <BackupDetailsModal
                isOpen={!!selectedBackup}
                backup={selectedBackup}
                onClose={() => setSelectedBackup(null)}
                calculateDuration={calculateDuration}
                calculateProgress={calculateProgress}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}