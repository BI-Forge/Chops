import React, { useState, useEffect } from 'react';
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

interface Query {
  id: string;
  query: string;
  user: string;
  database: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  duration: string;
  rowsRead: string;
  bytesRead: string;
  memoryUsage: string;
  cpuUsage: string;
  queryType: string;
}

interface QueriesPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export function QueriesPage({ onLogout, activePage, onPageChange }: QueriesPageProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState('10');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('All Users');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  const { theme } = useTheme();
  const { success, error } = useAlert();

  // Mock data for running queries
  const runningQueries: Query[] = [
    {
      id: 'RQ-001',
      query: 'SELECT user_id, COUNT(*) as total FROM events WHERE date >= today() - 7 GROUP BY user_id ORDER BY total DESC LIMIT 1000',
      user: 'admin',
      database: 'analytics',
      status: 'running',
      startTime: '2024-11-29 14:32:15',
      duration: '2.3s',
      rowsRead: '1,234,567',
      bytesRead: '2.4 GB',
      memoryUsage: '512 MB',
      cpuUsage: '45%',
      queryType: 'SELECT'
    },
    {
      id: 'RQ-002',
      query: 'SELECT event_name, COUNT(*) FROM user_events WHERE timestamp > now() - interval 1 hour GROUP BY event_name',
      user: 'data_analyst',
      database: 'production',
      status: 'running',
      startTime: '2024-11-29 14:33:42',
      duration: '1.1s',
      rowsRead: '456,789',
      bytesRead: '890 MB',
      memoryUsage: '256 MB',
      cpuUsage: '32%',
      queryType: 'SELECT'
    }
  ];

  // Mock data for query history
  const allQueries: Query[] = [
    {
      id: 'Q-12345',
      query: 'SELECT * FROM users WHERE created_at >= today() - 30',
      user: 'admin',
      database: 'main_db',
      status: 'completed',
      startTime: '2024-11-29 14:30:00',
      duration: '0.5s',
      rowsRead: '12,345',
      bytesRead: '1.2 MB',
      memoryUsage: '64 MB',
      cpuUsage: '12%',
      queryType: 'SELECT'
    },
    {
      id: 'Q-12344',
      query: 'SELECT COUNT(DISTINCT user_id) FROM events WHERE date = today()',
      user: 'data_analyst',
      database: 'analytics',
      status: 'completed',
      startTime: '2024-11-29 14:28:15',
      duration: '1.2s',
      rowsRead: '567,890',
      bytesRead: '450 MB',
      memoryUsage: '128 MB',
      cpuUsage: '25%',
      queryType: 'SELECT'
    },
    {
      id: 'Q-12343',
      query: 'INSERT INTO logs SELECT * FROM temp_logs WHERE processed = 0',
      user: 'etl_user',
      database: 'logs_db',
      status: 'failed',
      startTime: '2024-11-29 14:25:00',
      duration: '15.8s',
      rowsRead: '2,345,678',
      bytesRead: '3.2 GB',
      memoryUsage: '1.5 GB',
      cpuUsage: '78%',
      queryType: 'INSERT'
    },
    {
      id: 'Q-12342',
      query: 'SELECT product_id, SUM(quantity) as total_sold FROM orders GROUP BY product_id ORDER BY total_sold DESC LIMIT 100',
      user: 'admin',
      database: 'ecommerce',
      status: 'completed',
      startTime: '2024-11-29 14:20:30',
      duration: '0.8s',
      rowsRead: '89,012',
      bytesRead: '120 MB',
      memoryUsage: '96 MB',
      cpuUsage: '18%',
      queryType: 'SELECT'
    },
    {
      id: 'Q-12341',
      query: 'UPDATE users SET last_login = now() WHERE user_id IN (SELECT user_id FROM active_sessions)',
      user: 'backend_service',
      database: 'main_db',
      status: 'completed',
      startTime: '2024-11-29 14:15:00',
      duration: '3.4s',
      rowsRead: '234,567',
      bytesRead: '180 MB',
      memoryUsage: '200 MB',
      cpuUsage: '35%',
      queryType: 'UPDATE'
    },
    {
      id: 'Q-12340',
      query: 'SELECT date, COUNT(*) as daily_events FROM events GROUP BY date ORDER BY date DESC',
      user: 'data_analyst',
      database: 'analytics',
      status: 'completed',
      startTime: '2024-11-29 14:10:45',
      duration: '2.1s',
      rowsRead: '1,456,789',
      bytesRead: '1.8 GB',
      memoryUsage: '384 MB',
      cpuUsage: '42%',
      queryType: 'SELECT'
    },
    {
      id: 'Q-12339',
      query: 'DELETE FROM temp_data WHERE created_at < now() - interval 24 hour',
      user: 'cleanup_job',
      database: 'temp_db',
      status: 'failed',
      startTime: '2024-11-29 14:05:00',
      duration: '8.9s',
      rowsRead: '678,901',
      bytesRead: '890 MB',
      memoryUsage: '450 MB',
      cpuUsage: '55%',
      queryType: 'DELETE'
    },
    {
      id: 'Q-12338',
      query: 'SELECT customer_id, AVG(order_value) as avg_value FROM orders GROUP BY customer_id HAVING avg_value > 100',
      user: 'admin',
      database: 'ecommerce',
      status: 'completed',
      startTime: '2024-11-29 14:00:20',
      duration: '1.5s',
      rowsRead: '345,678',
      bytesRead: '290 MB',
      memoryUsage: '180 MB',
      cpuUsage: '28%',
      queryType: 'SELECT'
    }
  ];

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

  const handleStopQuery = (queryId: string) => {
    console.log('Stopping query:', queryId);
    // In real app, this would call an API to stop the query
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

  const handleSelectAll = () => {
    if (selectedQueries.size === paginatedQueries.length) {
      setSelectedQueries(new Set());
    } else {
      setSelectedQueries(new Set(paginatedQueries.map(q => q.id)));
    }
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

  const totalPages = Math.ceil(allQueries.length / parseInt(recordsPerPage));
  const startIndex = (currentPage - 1) * parseInt(recordsPerPage);
  const endIndex = startIndex + parseInt(recordsPerPage);
  const currentQueries = allQueries.slice(startIndex, endIndex);

  const stats = [
    {
      title: 'Running Queries',
      value: runningQueries.length.toString(),
      icon: Activity,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30'
    },
    {
      title: 'Completed Queries',
      value: allQueries.filter(q => q.status === 'completed').length.toString(),
      icon: CheckCircle,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30'
    },
    {
      title: 'Failed Queries',
      value: allQueries.filter(q => q.status === 'failed').length.toString(),
      icon: XCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30'
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
            title="Query History" 
            description="Monitor and analyze database queries"
            onMenuOpen={() => setMobileMenuOpen(true)}
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
              <div className={`${stat.color} flex items-baseline gap-2`}>
                <span className="text-3xl font-mono">{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running Queries */}
      {runningQueries.length > 0 && (
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
                      <span className={`text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`}>{query.startTime}</span>
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
                        {query.duration}
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
        <div className="flex items-center gap-2 mb-4">
          <Filter className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
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
              options={['All Users', 'admin', 'data_analyst', 'etl_user', 'backend_service', 'cleanup_job']}
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
          <div className="lg:col-span-2">
            <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Records per Page</label>
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
                dot={{ fill: '#F59E0B', r: 3 }}
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
                dot={{ fill: '#F97316', r: 3 }}
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
                      <span className={`text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`}>{query.startTime}</span>
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
                        {query.duration}
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
            Showing {startIndex + 1} to {Math.min(endIndex, allQueries.length)} of {allQueries.length} queries
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
