import { Filter, Search, Check, Play } from 'lucide-react';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';
import { useTheme } from '../../contexts/ThemeContext';

interface QueryFiltersProps {
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    selectedUser: string;
    onUserChange: (value: string) => void;
    users: string[];
    selectedStatus: string;
    onStatusChange: (value: string) => void;
    selectedPeriod: string;
    onPeriodChange: (value: string) => void;
    dateFrom: string;
    onDateFromChange: (value: string) => void;
    dateTo: string;
    onDateToChange: (value: string) => void;
    recordsPerPage: string;
    onRecordsPerPageChange: (value: string) => void;
    onApplyFilters: () => void;
    isApplying: boolean;
}

export function QueryFilters({
                                 searchQuery,
                                 onSearchQueryChange,
                                 selectedUser,
                                 onUserChange,
                                 users,
                                 selectedStatus,
                                 onStatusChange,
                                 selectedPeriod,
                                 onPeriodChange,
                                 dateFrom,
                                 onDateFromChange,
                                 dateTo,
                                 onDateToChange,
                                 recordsPerPage,
                                 onRecordsPerPageChange,
                                 onApplyFilters,
                                 isApplying
                             }: QueryFiltersProps) {
    const { theme } = useTheme();

    return (
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
                    onClick={onApplyFilters}
                    disabled={isApplying}
                    className={`px-4 py-2 rounded-lg text-sm ${
                        theme === 'light'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                            : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
                    } transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {isApplying ? (
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
                            onChange={(e) => onSearchQueryChange(e.target.value)}
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
                        onChange={onUserChange}
                        options={['All Users', ...users]}
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Status</label>
                    <CustomSelect
                        value={selectedStatus}
                        onChange={onStatusChange}
                        options={['All Statuses', 'running', 'completed', 'failed']}
                    />
                </div>

                {/* Period Filter */}
                <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Period</label>
                    <CustomSelect
                        value={selectedPeriod}
                        onChange={onPeriodChange}
                        options={['15min', '30min', '1h', '2h']}
                    />
                </div>

                {/* Date From */}
                <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Date From</label>
                    <CustomDatePicker
                        value={dateFrom}
                        onChange={onDateFromChange}
                        placeholder="Select start date & time"
                        showTime={true}
                    />
                </div>

                {/* Date To */}
                <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Date To</label>
                    <CustomDatePicker
                        value={dateTo}
                        onChange={onDateToChange}
                        placeholder="Select end date & time"
                        showTime={true}
                    />
                </div>

                {/* Records per Page */}
                <div>
                    <label className={`block ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>Per Page</label>
                    <CustomSelect
                        value={recordsPerPage}
                        onChange={onRecordsPerPageChange}
                        options={['10', '25', '50', '100']}
                    />
                </div>
            </div>
        </div>
    );
}

