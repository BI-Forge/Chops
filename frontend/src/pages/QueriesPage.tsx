import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle, XCircle, Search, User, Calendar, Filter, Play, Square, Eye, ChevronLeft, ChevronRight, Database, Clock, TrendingUp, AlertTriangle, Copy, Check, Cpu, HardDrive, FileText, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { QueryModal } from '../components/QueryModal';
import { CustomSelect } from '../components/CustomSelect';
import { CustomCheckbox } from '../components/CustomCheckbox';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { queryAPI } from '../services/queryAPI';
import type { QueryLogStatsResponse, Process, QueryLogEntry } from '../services/queryAPI';
import { metricsAPI } from '../services/metricsAPI';
import type { NodeInfo } from '../types/metrics';

interface Query {
  id: string;
  query: string;
  user: string;
  database: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  duration: string;
  rowsRead: string;
  bytesRead: string;
  memoryUsage: string;
  cpuUsage: string;
  queryType: string;
  errorMessage?: string;
  settings?: {
    max_memory_usage?: string;
    max_execution_time?: string;
    max_rows_to_read?: string;
    priority?: string;
    [key: string]: string | undefined;
  };
}

export function QueriesPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Load filters from sessionStorage or use defaults
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = sessionStorage.getItem('queriesPage');
    return saved ? parseInt(saved) : 1;
  });
  const [recordsPerPage, setRecordsPerPage] = useState(() => {
    return sessionStorage.getItem('queriesRecordsPerPage') || '10';
  });
  const [searchQuery, setSearchQuery] = useState(() => {
    return sessionStorage.getItem('queriesSearchQuery') || '';
  });
  const [selectedUser, setSelectedUser] = useState(() => {
    return sessionStorage.getItem('queriesSelectedUser') || 'All Users';
  });
  const [selectedStatus, setSelectedStatus] = useState(() => {
    return sessionStorage.getItem('queriesSelectedStatus') || 'All Statuses';
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    return sessionStorage.getItem('queriesSelectedPeriod') || '1h';
  });
  const [dateFrom, setDateFrom] = useState(() => {
    return sessionStorage.getItem('queriesDateFrom') || '';
  });
  const [dateTo, setDateTo] = useState(() => {
    return sessionStorage.getItem('queriesDateTo') || '';
  });
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [queryStats, setQueryStats] = useState<QueryLogStatsResponse>({ running: 0, finished: 0, error: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [runningProcesses, setRunningProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(true);
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([]);
  const [loadingQueryLog, setLoadingQueryLog] = useState(false);
  const [queryLogPagination, setQueryLogPagination] = useState<{ total: number; limit: number; offset: number }>({ total: 0, limit: 10, offset: 0 });
  const [users, setUsers] = useState<string[]>([]);
  const statsEventSourceRef = useRef<EventSource | null>(null);
  const processesEventSourceRef = useRef<EventSource | null>(null);
  const { theme } = useTheme();
  const { success, error } = useAlert();

  // Save filters to sessionStorage when they change
  useEffect(() => {
    sessionStorage.setItem('queriesPage', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    sessionStorage.setItem('queriesRecordsPerPage', recordsPerPage);
  }, [recordsPerPage]);

  useEffect(() => {
    sessionStorage.setItem('queriesSearchQuery', searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    sessionStorage.setItem('queriesSelectedUser', selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    sessionStorage.setItem('queriesSelectedStatus', selectedStatus);
  }, [selectedStatus]);

  useEffect(() => {
    sessionStorage.setItem('queriesSelectedPeriod', selectedPeriod);
  }, [selectedPeriod]);

  useEffect(() => {
    sessionStorage.setItem('queriesDateFrom', dateFrom);
  }, [dateFrom]);

  useEffect(() => {
    sessionStorage.setItem('queriesDateTo', dateTo);
  }, [dateTo]);

  // Load nodes from API
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoadingNodes(true);
        const availableNodes = await metricsAPI.getAvailableNodes();
        setNodes(availableNodes);
        
        // Get saved node from sessionStorage or use first node
        const savedNode = sessionStorage.getItem('selectedNode');
        const savedNodeInfo = availableNodes.find(n => n.name === savedNode);
        if (savedNodeInfo) {
          setSelectedNode(savedNodeInfo.name);
        } else if (availableNodes.length > 0) {
          setSelectedNode(availableNodes[0].name);
          sessionStorage.setItem('selectedNode', availableNodes[0].name);
        }
      } catch (error) {
        console.error('Failed to load nodes:', error);
      } finally {
        setLoadingNodes(false);
      }
    };

    loadNodes();
  }, []);

  // Load users from API when node is selected
  useEffect(() => {
    if (!selectedNode) {
      setUsers([]);
      return;
    }

    const loadUsers = async () => {
      try {
        const response = await queryAPI.getUsers(selectedNode);
        setUsers(response.users || []);
      } catch (error) {
        console.error('Failed to load users:', error);
        setUsers([]);
      }
    };

    loadUsers();
  }, [selectedNode]);

  // Load query stats and setup SSE stream
  useEffect(() => {
    if (!selectedNode) {
      setLoadingStats(false);
      return;
    }

    const loadStats = async () => {
      try {
        setLoadingStats(true);
        // Build filter from current filters
        const periodDates = getPeriodDates(selectedPeriod);
        const filter: any = {
          node: selectedNode,
        };

        // Apply period or date range
        if (periodDates.last) {
          filter.last = periodDates.last;
        } else if (periodDates.from || periodDates.to) {
          if (periodDates.from) filter.from = periodDates.from;
          if (periodDates.to) filter.to = periodDates.to;
        }

        if (selectedUser && selectedUser !== 'All Users') filter.user = selectedUser;
        if (selectedStatus && selectedStatus !== 'All Statuses' && selectedStatus.toLowerCase() !== 'running') {
          // API doesn't accept 'running' status for query log stats (only 'completed', 'failed', or 'all')
          filter.status = selectedStatus.toLowerCase();
        }
        if (searchQuery) filter.search = searchQuery;

        // Load initial stats
        const initialStats = await queryAPI.getQueryLogStats(filter);
        setQueryStats(initialStats);
        setLoadingStats(false);

        // Setup SSE stream for real-time updates
        if (statsEventSourceRef.current) {
          statsEventSourceRef.current.close();
        }

        statsEventSourceRef.current = queryAPI.streamQueryLogStats(
          filter,
          (updatedStats) => {
            setQueryStats(updatedStats);
          },
          (error) => {
            console.error('SSE error for query stats:', error);
            // Try to reconnect after delay
            setTimeout(() => {
              if (selectedNode) {
                loadStats();
              }
            }, 5000);
          }
        );
      } catch (error) {
        console.error('Failed to load query stats:', error);
        setLoadingStats(false);
      }
    };

    loadStats();

    // Cleanup on unmount or node/filter change
    return () => {
      if (statsEventSourceRef.current) {
        statsEventSourceRef.current.close();
        statsEventSourceRef.current = null;
      }
    };
  }, [selectedNode, selectedPeriod, dateFrom, dateTo, selectedUser, selectedStatus, searchQuery]);

  // Save selected node to sessionStorage
  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedNode', node);
  };

  // Load running processes and setup SSE stream
  useEffect(() => {
    if (!selectedNode) {
      setLoadingProcesses(false);
      setRunningProcesses([]);
      return;
    }

    const loadProcesses = async () => {
      try {
        setLoadingProcesses(true);
        // Load initial processes
        const initialProcesses = await queryAPI.getCurrentProcesses(selectedNode);
        setRunningProcesses(initialProcesses.processes || []);
        setLoadingProcesses(false);

        // Setup SSE stream for real-time updates
        if (processesEventSourceRef.current) {
          processesEventSourceRef.current.close();
        }

        processesEventSourceRef.current = queryAPI.streamProcesses(
          selectedNode,
          (updatedProcesses) => {
            setRunningProcesses(updatedProcesses);
          },
          (error) => {
            console.error('SSE error for processes:', error);
            // Try to reconnect after delay
            setTimeout(() => {
              if (selectedNode) {
                loadProcesses();
              }
            }, 5000);
          }
        );
      } catch (error) {
        console.error('Failed to load processes:', error);
        setLoadingProcesses(false);
        setRunningProcesses([]);
      }
    };

    loadProcesses();

    // Cleanup on unmount or node change
    return () => {
      if (processesEventSourceRef.current) {
        processesEventSourceRef.current.close();
        processesEventSourceRef.current = null;
      }
    };
  }, [selectedNode]);

  // Load query log when filters or page changes
  useEffect(() => {
    loadQueryLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, currentPage, recordsPerPage, selectedPeriod, dateFrom, dateTo, selectedUser, selectedStatus, searchQuery]);

  // Convert date string to RFC3339 format (API expects RFC3339 or 2006-01-02 15:04:05)
  const formatDateForAPI = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // If already in RFC3339 format, return as is
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/))) {
      return dateStr;
    }
    
    // Parse the date string
    let date: Date;
    if (dateStr.includes('T')) {
      // Format: YYYY-MM-DDTHH:mm
      const [datePart, timePart] = dateStr.split('T');
      const [hours = '00', minutes = '00'] = timePart.split(':');
      // Create date in local timezone, then convert to UTC
      date = new Date(`${datePart}T${hours}:${minutes}:00`);
    } else {
      // Format: YYYY-MM-DD
      // Create date at midnight in local timezone, then convert to UTC
      date = new Date(`${dateStr}T00:00:00`);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateStr);
      return '';
    }
    
    // Convert to RFC3339 format: YYYY-MM-DDTHH:mm:ssZ (UTC)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
  };

  // Convert period to API format (from/to dates or last)
  const getPeriodDates = (period: string): { from?: string; to?: string; last?: string } => {
    if (dateFrom || dateTo) {
      return { 
        from: dateFrom ? formatDateForAPI(dateFrom) : undefined, 
        to: dateTo ? formatDateForAPI(dateTo) : undefined 
      };
    }

    switch (period) {
      case '15min':
        return { last: '15m' };
      case '30min':
        return { last: '30m' };
      case '1h':
        return { last: '1h' };
      case '12h':
        return { last: '12h' };
      default:
        return {};
    }
  };

  // Load query log with filters
  const loadQueryLog = async () => {
    if (!selectedNode) {
      setQueryLog([]);
      setQueryLogPagination({ total: 0, limit: parseInt(recordsPerPage), offset: 0 });
      return;
    }

    try {
      setLoadingQueryLog(true);
      const periodDates = getPeriodDates(selectedPeriod);
      const filter: any = {
        node: selectedNode,
        limit: parseInt(recordsPerPage),
        offset: (currentPage - 1) * parseInt(recordsPerPage),
      };

      if (periodDates.last) {
        filter.last = periodDates.last;
      } else if (periodDates.from || periodDates.to) {
        if (periodDates.from) filter.from = periodDates.from;
        if (periodDates.to) filter.to = periodDates.to;
      }

      if (selectedUser && selectedUser !== 'All Users') {
        filter.user = selectedUser;
      }

      if (selectedStatus && selectedStatus !== 'All Statuses' && selectedStatus.toLowerCase() !== 'running') {
        // API doesn't accept 'running' status for query log (only 'completed', 'failed', or 'all')
        filter.status = selectedStatus.toLowerCase();
      }

      if (searchQuery) {
        filter.search = searchQuery;
      }

      const response = await queryAPI.getQueryLog(filter);
      setQueryLog(response.items || []);
      setQueryLogPagination({
        total: response.pagination?.total || 0,
        limit: response.pagination?.limit || parseInt(recordsPerPage),
        offset: response.pagination?.offset || 0,
      });
    } catch (err) {
      console.error('Failed to load query log:', err);
      setQueryLog([]);
      setQueryLogPagination({ total: 0, limit: parseInt(recordsPerPage), offset: 0 });
      error('Load Failed', 'Failed to load query log', 3000);
    } finally {
      setLoadingQueryLog(false);
    }
  };

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Convert Process to Query format for display
  const convertProcessToQuery = (process: Process): Query => {
    const startTime = new Date(process.query_start_time);
    const formattedTime = startTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', '');

    return {
      id: process.query_id,
      query: process.query,
      user: process.user,
      database: process.current_database,
      status: 'running',
      startTime: formattedTime,
      duration: `${(process.elapsed || process.query_duration_ms / 1000).toFixed(1)}s`,
      rowsRead: process.read_rows.toLocaleString(),
      bytesRead: formatBytes(process.read_bytes),
      memoryUsage: formatBytes(process.memory_usage),
      cpuUsage: '0%', // CPU usage not available in Process
      queryType: process.query.split(' ')[0].toUpperCase() || 'SELECT',
    };
  };

  // Convert QueryLogEntry to Query format for display
  const convertQueryLogEntryToQuery = (entry: QueryLogEntry): Query => {
    const startTime = new Date(entry.event_time);
    const formattedStartTime = startTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', '');

    // Calculate end time and duration
    const endTime = new Date(startTime.getTime() + entry.duration_ms);
    const formattedEndTime = endTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(',', '');

    const durationSeconds = (entry.duration_ms / 1000).toFixed(1);
    const duration = `${durationSeconds}s`;

    // Determine status based on exception
    const status: 'running' | 'completed' | 'failed' = entry.exception_code !== 0 ? 'failed' : 'completed';

    // Parse settings if available
    let settings: Query['settings'] = undefined;
    if (entry.settings) {
      try {
        const parsed = JSON.parse(entry.settings);
        settings = {};
        for (const [key, value] of Object.entries(parsed)) {
          settings[key] = String(value);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return {
      id: entry.query_id,
      query: entry.query_text,
      user: entry.user,
      database: entry.databases?.[0] || 'default',
      status,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      duration,
      rowsRead: entry.read_rows.toLocaleString(),
      bytesRead: formatBytes(entry.read_bytes),
      memoryUsage: formatBytes(entry.memory_usage),
      cpuUsage: '0%', // CPU usage not available in QueryLogEntry
      queryType: entry.type.toUpperCase() || 'SELECT',
      errorMessage: entry.exception,
      settings,
    };
  };

  // Convert processes to queries for display
  const allRunningQueries: Query[] = runningProcesses.map(convertProcessToQuery);
  
  // Filter running queries by selected user
  const runningQueries: Query[] = selectedUser && selectedUser !== 'All Users'
    ? allRunningQueries.filter(q => q.user === selectedUser)
    : allRunningQueries;

  // Convert query log entries to queries for display
  const allQueries: Query[] = queryLog.map(convertQueryLogEntryToQuery);

  // Mock data for charts (1 minute intervals)
  const memoryData = [
    { time: '14:30', usage: 256 },
    { time: '14:31', usage: 312 },
    { time: '14:32', usage: 384 },
    { time: '14:33', usage: 420 },
    { time: '14:34', usage: 368 },
    { time: '14:35', usage: 512 },
    { time: '14:36', usage: 468 },
    { time: '14:37', usage: 392 },
    { time: '14:38', usage: 445 },
    { time: '14:39', usage: 410 }
  ];

  const cpuData = [
    { time: '14:30', usage: 25 },
    { time: '14:31', usage: 32 },
    { time: '14:32', usage: 42 },
    { time: '14:33', usage: 38 },
    { time: '14:34', usage: 28 },
    { time: '14:35', usage: 55 },
    { time: '14:36', usage: 45 },
    { time: '14:37', usage: 35 },
    { time: '14:38', usage: 48 },
    { time: '14:39', usage: 40 }
  ];

  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  // Clear selection when page changes
  useEffect(() => {
    setSelectedQueries(new Set());
  }, [currentPage]);

  const handleCopyQuery = (query: string, queryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Safe copy method with fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(query).then(() => {
          setCopiedQueryId(queryId);
          setTimeout(() => setCopiedQueryId(null), 2000);
          success('SQL Copied', 'Query copied to clipboard successfully', 3000);
        }).catch(() => {
          fallbackCopyTextToClipboard(query, queryId);
          error('Copy Failed', 'Failed to copy query to clipboard', 3000);
        });
      } else {
        fallbackCopyTextToClipboard(query, queryId);
      }
    } catch (err) {
      fallbackCopyTextToClipboard(query, queryId);
      error('Copy Failed', 'Failed to copy query to clipboard', 3000);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, queryId: string) => {
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
      setCopiedQueryId(queryId);
      setTimeout(() => setCopiedQueryId(null), 2000);
      success('SQL Copied', 'Query copied to clipboard successfully', 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      error('Copy Failed', 'Failed to copy query to clipboard', 3000);
    }
    
    document.body.removeChild(textArea);
  };

  const handleQueryClick = (query: Query) => {
    setSelectedQuery(query);
    setIsModalOpen(true);
  };

  const handleStopQuery = async (queryId: string) => {
    if (!selectedNode) {
      error('No Node Selected', 'Please select a node to stop the query', 3000);
      return;
    }

    try {
      await queryAPI.killProcess({ query_id: queryId, node: selectedNode });
      success('Query Stopped', `Query ${queryId} has been stopped successfully`, 3000);
    } catch (err) {
      console.error('Failed to stop query:', err);
      error('Stop Failed', `Failed to stop query ${queryId}`, 3000);
    }
  };

  const handleSelectQuery = (queryId: string) => {
    setSelectedQueries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(queryId)) {
        newSet.delete(queryId);
      } else {
        newSet.add(queryId);
      }
      return newSet;
    });
  };

  const handleAcceptSelected = () => {
    console.log('Accepting queries:', Array.from(selectedQueries));
    // In real app, this would call an API to accept selected queries
    setSelectedQueries(new Set());
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'running':
        return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      default:
        return { icon: Activity, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
    }
  };

  const totalPages = Math.ceil(queryLogPagination.total / parseInt(recordsPerPage));
  const currentQueries = allQueries; // Already paginated by API

  // Format period for display
  const formatPeriod = (period: string): string => {
    switch (period) {
      case '15min':
        return 'Last 15 minutes';
      case '30min':
        return 'Last 30 minutes';
      case '1h':
        return 'Last 1 hour';
      case '12h':
        return 'Last 12 hours';
      default:
        return period;
    }
  };

  // Format date for display
  const formatDate = (date: string): string => {
    if (!date) return '';
    // If date includes time, just return as is
    if (date.includes(':')) {
      return date;
    }
    return date;
  };

  const stats = [
    {
      title: 'Running Queries',
      value: loadingProcesses ? '...' : runningQueries.length.toString(),
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30',
      showPeriod: false,
      user: selectedUser
    },
    {
      title: 'Completed Queries',
      value: loadingStats ? '...' : queryStats.finished.toString(),
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      showPeriod: true,
      period: formatPeriod(selectedPeriod),
      dateFrom: dateFrom,
      dateTo: dateTo,
      user: selectedUser
    },
    {
      title: 'Failed Queries',
      value: loadingStats ? '...' : queryStats.error.toString(),
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      showPeriod: true,
      period: formatPeriod(selectedPeriod),
      dateFrom: dateFrom,
      dateTo: dateTo,
      user: selectedUser
    }
  ];

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
            title="Query History" 
            description="Monitor and analyze database queries"
            onMenuOpen={() => setMobileMenuOpen(true)}
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
            loadingNodes={loadingNodes}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-6 animate-page-enter">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${
                theme === 'light' ? 'bg-white/90' : 'bg-gray-900/40'
              } backdrop-blur-md rounded-xl p-6 border ${stat.border} hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group animate-fade-in-up`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header with icon */}
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} rounded-lg p-3 ${stat.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              
              {/* Title */}
              <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>{stat.title}</div>
              
              {/* Value */}
              <div className={`${stat.color}`}>
                <span className="text-3xl font-mono">{stat.value}</span>

                {/* For Running Queries - show only user filter */}
                {!stat.showPeriod && stat.user && stat.user !== 'All Users' && (
                  <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mt-3`}>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>{stat.user}</span>
                    </div>
                  </div>
                )}

                {/* For Completed/Failed Queries - show all filters */}
                {stat.showPeriod && (
                  <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} mt-3 space-y-1`}>
                    {/* Period */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{stat.period}</span>
                    </div>

                    {/* Date Range */}
                    {(stat.dateFrom || stat.dateTo) && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {stat.dateFrom && stat.dateTo
                            ? `${formatDate(stat.dateFrom)} - ${formatDate(stat.dateTo)}`
                            : stat.dateFrom
                              ? `From: ${formatDate(stat.dateFrom)}`
                              : `To: ${formatDate(stat.dateTo)}`
                          }
                        </span>
                      </div>
                    )}

                    {/* User Filter */}
                    {stat.user && stat.user !== 'All Users' && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        <span>{stat.user}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running Queries */}
      {loadingProcesses ? (
        <div className={`${
          theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400">Loading running queries...</div>
          </div>
        </div>
      ) : runningQueries.length > 0 && (
        <div className={`${
          theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-400 animate-pulse" />
            <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Currently Running Queries</h2>
            <span className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-xs">{runningQueries.length}</span>
          </div>
          
          <div className="space-y-3">
            {runningQueries.map((query) => (
              <div
                key={query.id}
                onClick={() => handleQueryClick(query)}
                className={`${
                  theme === 'light' ? 'bg-blue-50/50 border-blue-500/40 hover:border-blue-500/60' : 'bg-gray-800/40 border-blue-500/30 hover:border-blue-500/50'
                } border rounded-lg p-4 transition-all duration-200 group cursor-pointer`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                        <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                        <span className="text-xs capitalize text-blue-400">running</span>
                      </div>
                      <span className="text-blue-400 font-mono text-sm">{query.id}</span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <p className={`${
                        theme === 'light' 
                          ? 'text-gray-800 group-hover:text-amber-700' 
                          : 'text-white group-hover:text-yellow-400'
                      } text-sm font-mono truncate transition-colors flex-1`}>{query.query}</p>
                      <button
                        onClick={(e) => handleCopyQuery(query.query, query.id, e)}
                        className={`p-1 rounded ${
                          theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-gray-700/50'
                        } transition-colors flex-shrink-0`}
                        title="Copy query"
                      >
                        {copiedQueryId === query.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className={`w-4 h-4 ${
                            theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-500 hover:text-yellow-400'
                          }`} />
                        )}
                      </button>
                    </div>
                    <div className={`flex items-center gap-4 text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {query.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {query.database}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {query.startTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className={`w-5 h-5 ${
                      theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'
                    } transition-colors flex-shrink-0`} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopQuery(query.id);
                      }}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 transition-all duration-200 group"
                      title="Stop Query"
                    >
                      <Square className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
          <Filter className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
          </div>

          {/* Apply Button */}
          <button
            onClick={async () => {
              setCurrentPage(1);
              setIsApplyingFilters(true);
              await loadQueryLog();
              setIsApplyingFilters(false);
            }}
            disabled={isApplyingFilters || loadingQueryLog}
            className={`px-4 py-2 rounded-lg text-sm ${
              theme === 'light'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
            } transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isApplyingFilters ? (
              <Play className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Apply</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Query */}
          <div className="lg:col-span-2">
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Search Query</label>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by query text..."
                className={`w-full ${
                  theme === 'light' 
                    ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50' 
                    : 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 focus:border-yellow-500/50'
                } border rounded-lg pl-10 pr-4 py-2.5 focus:outline-none transition-colors`}
              />
            </div>
          </div>

          {/* User Filter */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>User</label>
            <CustomSelect
              value={selectedUser}
              onChange={setSelectedUser}
              options={['All Users', ...users]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Status</label>
            <CustomSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={['All Statuses', 'running', 'completed', 'failed']}
            />
          </div>

          {/* Period Filter */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Period</label>
            <CustomSelect
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              options={['15min', '30min', '1h', '12h']}
            />
          </div>

          {/* Date From */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Date From</label>
            <CustomDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Select start date & time"
              showTime={true}
            />
          </div>

          {/* Date To */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Date To</label>
            <CustomDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="Select end date & time"
              showTime={true}
            />
          </div>

          {/* Records per Page */}
          <div>
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Per Page</label>
            <CustomSelect
              value={recordsPerPage}
              onChange={(value) => {
                setRecordsPerPage(value);
                setCurrentPage(1);
              }}
              options={['10', '25', '50', '100']}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage Chart */}
        <div className={`${
          theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
            <h3 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Memory Usage</h3>
          </div>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <AreaChart data={memoryData}>
              <defs>
                <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF" 
                style={{ fontSize: '12px' }}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                style={{ fontSize: '12px' }}
                label={{ value: 'MB', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                cursor={{ stroke: '#F59E0B', strokeWidth: 1, strokeDasharray: '5 5' }}
                animationDuration={100}
              />
              <Area 
                type="monotone" 
                dataKey="usage" 
                stroke="#F59E0B" 
                strokeWidth={2}
                fill="url(#colorMemory)"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Usage Chart */}
        <div className={`${
          theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
        } backdrop-blur-md rounded-xl border p-6`}>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
            <h3 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>CPU Usage (%)</h3>
          </div>
          <div className="w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <AreaChart data={cpuData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75, 85, 99, 0.3)" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF" 
                style={{ fontSize: '12px' }}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                style={{ fontSize: '12px' }}
                label={{ value: '%', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                cursor={{ stroke: '#F97316', strokeWidth: 1, strokeDasharray: '5 5' }}
                animationDuration={100}
              />
              <Area 
                type="monotone" 
                dataKey="usage" 
                stroke="#F97316" 
                strokeWidth={2}
                fill="url(#colorCpu)"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Query History */}
      <div className={`${
        theme === 'light'
          ? 'bg-white/80 border-amber-500/30'
          : 'bg-gray-900/60 border-yellow-500/20'
      } backdrop-blur-md rounded-xl border p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
            <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Query History</h2>
          </div>
          
          {selectedQueries.size > 0 && (
            <button
              onClick={handleAcceptSelected}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900 transition-all duration-200 shadow-lg shadow-yellow-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Accept selected ({selectedQueries.size})</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          {currentQueries.map((query) => {
            const statusConfig = getStatusConfig(query.status);
            const StatusIcon = statusConfig.icon;
            const isSelected = selectedQueries.has(query.id);
            
            return (
              <div
                key={query.id}
                className={`${
                  theme === 'light'
                    ? 'bg-white/60'
                    : 'bg-gray-800/40'
                } border ${
                  isSelected 
                    ? (theme === 'light' ? 'border-amber-500/50 bg-amber-50/30' : 'border-yellow-500/30 bg-yellow-500/5')
                    : (theme === 'light' ? 'border-gray-300/50' : 'border-gray-700/50')
                } rounded-lg p-4 ${
                  theme === 'light' ? 'hover:border-amber-500/50' : 'hover:border-yellow-500/30'
                } transition-all duration-200 group`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div className="pt-1">
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => handleSelectQuery(query.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Query Content */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleQueryClick(query)}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${statusConfig.bg} border ${statusConfig.border}`}>
                        <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                        <span className={`text-xs capitalize ${statusConfig.color}`}>{query.status}</span>
                      </div>
                      <span className={`font-mono text-sm ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>{query.id}</span>
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <p className={`${
                        theme === 'light' 
                          ? 'text-gray-800 group-hover:text-amber-700' 
                          : 'text-white group-hover:text-yellow-400'
                      } text-sm font-mono truncate transition-colors flex-1`}>{query.query}</p>
                      <button
                        onClick={(e) => handleCopyQuery(query.query, query.id, e)}
                        className={`p-1 rounded ${
                          theme === 'light' ? 'hover:bg-gray-200/50' : 'hover:bg-gray-700/50'
                        } transition-colors flex-shrink-0`}
                        title="Copy query"
                      >
                        {copiedQueryId === query.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className={`w-4 h-4 ${
                            theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-500 hover:text-yellow-400'
                          }`} />
                        )}
                      </button>
                    </div>
                    <div className={`flex items-center gap-4 text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {query.user}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {query.database}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Start: {query.startTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        End: {query.endTime || ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Duration: {query.duration}
                      </span>
                      <span>{query.rowsRead} rows</span>
                      <span>{query.bytesRead}</span>
                    </div>
                  </div>
                  
                  {/* Eye Icon */}
                  <Eye 
                    className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-500 group-hover:text-yellow-400'} transition-colors flex-shrink-0 cursor-pointer pt-1`} 
                    onClick={() => handleQueryClick(query)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
          theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
        }`}>
          <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
            Showing {queryLogPagination.offset + 1} to {Math.min(queryLogPagination.offset + queryLog.length, queryLogPagination.total)} of {queryLogPagination.total} queries
          </div>
          
          <div className="flex items-center gap-2">
            {/* First Page Button */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600 text-gray-700 hover:text-amber-700'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
              }`}
            >
              <div className="flex items-center gap-1">
                <ChevronsLeft className="w-4 h-4" />
                <span>First</span>
              </div>
            </button>

            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <ChevronLeft className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            </button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const maxPagesToShow = 5;
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                
                if (endPage - startPage < maxPagesToShow - 1) {
                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                }

                // Always show first page
                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => setCurrentPage(1)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border-amber-500/40 hover:border-amber-600'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      1
                    </button>
                  );
                  
                  if (startPage > 2) {
                    pages.push(
                      <span key="ellipsis-start" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                }

                // Show page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                        currentPage === i
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                          : theme === 'light'
                            ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border border-amber-500/40 hover:border-amber-600'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      {i}
                    </button>
                  );
                }

                // Always show last page
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="ellipsis-end" className="px-2 text-gray-500">
                        ...
                      </span>
                    );
                  }
                  
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 border ${
                        theme === 'light'
                          ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border-amber-500/40 hover:border-amber-600'
                          : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border-gray-700/50 hover:border-yellow-500/30'
                      }`}
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}
            </div>
            
            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`p-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
              }`}
            >
              <ChevronRight className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            </button>

            {/* Last Page Button */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                theme === 'light'
                  ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600 text-gray-700 hover:text-amber-700'
                  : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-400'
              }`}
            >
              <div className="flex items-center gap-1">
                <span>Last</span>
                <ChevronsRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Query Modal */}
      <QueryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        query={selectedQuery}
      />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
