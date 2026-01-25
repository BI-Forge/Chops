import React, { useState } from 'react';
import { Search, Filter, Settings as SettingsIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { SettingDetailsModal } from '../components/SettingDetailsModal';
import { SettingsTable, Setting } from '../components/SettingsTable';
import { CustomSelect } from '../components/CustomSelect';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';

interface SettingsPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export default function SettingsPage({ onLogout, activePage, onPageChange }: SettingsPageProps) {
  const { theme } = useTheme();
  const { showAlert, success } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [selectedTier, setSelectedTier] = useState('All Tiers');
  const [selectedType, setSelectedType] = useState('All Types');
  const [showChanged, setShowChanged] = useState(false);
  const [selectedServer, setSelectedServer] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'changed' | 'server' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data - expanded settings list
  const settings: Setting[] = [
    {
      name: 'allow_nondeterministic_mutations',
      value: '0',
      changed: 0,
      description: 'User-level setting that allows mutations on replicated tables to make use of non-deterministic functions such as dictGet. Given that, for example, dictionaries, can be out of sync across nodes, mutations that pull values from them are disallowed on replicated tables by default. Enabling this setting allows this behavior, making it the user\'s responsibility to ensure that the data used is in sync across all nodes.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'Bool',
      default: '0',
      alias_for: '',
      is_obsolete: 0,
      tier: 'Production',
      server: false
    },
    {
      name: 'background_buffer_flush_schedule_pool_size',
      value: '16',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '16',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_pool_size',
      value: '16',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '16',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_merges_mutations_concurrency_ratio',
      value: '2',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'Float',
      default: '2',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_move_pool_size',
      value: '8',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '8',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_fetches_pool_size',
      value: '8',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '8',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_common_pool_size',
      value: '8',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '8',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_schedule_pool_size',
      value: '128',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '128',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_message_broker_schedule_pool_size',
      value: '16',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '16',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'background_distributed_schedule_pool_size',
      value: '16',
      changed: 0,
      description: 'User-level setting is deprecated, and it must be defined in the server configuration instead.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '16',
      alias_for: '',
      is_obsolete: 1,
      tier: 'Obsolete',
      server: true
    },
    {
      name: 'max_memory_usage',
      value: '10737418240',
      changed: 1,
      description: 'Maximum memory usage for processing of single query. Zero means unlimited.',
      min: '0',
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '0',
      alias_for: '',
      is_obsolete: 0,
      tier: 'Production',
      server: false
    },
    {
      name: 'max_execution_time',
      value: '300',
      changed: 1,
      description: 'Maximum query execution time in seconds. Zero means unlimited.',
      min: '0',
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'UInt64',
      default: '0',
      alias_for: '',
      is_obsolete: 0,
      tier: 'Production',
      server: false
    },
    {
      name: 'enable_optimize_predicate_expression',
      value: '1',
      changed: 0,
      description: 'If it is set to true, optimize predicates to subqueries.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'Bool',
      default: '1',
      alias_for: '',
      is_obsolete: 0,
      tier: 'Production',
      server: true
    },
    {
      name: 'allow_experimental_analyzer',
      value: '0',
      changed: 0,
      description: 'Allow new query analyzer. This is an experimental feature.',
      min: null,
      max: null,
      disallowed_values: [],
      readonly: 0,
      type: 'Bool',
      default: '0',
      alias_for: '',
      is_obsolete: 0,
      tier: 'Experimental',
      server: false
    }
  ];

  // Get unique tiers and types
  const allTiers = ['All Tiers', ...Array.from(new Set(settings.map(s => s.tier)))];
  const allTypes = ['All Types', ...Array.from(new Set(settings.map(s => s.type)))];

  // Filter settings
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = setting.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         setting.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'All Tiers' || setting.tier === selectedTier;
    const matchesType = selectedType === 'All Types' || setting.type === selectedType;
    const matchesChanged = !showChanged || setting.changed === 1;
    const matchesServer = selectedServer === 'All' || 
                         (selectedServer === 'Yes' && setting.server) ||
                         (selectedServer === 'No' && !setting.server);
    
    return matchesSearch && matchesTier && matchesType && matchesChanged && matchesServer;
  });

  // Sort settings
  const sortedSettings = filteredSettings.sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === 'name') {
      return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (sortField === 'changed') {
      return sortDirection === 'asc' ? a.changed - b.changed : b.changed - a.changed;
    } else if (sortField === 'server') {
      return sortDirection === 'asc' ? (a.server ? 1 : 0) - (b.server ? 1 : 0) : (b.server ? 1 : 0) - (a.server ? 1 : 0);
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedSettings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSettings = sortedSettings.slice(startIndex, endIndex);

  const handleViewDetails = (setting: Setting) => {
    setSelectedSetting(setting);
  };

  const handleApplyFilters = () => {
    setIsApplyingFilters(true);
    setTimeout(() => {
      setIsApplyingFilters(false);
      setCurrentPage(1);
      success('Filters applied successfully');
    }, 500);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (field: 'name' | 'changed' | 'server') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

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
            activePage={activePage || 'settings'}
            onPageChange={onPageChange}
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          activePage={activePage || 'settings'}
          onLogout={onLogout}
          onPageChange={onPageChange}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader
            title="Settings"
            description="Manage ClickHouse server settings and configurations"
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1920px] mx-auto p-6 space-y-6">
              {/* Filters Section */}
              <div className={`${
                theme === 'light' 
                  ? 'bg-white/90 border-amber-500/30' 
                  : 'bg-gray-900/60 border-yellow-500/20'
              } backdrop-blur-md rounded-xl border p-6`}>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                    <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
                  </div>
                  
                  {/* Apply Button */}
                  <button
                    onClick={handleApplyFilters}
                    disabled={isApplyingFilters}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      theme === 'light'
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700 hover:text-amber-800'
                        : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400 hover:text-yellow-300'
                    } transition-all disabled:opacity-50 flex items-center gap-2 font-medium`}
                  >
                    <Filter className="w-4 h-4" />
                    {isApplyingFilters ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <label className={`block text-sm mb-2 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Search Settings
                    </label>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                        theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                          theme === 'light'
                            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                            : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
                        } focus:outline-none transition-colors text-sm`}
                      />
                    </div>
                  </div>

                  {/* Tier Filter */}
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Tier
                    </label>
                    <CustomSelect
                      options={allTiers}
                      value={selectedTier}
                      onChange={setSelectedTier}
                      placeholder="Select tier"
                    />
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Type
                    </label>
                    <CustomSelect
                      options={allTypes}
                      value={selectedType}
                      onChange={setSelectedType}
                      placeholder="Select type"
                    />
                  </div>

                  {/* Server Filter */}
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Server
                    </label>
                    <CustomSelect
                      options={['All', 'Yes', 'No']}
                      value={selectedServer}
                      onChange={setSelectedServer}
                      placeholder="Select server"
                    />
                  </div>

                  {/* Items per page */}
                  <div>
                    <label className={`block text-sm mb-2 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      Show
                    </label>
                    <CustomSelect
                      value={itemsPerPage.toString()}
                      onChange={(value) => handleItemsPerPageChange(Number(value))}
                      options={['5', '10', '25', '50']}
                    />
                  </div>
                </div>

                {/* Changed Filter Button - Separate Row */}
                <div className="mt-4">
                  <button
                    onClick={() => setShowChanged(!showChanged)}
                    className={`px-4 py-2.5 rounded-xl border transition-all ${
                      showChanged
                        ? theme === 'light'
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-700'
                          : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400'
                        : theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-700 hover:border-amber-500/40'
                          : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-yellow-500/30'
                    } text-sm`}
                  >
                    {showChanged ? '✓ ' : ''}Show only changed settings
                  </button>
                </div>
              </div>

              {/* Settings Table */}
              <div className={`${
                theme === 'light'
                  ? 'bg-white/90 border-amber-500/30'
                  : 'bg-gray-900/60 border-yellow-500/20'
              } backdrop-blur-md rounded-xl border p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                  <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Settings List</h2>
                  <span className={`px-2 py-1 rounded-lg ${
                    theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
                  } text-xs`}>
                    {filteredSettings.length}
                  </span>
                </div>

                <SettingsTable
                  settings={currentSettings}
                  onViewDetails={handleViewDetails}
                  onSort={handleSort}
                  sortField={sortField}
                  sortDirection={sortDirection}
                />

                {/* Pagination */}
                {filteredSettings.length > 0 && (
                  <div className={`flex items-center justify-between mt-6 pt-6 border-t ${
                    theme === 'light' ? 'border-amber-500/30' : 'border-gray-700/50'
                  }`}>
                    <div className={`text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`}>
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredSettings.length)} of {filteredSettings.length} settings
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* First Page Button */}
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                          theme === 'light'
                            ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <ChevronsLeft className="w-4 h-4" />
                          <span>First</span>
                        </div>
                      </button>

                      {/* Previous Page Button */}
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
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
                                onClick={() => handlePageChange(1)}
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
                                onClick={() => handlePageChange(i)}
                                className={`w-8 h-8 rounded-lg transition-all duration-200 border ${
                                  currentPage === i
                                    ? theme === 'light'
                                      ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                                      : 'bg-yellow-500 hover:bg-yellow-600 text-gray-900 border-yellow-600'
                                    : theme === 'light'
                                      ? 'bg-white hover:bg-amber-50 text-gray-700 hover:text-amber-700 border-amber-500/40 hover:border-amber-600'
                                      : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400 border-gray-700/50 hover:border-yellow-500/30'
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
                                onClick={() => handlePageChange(totalPages)}
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
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-2 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                          theme === 'light'
                            ? 'bg-white hover:bg-amber-50 border-amber-500/40 hover:border-amber-600'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span>Last</span>
                          <ChevronsRight className="w-4 h-4" />
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setting Details Modal */}
      {selectedSetting && (
        <SettingDetailsModal
          isOpen={!!selectedSetting}
          onClose={() => setSelectedSetting(null)}
          setting={selectedSetting}
        />
      )}
    </div>
  );
}