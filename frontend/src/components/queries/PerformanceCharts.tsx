import { HardDrive, Cpu, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

interface ChartData {
    time: string;
    usage: number;
}

interface PerformanceChartsProps {
    memoryData: ChartData[];
    cpuData: ChartData[];
    loading?: boolean;
    onResetFilter?: () => void;
    isFiltered?: boolean;
}

export function PerformanceCharts({ memoryData, cpuData, loading = false, onResetFilter, isFiltered = false }: PerformanceChartsProps) {
    const { theme } = useTheme();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Usage Chart */}
            <div className={`${
                theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/60 border-yellow-500/20'
            } backdrop-blur-md rounded-xl border p-6`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <HardDrive className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                        <h3 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Memory Usage</h3>
                        {isFiltered && (
                            <span className={`text-xs px-2 py-1 rounded ${theme === 'light' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                Filtered
                            </span>
                        )}
                    </div>
                    {isFiltered && onResetFilter && (
                        <button
                            onClick={onResetFilter}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                theme === 'light'
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
                <div className="w-full h-[250px] relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Loader2 className={`w-6 h-6 animate-spin ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <AreaChart data={memoryData.length > 0 ? memoryData : []}>
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
                                interval="preserveStartEnd"
                                tick={{ fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
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
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Cpu className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                        <h3 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>CPU Usage (%)</h3>
                        {isFiltered && (
                            <span className={`text-xs px-2 py-1 rounded ${theme === 'light' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                Filtered
                            </span>
                        )}
                    </div>
                    {isFiltered && onResetFilter && (
                        <button
                            onClick={onResetFilter}
                            className={`text-xs px-3 py-1 rounded transition-colors ${
                                theme === 'light'
                                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            }`}
                        >
                            Reset Filter
                        </button>
                    )}
                </div>
                <div className="w-full h-[250px] relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Loader2 className={`w-6 h-6 animate-spin ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <AreaChart data={cpuData.length > 0 ? cpuData : []}>
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
                                interval="preserveStartEnd"
                                tick={{ fontSize: 10 }}
                                angle={-45}
                                textAnchor="end"
                                height={70}
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
    );
}

