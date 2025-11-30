import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Cpu, Database, HardDrive, FileText, RefreshCw, Clock, Calendar } from 'lucide-react';
import { CustomSelect } from './CustomSelect';
import { useTheme } from '../contexts/ThemeContext';
import { metricsAPI } from '../services/metricsAPI';
import type { MetricSeriesPoint } from '../types/metrics';

// Format timestamp for display
const formatTime = (timestamp: string, interval: string): string => {
  const date = new Date(timestamp);
  switch (interval) {
    case '1s':
    case '5s':
    case '10s':
    case '30s':
    case '1m':
    case '5m':
    case '30m':
      return date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
    case '1h':
      return date.getHours() + ':00';
    default:
      return date.getHours() + ':00';
  }
};

// Convert API data to chart format
const convertToChartData = (
  cpuData: MetricSeriesPoint[],
  memoryPercentData: MetricSeriesPoint[],
  memoryGBData: MetricSeriesPoint[],
  diskData: MetricSeriesPoint[],
  queriesData: MetricSeriesPoint[],
  interval: string
) => {
  const maxLength = Math.max(cpuData.length, memoryPercentData.length, memoryGBData.length, diskData.length, queriesData.length);
  const data = [];
  
  for (let i = 0; i < maxLength; i++) {
    const cpuPoint = cpuData[i];
    const memoryPercentPoint = memoryPercentData[i];
    const memoryGBPoint = memoryGBData[i];
    const diskPoint = diskData[i];
    const queriesPoint = queriesData[i];
    
    // Use the timestamp from the first available point
    const timestamp = cpuPoint?.timestamp || memoryPercentPoint?.timestamp || memoryGBPoint?.timestamp || diskPoint?.timestamp || queriesPoint?.timestamp;
    
    data.push({
      time: formatTime(timestamp || new Date().toISOString(), interval),
      cpu: cpuPoint ? Math.round(cpuPoint.value) : 0,
      memory: memoryPercentPoint ? Math.round(memoryPercentPoint.value) : 0,
      memoryGB: memoryGBPoint ? Math.round(memoryGBPoint.value * 10) / 10 : 0, // Round to 1 decimal place
      storage: diskPoint ? Math.round(diskPoint.value) : 0,
      queries: queriesPoint ? Math.round(queriesPoint.value) : 0,
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
  absoluteValue?: number;
  absoluteUnit?: string;
  swapDisplay?: boolean; // New prop to swap primary and secondary display
}

function ChartCard({ title, icon, children, currentValue, unit, absoluteValue, absoluteUnit, swapDisplay }: ChartCardProps) {
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
            {swapDisplay && absoluteValue !== undefined && absoluteUnit ? (
              // Display currentValue (GB) as primary, absoluteValue (%) as secondary
              <>
                <div className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} font-mono flex items-baseline gap-1.5`}>
                  <span className="text-2xl">{currentValue}</span>
                  <span className="text-lg">{unit}</span>
                  <span className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    ({absoluteValue}{absoluteUnit})
                  </span>
                </div>
              </>
            ) : (
              // Display percentage as primary, absolute value as secondary (default)
              <>
                <div className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-2xl font-mono`}>
                  {currentValue}{unit}
                </div>
                {absoluteValue !== undefined && absoluteUnit && (
                  <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} mt-0.5`}>
                    {absoluteValue} {absoluteUnit}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="h-64 min-h-[256px]">
        {children}
      </div>
    </div>
  );
}

interface SystemChartsProps {
  selectedNode?: string;
}

export function SystemCharts({ selectedNode = '' }: SystemChartsProps) {
  // Load period from sessionStorage or use default
  const [period, setPeriod] = useState(() => {
    return sessionStorage.getItem('dashboardPeriod') || '1d';
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [memoryTotalGB, setMemoryTotalGB] = useState<number>(0);
  const { theme } = useTheme();

  // Save period to sessionStorage when it changes
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    sessionStorage.setItem('dashboardPeriod', newPeriod);
  };

  // Period configurations matching backend periodConfigurations
  // Maps UI period to API period and default step
  const periodConfigurations: Record<string, { apiPeriod: string; step: string; displayStep: string; label: string }> = {
    '10m': { apiPeriod: '10m', step: '1s', displayStep: '1s', label: 'Last 10 Minutes' },
    '30m': { apiPeriod: '30m', step: '10s', displayStep: '10s', label: 'Last 30 Minutes' },
    '1h': { apiPeriod: '1h', step: '1m', displayStep: '1m', label: 'Last 1 Hour' },
    '6h': { apiPeriod: '6h', step: '5m', displayStep: '5m', label: 'Last 6 Hours' },
    '12h': { apiPeriod: '12h', step: '5m', displayStep: '5m', label: 'Last 12 Hours' },
    '1d': { apiPeriod: '1d', step: '30m', displayStep: '30m', label: 'Last 24 Hours' },
    '3d': { apiPeriod: '3d', step: '1h', displayStep: '1h', label: 'Last 3 Days' },
    '7d': { apiPeriod: '7d', step: '1h', displayStep: '1h', label: 'Last 7 Days' },
  };

  // Get period config
  const getPeriodConfig = () => {
    return periodConfigurations[period] || periodConfigurations['1d'];
  };

  // Get current period config
  const periodConfig = getPeriodConfig();
  const interval = periodConfig.displayStep;

  // Load chart data from API
  const loadChartData = async () => {
    if (!selectedNode) {
      setData([]);
      return;
    }

    try {
      const { apiPeriod, step } = getPeriodConfig();

      // Load current metrics to get memory_total_gb for YAxis
      const currentMetrics = await metricsAPI.getCurrentMetrics(selectedNode);
      setMemoryTotalGB(Math.round(currentMetrics.memory_total_gb));

      // Load all metrics in parallel
      const [cpuData, memoryPercentData, memoryGBData, diskData, queriesData] = await Promise.all([
        metricsAPI.getMetricSeries(selectedNode, 'cpu_load', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'memory_load', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'memory_used_gb', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'storage_used', apiPeriod, step),
        metricsAPI.getMetricSeries(selectedNode, 'active_queries', apiPeriod, step),
      ]);

      const chartData = convertToChartData(
        cpuData.points,
        memoryPercentData.points,
        memoryGBData.points,
        diskData.points,
        queriesData.points,
        periodConfig.step
      );

      setData(chartData);
    } catch (error) {
      console.error('Failed to load chart data:', error);
      setData([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load data when node or period changes
  useEffect(() => {
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, period]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadChartData();
  };
  
  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      <div
        className={`${
          theme === 'light'
            ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50'
            : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/30'
        } backdrop-blur-md rounded-xl p-4 border transition-all duration-300`}
      >
        <div className="flex flex-wrap items-center gap-4">
          {/* Period Filter */}
          <CustomSelect
            value={period}
            onChange={handlePeriodChange}
            options={Object.entries(periodConfigurations).map(([value, config]) => ({
              value,
              label: config.label
            }))}
            icon={Calendar}
            label="Period:"
          />
          
          {/* Interval Display (read-only, based on period) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            theme === 'light' ? 'bg-gray-100 border border-gray-300' : 'bg-gray-800/60 border border-gray-700/50'
          }`}>
            <Clock className={`w-4 h-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`} />
            <span className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
              Interval: <span className="font-medium">{interval}</span>
            </span>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              theme === 'light'
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
            } transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
      {/* CPU Load - Area Chart */}
      <ChartCard
        title="CPU Load"
        icon={<Cpu className="w-5 h-5" />}
        currentValue={data.length > 0 ? data[data.length - 1].cpu : 0}
        unit="%"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.length > 0 ? data : []}>
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

      {/* Memory Load - Area Chart */}
      <ChartCard
        title="Memory Load"
        icon={<Database className="w-5 h-5" />}
        currentValue={data.length > 0 ? data[data.length - 1].memoryGB : 0}
        unit=" GB"
        absoluteValue={data.length > 0 ? data[data.length - 1].memory : 0}
        absoluteUnit="%"
        swapDisplay={true}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.length > 0 ? data : []}>
            <defs>
              <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
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
              domain={[0, memoryTotalGB || 700]}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Area
              type="monotone"
              dataKey="memoryGB"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#memoryGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Storage Used - Bar Chart */}
      <ChartCard
        title="Storage Used"
        icon={<HardDrive className="w-5 h-5" />}
        currentValue={data.length > 0 ? data[data.length - 1].storage : 0}
        unit="%"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.length > 0 ? data : []}>
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
        currentValue={data.length > 0 ? data[data.length - 1].queries : 0}
        unit=""
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.length > 0 ? data : []}>
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
