import { useState, useEffect, useRef } from 'react';
import { Cpu, Database, HardDrive, Activity, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { metricsAPI } from '../services/metricsAPI';
import type { SystemMetrics } from '../types/metrics';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  max?: number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, unit, max = 100, icon }: MetricCardProps) {
  const { theme } = useTheme();
  const percentage = max ? (value / max) * 100 : value;
  
  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'yellow';
    return 'green';
  };
  
  const color = getColor();
  
  const colorClasses = {
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
      progress: 'bg-gradient-to-r from-red-600 to-red-500',
      glow: 'shadow-red-500/20',
    },
    yellow: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30',
      progress: 'bg-gradient-to-r from-amber-500 to-yellow-500',
      glow: 'shadow-yellow-500/20',
    },
    green: {
      text: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
      progress: 'bg-gradient-to-r from-green-600 to-green-500',
      glow: 'shadow-green-500/20',
    },
  };
  
  const colors = colorClasses[color];
  
  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90' : 'bg-gray-900/40'
    } backdrop-blur-md rounded-xl p-4 sm:p-6 border ${colors.border} hover:${colors.glow} hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 group animate-fade-in-up`}>
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors.bg} rounded-lg p-3 ${colors.text} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          {icon}
        </div>
      </div>
      
      {/* Title */}
      <div className={`${theme === 'light' ? 'text-gray-700 font-medium' : 'text-gray-400'} text-sm mb-2`}>{title}</div>
      
      {/* Value */}
      <div className={`${colors.text} mb-4 flex items-baseline gap-2`}>
        <span className="text-3xl font-mono">{value}</span>
        <span className={`text-lg ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`}>{unit}</span>
      </div>
      
      {/* Progress bar */}
      {max && (
        <div className="relative">
          <div className={`h-2 ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-800'} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${colors.progress} rounded-full transition-all duration-1000 ease-out relative`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                   style={{ 
                     animation: 'shimmer 2s infinite',
                     backgroundSize: '200% 100%'
                   }} 
              />
            </div>
          </div>
          <div className={`flex justify-between text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} mt-1`}>
            <span>0</span>
            <span>{max} {unit}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricsCardsProps {
  selectedNode?: string;
}

export function MetricsCards({ selectedNode = '' }: MetricsCardsProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const { theme } = useTheme();

  // Load initial metrics and setup SSE stream
  useEffect(() => {
    if (!selectedNode) {
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        setLoading(true);
        // Load initial metrics
        const initialMetrics = await metricsAPI.getCurrentMetrics(selectedNode);
        setMetrics(initialMetrics);
        setLoading(false);

        // Setup SSE stream for real-time updates
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        eventSourceRef.current = metricsAPI.streamMetrics(
          selectedNode,
          (updatedMetrics) => {
            setMetrics(updatedMetrics);
          },
          (error) => {
            console.error('SSE error:', error);
            // Try to reconnect after delay
            setTimeout(() => {
              if (selectedNode) {
                loadMetrics();
              }
            }, 5000);
          }
        );
      } catch (error) {
        console.error('Failed to load metrics:', error);
        setLoading(false);
      }
    };

    loadMetrics();

    // Cleanup on unmount or node change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [selectedNode]);

  // Prepare metrics data for display
  const metricsData = metrics ? [
    {
      title: 'CPU Load',
      value: Math.round(metrics.cpu_load),
      unit: '%',
      max: 100,
      icon: <Cpu className="w-6 h-6" />,
    },
    {
      title: 'Memory Load',
      value: Math.round(metrics.memory_usage),
      unit: '%',
      max: 100,
      icon: <Database className="w-6 h-6" />,
    },
    {
      title: 'Storage Used',
      value: Math.round(metrics.disk_used_gb),
      unit: 'GB',
      max: Math.round(metrics.disk_total_gb),
      icon: <HardDrive className="w-6 h-6" />,
    },
    {
      title: 'Active Connections',
      value: metrics.active_conns,
      unit: '',
      max: Math.max(metrics.active_conns * 2, 500),
      icon: <Activity className="w-6 h-6" />,
    },
    {
      title: 'Active Queries',
      value: metrics.active_queries,
      unit: '',
      max: Math.max(metrics.active_queries * 2, 5000),
      icon: <FileText className="w-6 h-6" />,
    },
  ] : [];

  if (!selectedNode) {
    return (
      <div className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} text-center py-8`}>
        Please select a node to view metrics
      </div>
    );
  }

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
        {[1, 2, 3, 4, 5].map((index) => (
          <div key={index} className={`${theme === 'light' ? 'bg-white/90' : 'bg-gray-900/40'} backdrop-blur-md rounded-xl p-4 sm:p-6 border ${theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'} animate-pulse`}>
            <div className="h-24 bg-gray-300/20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
      {metricsData.map((metric, index) => (
        <div key={index} style={{ animationDelay: `${index * 100}ms` }}>
          <MetricCard {...metric} />
        </div>
      ))}
    </div>
  );
}

// Add CSS animations
const styles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@keyframes fade-in-up {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out forwards;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
