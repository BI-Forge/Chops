import React from 'react';
import { Database, HardDrive, Layers, Table } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface TablesStatsCardsProps {
  totalTables: number;
  totalRows: number;
  totalSize: number;
  totalParts: number;
}

export function TablesStatsCards({ totalTables, totalRows, totalSize, totalParts }: TablesStatsCardsProps) {
  const { theme } = useTheme();

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const stats = [
    {
      title: 'Total Tables',
      value: formatNumber(totalTables),
      icon: Table,
      color: theme === 'light' ? 'text-amber-700' : 'text-yellow-400',
      bg: theme === 'light' ? 'bg-amber-500/20' : 'bg-yellow-500/20',
      border: theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/30'
    },
    {
      title: 'Total Rows',
      value: formatNumber(totalRows),
      icon: Layers,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30'
    },
    {
      title: 'Total Size',
      value: formatBytes(totalSize),
      icon: HardDrive,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30'
    },
    {
      title: 'Total Parts',
      value: formatNumber(totalParts),
      icon: Database,
      color: 'text-purple-400',
      bg: 'bg-purple-500/20',
      border: 'border-purple-500/30'
    },
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
              <div className={`${stat.bg} rounded-lg p-3 ${stat.color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
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
