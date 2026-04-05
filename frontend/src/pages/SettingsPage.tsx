import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Search, Filter, Settings as SettingsIcon } from 'lucide-react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { SettingDetailsModal } from '../components/SettingDetailsModal';
import { ListPagination } from '../components/ListPagination';
import { SettingsTable, type Setting } from '../components/SettingsTable';
import { CustomSelect } from '../components/CustomSelect';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';
import { metricsAPI } from '../services/metricsAPI';
import { settingsAPI, type DBSettingItem, type DBSettingDetailItem } from '../services/settingsAPI';
import type { NodeInfo } from '../types/metrics';

const TIER_OPTIONS = [
  'All Tiers',
  'Production',
  'Beta',
  'Experimental',
  'Milestone',
  'Obsolete',
];

function tierLabelToApi(label: string): string {
  if (label === 'All Tiers') return '';
  return label.toLowerCase();
}

function formatTierDisplay(tier: string): string {
  if (!tier) return '—';
  const t = tier.toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function mapDbRowToSetting(item: DBSettingItem): Setting {
  const tier = item.tier || '';
  const isObsolete = tier.toLowerCase() === 'obsolete' ? 1 : 0;
  return {
    name: item.name,
    value: item.value,
    changed: item.changed ? 1 : 0,
    description: item.description || '',
    min: null,
    max: null,
    disallowed_values: [],
    readonly: 0,
    type: item.type,
    default: '',
    alias_for: '',
    is_obsolete: isObsolete,
    tier: formatTierDisplay(tier),
    server: item.server,
  };
}

function mergeDetail(row: Setting, d: DBSettingDetailItem): Setting {
  const tier = d.tier || '';
  return {
    ...row,
    description: d.description || '',
    value: d.value,
    type: d.type,
    changed: d.changed ? 1 : 0,
    tier: formatTierDisplay(tier),
    server: d.server,
    min: d.min || null,
    max: d.max || null,
    readonly: d.readonly ? 1 : 0,
    is_obsolete: tier.toLowerCase() === 'obsolete' ? 1 : 0,
  };
}

function sortFieldToApi(
  field: 'name' | 'changed' | 'server' | null
): 'name' | 'changed' | 'server' | undefined {
  if (!field) return undefined;
  return field;
}

export function SettingsPage() {
  const { theme } = useTheme();
  const { error: showError } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [selectedTier, setSelectedTier] = useState('All Tiers');
  const [appliedTier, setAppliedTier] = useState('All Tiers');
  const [selectedType, setSelectedType] = useState('All Types');
  const [appliedType, setAppliedType] = useState('All Types');
  const [selectedServer, setSelectedServer] = useState('All');
  const [appliedServer, setAppliedServer] = useState('All');
  const [sortField, setSortField] = useState<'name' | 'changed' | 'server' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [knownTypes, setKnownTypes] = useState<string[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoadingNodes(true);
        const available = await metricsAPI.getAvailableNodes();
        setNodes(available);
        const saved = sessionStorage.getItem('selectedNode');
        const savedOk = available.find((n) => n.name === saved);
        if (savedOk) setSelectedNode(savedOk.name);
        else if (available.length > 0) {
          setSelectedNode(available[0].name);
          sessionStorage.setItem('selectedNode', available[0].name);
        }
      } catch {
        showError('Failed to load nodes', 'Unable to fetch available nodes', 5000);
      } finally {
        setLoadingNodes(false);
      }
    };
    loadNodes();
  }, [showError]);

  const fetchList = useCallback(async () => {
    if (!selectedNode) {
      setSettings([]);
      setListTotal(0);
      return;
    }
    setListLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const tierQ = tierLabelToApi(appliedTier);
      const typeQ = appliedType === 'All Types' ? '' : appliedType;
      let serverParam: boolean | undefined;
      if (appliedServer === 'Yes') serverParam = true;
      else if (appliedServer === 'No') serverParam = false;
      const res = await settingsAPI.getAll({
        node: selectedNode,
        limit: itemsPerPage,
        offset,
        sort: sortFieldToApi(sortField),
        order: sortDirection,
        tier: tierQ || undefined,
        type: typeQ || undefined,
        server: serverParam,
        q: appliedSearch.trim() || undefined,
      });
      setSettings((res.settings || []).map(mapDbRowToSetting));
      setListTotal(res.total ?? 0);
      setKnownTypes((prev) => {
        const next = new Set(prev);
        for (const s of res.settings || []) {
          if (s.type) next.add(s.type);
        }
        return Array.from(next).sort();
      });
    } catch {
      showError('Failed to load settings', 'Could not fetch settings from ClickHouse', 5000);
      setSettings([]);
      setListTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [
    selectedNode,
    currentPage,
    itemsPerPage,
    appliedSearch,
    appliedTier,
    appliedType,
    appliedServer,
    sortField,
    sortDirection,
    showError,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(listTotal / itemsPerPage) || 1);
    if (currentPage > tp) setCurrentPage(tp);
  }, [listTotal, itemsPerPage, currentPage]);

  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedNode', node);
    setCurrentPage(1);
    setKnownTypes([]);
  };

  const handleApplyFilters = () => {
    setIsApplyingFilters(true);
    setAppliedSearch(searchTerm.trim());
    setAppliedTier(selectedTier);
    setAppliedType(selectedType);
    setAppliedServer(selectedServer);
    setCurrentPage(1);
    setTimeout(() => setIsApplyingFilters(false), 400);
  };

  const onFiltersFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedNode || isApplyingFilters) return;
    handleApplyFilters();
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
    setCurrentPage(1);
  };

  const handleViewDetails = async (setting: Setting) => {
    if (!selectedNode) return;
    setSelectedSetting(setting);
    setDetailLoading(true);
    try {
      const d = await settingsAPI.getOne(selectedNode, setting.name);
      setSelectedSetting(mergeDetail(setting, d));
    } catch {
      setSelectedSetting(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const typeOptions = ['All Types', ...knownTypes];
  const totalPages = Math.max(1, Math.ceil(listTotal / itemsPerPage) || 1);
  const startIndex = listTotal === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + settings.length;

  return (
    <div className="h-screen relative overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 flex h-full">
        <div className="hidden md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
          />
        </div>

        <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Settings"
            description="Manage ClickHouse server settings and configurations"
            onMenuOpen={() => setMobileMenuOpen(true)}
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
            loadingNodes={loadingNodes}
          />

          <div
            className={`flex-1 overflow-y-auto custom-scrollbar ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-transparent'
            }`}
          >
            <div className="max-w-[1920px] mx-auto p-6 space-y-6">
              <div
                className={`${
                  theme === 'light'
                    ? 'bg-white/90 border-amber-500/30'
                    : 'bg-gray-900/60 border-yellow-500/20'
                } backdrop-blur-md rounded-xl border p-6`}
              >
                <form onSubmit={onFiltersFormSubmit}>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Filter
                        className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`}
                      />
                      <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>Filters</h2>
                    </div>

                    <button
                      type="submit"
                      disabled={isApplyingFilters || !selectedNode}
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
                  <div className="lg:col-span-2">
                    <label
                      className={`block text-sm mb-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Search Settings
                    </label>
                    <div className="relative">
                      <Search
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                          theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      />
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

                  <div>
                    <label
                      className={`block text-sm mb-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Tier
                    </label>
                    <CustomSelect
                      options={TIER_OPTIONS}
                      value={selectedTier}
                      onChange={setSelectedTier}
                      placeholder="Select tier"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm mb-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Type
                    </label>
                    <CustomSelect
                      options={typeOptions}
                      value={selectedType}
                      onChange={setSelectedType}
                      placeholder="Select type"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm mb-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Server
                    </label>
                    <CustomSelect
                      options={['All', 'Yes', 'No']}
                      value={selectedServer}
                      onChange={setSelectedServer}
                      placeholder="Select server"
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm mb-2 ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      Show
                    </label>
                    <CustomSelect
                      value={itemsPerPage.toString()}
                      onChange={(value) => handleItemsPerPageChange(Number(value))}
                      options={['5', '10', '25', '50']}
                    />
                  </div>
                </div>
                </form>
              </div>

              <div
                className={`${
                  theme === 'light'
                    ? 'bg-white/90 border-amber-500/30'
                    : 'bg-gray-900/60 border-yellow-500/20'
                } backdrop-blur-md rounded-xl border p-6`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <SettingsIcon
                    className={`w-5 h-5 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`}
                  />
                  <h2 className={theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}>
                    Settings List
                  </h2>
                  <span
                    className={`px-2 py-1 rounded-lg ${
                      theme === 'light' ? 'bg-amber-500/20 text-amber-700' : 'bg-yellow-500/20 text-yellow-400'
                    } text-xs`}
                  >
                    {listTotal}
                  </span>
                </div>

                {!selectedNode && (
                  <p className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Select a ClickHouse node to load settings.
                  </p>
                )}

                {selectedNode && listLoading && (
                  <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    Loading settings…
                  </p>
                )}

                {selectedNode && !listLoading && settings.length === 0 && (
                  <p className={`text-sm mb-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
                    No settings match the current filters.
                  </p>
                )}

                {selectedNode && settings.length > 0 && (
                  <SettingsTable
                    settings={settings}
                    onViewDetails={handleViewDetails}
                    onSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                  />
                )}

                <ListPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={listTotal}
                  rangeStart={startIndex + 1}
                  rangeEnd={endIndex}
                  itemLabel="settings"
                  onPageChange={handlePageChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSetting && (
        <SettingDetailsModal
          isOpen={!!selectedSetting}
          onClose={() => setSelectedSetting(null)}
          setting={selectedSetting}
          detailLoading={detailLoading}
        />
      )}
    </div>
  );
}
