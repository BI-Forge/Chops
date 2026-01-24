import React from 'react';
import { Activity, CheckCircle, XCircle, Clock, Calendar, User } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface StatCardData {
    title: string;
    value: string;
    icon: React.ComponentType<any>;
    color: string;
    bg: string;
    border: string;
    showPeriod: boolean;
    period?: string;
    dateFrom?: string;
    dateTo?: string;
    user?: string;
}

interface StatsCardsProps {
    runningCount: number;
    completedCount: number;
    failedCount: number;
    period: string;
    dateFrom: string;
    dateTo: string;
    selectedUser: string;
}

export function StatsCards({
                               runningCount,
                               completedCount,
                               failedCount,
                               period,
                               dateFrom,
                               dateTo,
                               selectedUser
                           }: StatsCardsProps) {
    const { theme } = useTheme();

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

    const stats: StatCardData[] = [
        {
            title: 'Running Queries',
            value: runningCount.toString(),
            icon: Activity,
            color: 'text-green-400',
            bg: 'bg-green-500/20',
            border: 'border-green-500/30',
            showPeriod: false,
            user: selectedUser
        },
        {
            title: 'Completed Queries',
            value: completedCount.toString(),
            icon: CheckCircle,
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/20',
            border: 'border-yellow-500/30',
            showPeriod: true,
            period: formatPeriod(period),
            dateFrom: dateFrom,
            dateTo: dateTo,
            user: selectedUser
        },
        {
            title: 'Failed Queries',
            value: failedCount.toString(),
            icon: XCircle,
            color: 'text-green-400',
            bg: 'bg-green-500/20',
            border: 'border-green-500/30',
            showPeriod: true,
            period: formatPeriod(period),
            dateFrom: dateFrom,
            dateTo: dateTo,
            user: selectedUser
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className={`${
                            theme === 'light' ? 'bg-white/90' : 'bg-gray-900/40'
                        } backdrop-blur-md rounded-xl p-6 border ${stat.border}`}
                    >
                        {/* Header with icon */}
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} rounded-lg p-3 ${stat.color}`}>
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
    );
}

