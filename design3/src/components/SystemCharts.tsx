import React, { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Cpu, Database, HardDrive, FileText, RefreshCw, Clock, Calendar } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { useTheme } from '../contexts/ThemeContext';

// Generate test data
const generateTimeSeriesData = (points: number = 24, interval: string = '1h') => {
  const data = [];
  const now = new Date();
  
  let timeIncrement = 3600000; // 1 hour by default
  let formatTime = (date: Date) => date.getHours() + ':00';
  
  switch (interval) {
    case '5m':
      timeIncrement = 300000;
      formatTime = (date: Date) => date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
      break;
    case '15m':
      timeIncrement = 900000;
      formatTime = (date: Date) => date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
      break;
    case '1h':
      timeIncrement = 3600000;
      formatTime = (date: Date) => date.getHours() + ':00';
      break;
    case '1d':
      timeIncrement = 86400000;
      formatTime = (date: Date) => (date.getMonth() + 1) + '/' + date.getDate();
      break;
  }
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * timeIncrement);
    data.push({
      time: formatTime(time),
      cpu: Math.floor(Math.random() * 40) + 30,
      memory: Math.floor(Math.random() * 30) + 50,
      storage: Math.floor(Math.random() * 10) + 75,
      queries: Math.floor(Math.random() * 3000) + 1000,
    });
  }
  
  return data;
};

// Component for custom tooltip
const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${
        theme === 'light' 
          ? 'bg-white/95 border-amber-500/40 shadow-lg' 
          : 'bg-gray-900/95 border-yellow-500/30 shadow-xl'
      } backdrop-blur-md border rounded-lg p-3`}>
        <p className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-sm mb-2`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-xs`} style={{ color: entry.color }}>
            {entry.name}: {entry.value}{entry.unit || '%'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  currentValue: number;
  unit: string;
}

function ChartCard({ title, icon, children, currentValue, unit }: ChartCardProps) {
  const { theme } = useTheme();
  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50' : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/40'
    } backdrop-blur-md rounded-xl p-6 border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`${
            theme === 'light' ? 'bg-amber-500/20 text-amber-700 group-hover:bg-amber-500/30' : 'bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30'
          } rounded-lg p-2 group-hover:scale-110 transition-all duration-300`}>
            {icon}
          </div>
          <div>
            <h3 className={theme === 'light' ? 'text-gray-700' : 'text-gray-300'}>{title}</h3>
            <div className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-2xl font-mono`}>
              {currentValue}{unit}
            </div>
          </div>
        </div>
      </div>
      <div className="h-64 min-h-[256px]">
        {children}
      </div>
    </div>
  );
}

export function SystemCharts() {
  const [period, setPeriod] = useState('24h');
  const [interval, setInterval] = useState('1h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { theme } = useTheme();
  
  // Determine number of points based on period
  const getPointsCount = () => {
    switch (period) {
      case '1h': return 12;
      case '6h': return 24;
      case '24h': return 24;
      case '7d': return 28;
      case '30d': return 30;
      default: return 24;
    }
  };
  
  const data = generateTimeSeriesData(getPointsCount(), interval);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };
  
  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div className={`${
        theme === 'light' ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50' : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/30'
      } backdrop-blur-md rounded-xl p-4 border transition-all duration-300`}>
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Filter */}
          <CustomSelect
            value={period}
            onChange={setPeriod}
            options={[
              { value: '1h', label: 'Last 1 Hour' },
              { value: '6h', label: 'Last 6 Hours' },
              { value: '24h', label: 'Last 24 Hours' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' }
            ]}
            icon={Calendar}
            label="Period:"
          />
          
          {/* Interval Filter */}
          <CustomSelect
            value={interval}
            onChange={setInterval}
            options={[
              { value: '5m', label: '5 Minutes' },
              { value: '15m', label: '15 Minutes' },
              { value: '1h', label: '1 Hour' },
              { value: '1d', label: '1 Day' }
            ]}
            icon={Clock}
            label="Interval:"
          />
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 hover:from-amber-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      {/* CPU Load - Area Chart */}
      <ChartCard
        title="CPU Load"
        icon={<Cpu className="w-5 h-5" />}
        currentValue={data[data.length - 1].cpu}
        unit="%"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#cpuGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Memory Load - Line Chart */}
      <ChartCard
        title="Memory Load"
        icon={<Database className="w-5 h-5" />}
        currentValue={data[data.length - 1].memory}
        unit="%"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#fbbf24' }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Storage Used - Bar Chart */}
      <ChartCard
        title="Storage Used"
        icon={<HardDrive className="w-5 h-5" />}
        currentValue={data[data.length - 1].storage}
        unit="%"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <defs>
              <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Bar
              dataKey="storage"
              fill="url(#storageGradient)"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Active Queries - Area Chart with gradient */}
      <ChartCard
        title="Active Queries"
        icon={<FileText className="w-5 h-5" />}
        currentValue={data[data.length - 1].queries}
        unit=""
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="queriesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af" 
              style={{ fontSize: '12px' }}
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Area
              type="monotone"
              dataKey="queries"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#queriesGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      </div>
    </div>
  );
}
