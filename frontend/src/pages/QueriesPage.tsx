import React, { useState, useEffect, useRef } from 'react';
import { QueryModal } from '../components/QueryModal';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { StatsCards } from '../components/queries/StatsCards';
import { RunningQueriesBlock } from '../components/queries/RunningQueriesBlock';
import { QueryFilters } from '../components/queries/QueryFilters';
import { PerformanceCharts } from '../components/queries/PerformanceCharts';
import { QueryHistoryBlock } from '../components/queries/QueryHistoryBlock';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';
import { queryAPI } from '../services/queryAPI';
import type { QueryLogStatsResponse, Process, QueryLogEntry } from '../services/queryAPI';
import { metricsAPI } from '../services/metricsAPI';
import type { NodeInfo } from '../types/metrics';

interface Query {
  id: string;
  query: string;
  user: string;
  database: string;
  status: 'completed' | 'failed' | 'running';
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
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
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
  const [acceptedQueryIds, setAcceptedQueryIds] = useState<Set<string>>(new Set());
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [queryStats, setQueryStats] = useState<QueryLogStatsResponse>({ running: 0, finished: 0, error: 0 });
  const [runningProcesses, setRunningProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(true);
  const [queryLog, setQueryLog] = useState<QueryLogEntry[]>([]);
  const [loadingQueryLog, setLoadingQueryLog] = useState(false);
  const [queryLogPagination, setQueryLogPagination] = useState<{ total: number; limit: number; offset: number }>({ total: 0, limit: 10, offset: 0 });
  const [users, setUsers] = useState<string[]>([]);
  const [memoryData, setMemoryData] = useState<{ time: string; usage: number }[]>([]);
  const [cpuData, setCpuData] = useState<{ time: string; usage: number }[]>([]);
  const statsEventSourceRef = useRef<EventSource | null>(null);
  const processesEventSourceRef = useRef<EventSource | null>(null);
  const { success, error: showError } = useAlert();

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
      } catch (err) {
        console.error('Failed to load nodes:', err);
        showError('Failed to load nodes', 'Unable to fetch available nodes from the server', 5000);
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
      } catch (err) {
        console.error('Failed to load users:', err);
        showError('Failed to load users', 'Unable to fetch users list', 5000);
        setUsers([]);
      }
    };

    loadUsers();
  }, [selectedNode]);

  // Load query stats and setup SSE stream
  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    const loadStats = async () => {
      try {
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

        // Setup SSE stream for real-time updates
        if (statsEventSourceRef.current) {
          statsEventSourceRef.current.close();
        }

        statsEventSourceRef.current = queryAPI.streamQueryLogStats(
          filter,
          (updatedStats) => {
            setQueryStats(updatedStats);
          },
          (err) => {
            console.error('SSE error for query stats:', err);
            showError('Connection Error', 'Lost connection to query stats stream. Reconnecting...', 5000);
            // Try to reconnect after delay
            setTimeout(() => {
              if (selectedNode) {
                loadStats();
              }
            }, 5000);
          }
        );
      } catch (err) {
        console.error('Failed to load query stats:', err);
        showError('Failed to load stats', 'Unable to fetch query statistics', 5000);
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
          (err) => {
            console.error('SSE error for processes:', err);
            showError('Connection Error', 'Lost connection to processes stream. Reconnecting...', 5000);
            // Try to reconnect after delay
            setTimeout(() => {
              if (selectedNode) {
                loadProcesses();
              }
            }, 5000);
          }
        );
      } catch (err) {
        console.error('Failed to load processes:', err);
        showError('Failed to load processes', 'Unable to fetch running processes', 5000);
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

  // Reset accepted query IDs when filters change
  useEffect(() => {
    setAcceptedQueryIds(new Set());
  }, [selectedNode, selectedPeriod, dateFrom, dateTo, selectedUser, selectedStatus, searchQuery]);

  // Load chart data when filters change (not on page change or per page change)
  const loadChartData = async () => {
    if (!selectedNode) {
      setMemoryData([]);
      setCpuData([]);
      return;
    }

    try {
      const periodDates = getPeriodDates(selectedPeriod);
      const chartFilter: any = {
        node: selectedNode,
        limit: 10000,
        offset: 0,
      };
      
      if (periodDates.last) {
        chartFilter.last = periodDates.last;
      } else if (periodDates.from || periodDates.to) {
        if (periodDates.from) chartFilter.from = periodDates.from;
        if (periodDates.to) chartFilter.to = periodDates.to;
      }

      if (selectedUser && selectedUser !== 'All Users') {
        chartFilter.user = selectedUser;
      }

      if (selectedStatus && selectedStatus !== 'All Statuses' && selectedStatus.toLowerCase() !== 'running') {
        chartFilter.status = selectedStatus.toLowerCase();
      }
      if (searchQuery) chartFilter.search = searchQuery;

      const chartResponse = await queryAPI.getQueryLog(chartFilter);
      
      // Process chart data with filter if acceptedQueryIds are set
      if (acceptedQueryIds.size > 0) {
        processChartData(chartResponse.items || [], acceptedQueryIds);
      } else {
        processChartData(chartResponse.items || []);
      }
    } catch (err) {
      console.error('Failed to load chart data:', err);
      showError('Failed to load charts', 'Unable to fetch chart data', 5000);
    }
  };

  // Load chart data when filters change (not on page or per page change)
  useEffect(() => {
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, selectedPeriod, dateFrom, dateTo, selectedUser, selectedStatus, searchQuery, acceptedQueryIds]);

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
      case '2h':
        return { last: '2h' };
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
      showError('Load Failed', 'Failed to load query log', 3000);
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
      cpuUsage: entry.cpu_load > 0 ? `${(entry.cpu_load > 1 ? entry.cpu_load : entry.cpu_load * 100).toFixed(1)}%` : '0%',
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

  // Helper function to process query log entries and generate chart data
  const processChartData = (entries: QueryLogEntry[], filterQueryIds?: Set<string>) => {
    // Filter entries by query IDs if filter is provided
    let filteredEntries = entries;
    if (filterQueryIds && filterQueryIds.size > 0) {
      filteredEntries = entries.filter(entry => filterQueryIds.has(entry.query_id));
    }
    // Map to store data by 10-second intervals: timestamp_ms -> { cpu: [], memory: [] }
    const intervalMap = new Map<number, { cpu: number[]; memory: number[] }>();

    // Helper function to get interval start timestamp (rounded down to 10 seconds)
    const getIntervalStart = (timestamp: number): number => {
      return Math.floor(timestamp / 10000) * 10000; // Round down to nearest 10 seconds (10000 ms)
    };

    // Helper function to format timestamp for display (HH:mm:ss)
    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };

    filteredEntries.forEach(entry => {
      if (!entry.query_start_time || !entry.duration_ms || entry.duration_ms === 0) {
        return; // Skip entries without valid start time or duration
      }

      const startTime = new Date(entry.query_start_time).getTime();
      const durationMs = entry.duration_ms;
      const endTime = startTime + durationMs;

      // CPU load in percentage (already in percentage from API)
      const cpuPercent = entry.cpu_load > 1 ? entry.cpu_load : entry.cpu_load * 100;
      
      // Memory in MB
      const memoryMB = entry.memory_usage / (1024 * 1024);

      // Distribute data across 10-second intervals
      let currentIntervalStart = getIntervalStart(startTime);
      const finalIntervalStart = getIntervalStart(endTime);

      // Process each 10-second interval the query spans
      while (currentIntervalStart <= finalIntervalStart) {
        const intervalEnd = currentIntervalStart + 10000; // 10 seconds
        
        // Calculate overlap between query execution and this interval
        const overlapStart = Math.max(startTime, currentIntervalStart);
        const overlapEnd = Math.min(endTime, intervalEnd);
        const overlapMs = Math.max(0, overlapEnd - overlapStart);

        if (overlapMs > 0) {
          // Initialize interval if needed
          if (!intervalMap.has(currentIntervalStart)) {
            intervalMap.set(currentIntervalStart, { cpu: [], memory: [] });
          }

          const interval = intervalMap.get(currentIntervalStart)!;
          
          // For CPU, add the load value (use maximum for overlapping queries)
          interval.cpu.push(cpuPercent);
          
          // For memory, add the usage value (use maximum for overlapping queries)
          interval.memory.push(memoryMB);
        }

        currentIntervalStart = intervalEnd;
      }
    });

    // Convert map to arrays and calculate values for each interval
    const intervals = Array.from(intervalMap.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        time: formatTime(timestamp),
        // Use maximum CPU load in the interval (for overlapping queries)
        cpu: data.cpu.length > 0 ? Math.max(...data.cpu) : 0,
        // Use maximum memory in the interval (for overlapping queries)
        memory: data.memory.length > 0 ? Math.max(...data.memory) : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    // Convert to chart format
    const cpuArray: { time: string; usage: number }[] = intervals.map(interval => ({
      time: interval.time,
      usage: Math.round(interval.cpu * 100) / 100, // Round to 2 decimal places
    }));

    const memoryArray: { time: string; usage: number }[] = intervals.map(interval => ({
      time: interval.time,
      usage: Math.round(interval.memory * 100) / 100, // Round to 2 decimal places
    }));

    setMemoryData(memoryArray);
    setCpuData(cpuArray);
  };

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
          showError('Copy Failed', 'Failed to copy query to clipboard', 3000);
        });
      } else {
        fallbackCopyTextToClipboard(query, queryId);
      }
    } catch (err) {
      fallbackCopyTextToClipboard(query, queryId);
      showError('Copy Failed', 'Failed to copy query to clipboard', 3000);
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
      showError('Copy Failed', 'Failed to copy query to clipboard', 3000);
    }
    
    document.body.removeChild(textArea);
  };

  const handleQueryClick = (query: Query) => {
    setSelectedQuery(query);
    setIsModalOpen(true);
  };

  const handleStopQuery = async (queryId: string) => {
    if (!selectedNode) {
      showError('No Node Selected', 'Please select a node to stop the query', 3000);
      return;
    }

    try {
      await queryAPI.killProcess({ query_id: queryId, node: selectedNode });
      success('Query Stopped', `Query ${queryId} has been stopped successfully`, 3000);
    } catch (err) {
      console.error('Failed to stop query:', err);
      showError('Stop Failed', `Failed to stop query ${queryId}`, 3000);
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
    if (selectedQueries.size === 0) return;
    
    // Save accepted query IDs - loadChartData will be triggered by useEffect
    setAcceptedQueryIds(new Set(selectedQueries));
    success('Filters Applied', `Charts will update to show ${selectedQueries.size} selected queries`, 3000);
    
    // Keep selection after accepting - user can clear it manually
  };

  const handleResetChartFilter = () => {
    setAcceptedQueryIds(new Set());
    setSelectedQueries(new Set()); // Clear selection when resetting chart filter
    // loadChartData will be triggered by useEffect
    success('Filter Reset', 'Charts will update to show all queries', 3000);
  };

  const handleClearSelection = () => {
    setSelectedQueries(new Set());
    setAcceptedQueryIds(new Set());
    // loadChartData will be triggered by useEffect
  };

  const totalPages = Math.ceil(queryLogPagination.total / parseInt(recordsPerPage));
  const currentQueries = allQueries; // Already paginated by API

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
            <div className="max-w-[1920px] mx-auto p-6 space-y-6 animate-page-enter">
              {/* Stats Cards */}
              <StatsCards
                runningCount={runningQueries.length}
                completedCount={queryStats.finished}
                failedCount={queryStats.error}
                period={selectedPeriod}
                dateFrom={dateFrom}
                dateTo={dateTo}
                selectedUser={selectedUser}
              />

              {/* Running Queries */}
              <RunningQueriesBlock
                queries={runningQueries}
                onQueryClick={handleQueryClick}
                onStopQuery={handleStopQuery}
                onCopyQuery={handleCopyQuery}
                copiedQueryId={copiedQueryId}
                loading={loadingProcesses}
              />

              {/* Filters */}
              <QueryFilters
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                selectedUser={selectedUser}
                onUserChange={setSelectedUser}
                users={users}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                dateFrom={dateFrom}
                onDateFromChange={setDateFrom}
                dateTo={dateTo}
                onDateToChange={setDateTo}
                recordsPerPage={recordsPerPage}
                onRecordsPerPageChange={(value) => {
                  setRecordsPerPage(value);
                  setCurrentPage(1);
                }}
                onApplyFilters={async () => {
                  setCurrentPage(1);
                  setIsApplyingFilters(true);
                  await loadQueryLog();
                  setIsApplyingFilters(false);
                }}
                isApplying={isApplyingFilters || loadingQueryLog}
              />

              {/* Charts */}
              <PerformanceCharts
                memoryData={memoryData}
                cpuData={cpuData}
                loading={loadingQueryLog}
                onResetFilter={handleResetChartFilter}
                isFiltered={acceptedQueryIds.size > 0}
              />

              {/* Query History */}
              <QueryHistoryBlock
                queries={currentQueries}
                selectedQueries={selectedQueries}
                onSelectQuery={handleSelectQuery}
                onAcceptSelected={handleAcceptSelected}
                onClearSelection={handleClearSelection}
                onQueryClick={handleQueryClick}
                onCopyQuery={handleCopyQuery}
                copiedQueryId={copiedQueryId}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={queryLogPagination.total}
                offset={queryLogPagination.offset}
                onPageChange={setCurrentPage}
              />

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
