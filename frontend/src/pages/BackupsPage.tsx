import React, { useState, useEffect } from 'react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { BackupDetailsModal } from '../components/BackupDetailsModal';
import { BackupStatsCards } from '../components/backups/BackupStatsCards';
import { InProgressBackups } from '../components/backups/InProgressBackups';
import { CompletedBackups } from '../components/backups/CompletedBackups';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { backupAPI } from '../services/backupAPI';
import { metricsAPI } from '../services/metricsAPI';
import type { Backup } from '../types/backup';
import type { NodeInfo } from '../types/metrics';

export function BackupsPage() {
  const { theme } = useTheme();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data state
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
  });
  const [inProgressBackups, setInProgressBackups] = useState<Backup[]>([]);
  const [completedBackups, setCompletedBackups] = useState<Backup[]>([]);
  const [failedBackups, setFailedBackups] = useState<Backup[]>([]);
  const [pagination, setPagination] = useState({
    limit: 10,
    offset: 0,
    total: 0,
    currentPage: 1,
  });


  // Load nodes from API
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoadingNodes(true);
        const availableNodes = await metricsAPI.getAvailableNodes();
        setNodes(availableNodes);
        
        // Get saved node from sessionStorage or use first node
        const savedNode = sessionStorage.getItem('selectedBackupNode');
        const savedNodeInfo = availableNodes.find(n => n.name === savedNode);
        if (savedNodeInfo) {
          setSelectedNode(savedNodeInfo.name);
        } else if (availableNodes.length > 0) {
          setSelectedNode(availableNodes[0].name);
          sessionStorage.setItem('selectedBackupNode', availableNodes[0].name);
        }
      } catch (error) {
        console.error('Failed to load nodes:', error);
      } finally {
        setLoadingNodes(false);
      }
    };

    loadNodes();
  }, []);

  // Save selected node to sessionStorage
  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedBackupNode', node);
  };

  // Load backup stats
  useEffect(() => {
    if (!selectedNode) return;

    const loadStats = async () => {
      try {
        const statsData = await backupAPI.getStats(selectedNode);
        setStats({
          total: statsData.total,
          inProgress: statsData.in_progress,
          completed: statsData.completed,
          failed: statsData.failed,
        });
      } catch (error) {
        console.error('Failed to load backup stats:', error);
      }
    };

    loadStats();
  }, [selectedNode]);

  // Load in-progress backups
  useEffect(() => {
    if (!selectedNode) return;

    const loadInProgress = async () => {
      try {
        const backups = await backupAPI.getInProgress(selectedNode);
        setInProgressBackups(backups);
      } catch (error) {
        console.error('Failed to load in-progress backups:', error);
      }
    };

    loadInProgress();
    // Refresh every 10 seconds for in-progress backups
    const interval = setInterval(loadInProgress, 10000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  // Load completed backups
  useEffect(() => {
    if (!selectedNode) return;

    const loadCompleted = async () => {
      try {
        setLoadingCompleted(true);
        const response = await backupAPI.getCompleted(
          selectedNode,
          pagination.limit,
          (pagination.currentPage - 1) * pagination.limit
        );
        
        // Separate completed and failed backups
        const completed = response.items.filter(b => 
          b.status === 'BACKUP_COMPLETED' || b.status === 'BACKUP_CREATED'
        );
        const failed = response.items.filter(b => b.status === 'BACKUP_FAILED');
        
        setCompletedBackups(completed);
        setFailedBackups(failed);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
        }));
      } catch (error) {
        console.error('Failed to load completed backups:', error);
      } finally {
        setLoadingCompleted(false);
      }
    };

    loadCompleted();
  }, [selectedNode, pagination.currentPage, pagination.limit]);

  // Load backup details when selected
  useEffect(() => {
    if (!selectedBackup || !selectedNode) return;

    const loadBackupDetails = async () => {
      try {
        const backup = await backupAPI.getById(selectedBackup.id, selectedNode);
        setSelectedBackup(backup);
      } catch (error) {
        console.error('Failed to load backup details:', error);
      }
    };

    loadBackupDetails();
  }, [selectedBackup?.id, selectedNode]);

  // Handle pagination change
  const handlePageChangePagination = (newPage: number) => {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
    }
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
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
            loadingNodes={loadingNodes}
          />

          {/* Main Content */}
          <main className={`flex-1 overflow-y-auto custom-scrollbar ${
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
                inProgressCount={stats.inProgress}
              />

              {/* Completed Backups */}
              <CompletedBackups
                completedBackups={completedBackups}
                failedBackups={failedBackups}
                onSelectBackup={setSelectedBackup}
                onCopyId={handleCopyId}
                copiedId={copiedId}
                calculateDuration={calculateDuration}
                pagination={pagination}
                onPageChange={handlePageChangePagination}
                loading={loadingCompleted}
                totalCompletedCount={stats.completed + stats.failed}
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