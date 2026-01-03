import React from 'react';
import { Database, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface StatCardData {
  title: string;
  value: string;
  icon: React.ComponentType<any>;
  color: string;
  bg: string;
  border: string;
}

interface BackupStatsCardsProps {
  totalCount: number;
  inProgressCount: number;
  completedCount: number;
  failedCount: number;
}

export function BackupStatsCards({ 
  totalCount, 
  inProgressCount, 
  completedCount,
  failedCount
}: BackupStatsCardsProps) {
  const { theme } = useTheme();

  const stats: StatCardData[] = [
    {
      title: 'Total Backups',
      value: totalCount.toString(),
      icon: Database,
      color: theme === 'light' ? 'text-amber-700' : 'text-yellow-400',
      bg: theme === 'light' ? 'bg-amber-500/20' : 'bg-yellow-500/20',
      border: theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/30'
    },
    {
      title: 'In Progress',
      value: inProgressCount.toString(),
      icon: Activity,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30'
    },
    {
      title: 'Completed',
      value: completedCount.toString(),
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30'
    },
    {
      title: 'Failed',
      value: failedCount.toString(),
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className={`${stat.bg} rounded-lg p-3 ${stat.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 ${
                index === 1 ? 'animate-pulse' : ''
              }`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
            
            {/* Title */}
            <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>{stat.title}</div>
            
            {/* Value */}
            <div className={`${stat.color}`}>
              <span className="text-3xl font-mono">{stat.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
