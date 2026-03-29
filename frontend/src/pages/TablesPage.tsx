import { useState, useEffect, useCallback } from 'react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { TableDetailsModal } from '../components/tables/TableDetailsModal';
import { ConfirmDeleteTableModal } from '../components/tables/ConfirmDeleteTableModal';
import { CopyTableModal } from '../components/tables/CopyTableModal';
import { TablesStatsCards } from '../components/tables/TablesStatsCards';
import { TablesFilter } from '../components/tables/TablesFilter';
import { TablesList, type Table, type TableListRow, type TablesSortField } from '../components/tables/TablesList';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';
import { useSidebar } from '../contexts/SidebarContext';
import { metricsAPI } from '../services/metricsAPI';
import { tablesAPI } from '../services/tablesAPI';
import { usersAPI } from '../services/usersAPI';
import { mapTableDetailsToTable } from '../utils/mapTableDetails';
import type { NodeInfo } from '../types/metrics';

function sortFieldToApi(f: TablesSortField | null): string | undefined {
  if (!f) return undefined;
  const m: Record<TablesSortField, string> = {
    name: 'name',
    engine: 'engine',
    total_rows: 'rows',
    total_bytes: 'bytes',
    parts: 'parts',
    active_parts: 'active',
  };
  return m[f];
}

export function TablesPage() {
  const { theme } = useTheme();
  const { success, error: showError } = useAlert();
  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<TableListRow | null>(null);
  const [tableToCopy, setTableToCopy] = useState<TableListRow | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState('All Databases');
  const [appliedSchema, setAppliedSchema] = useState('');
  const [selectedEngine, setSelectedEngine] = useState('All Engines');
  const [appliedEngine, setAppliedEngine] = useState('');
  const [listPage, setListPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [engines, setEngines] = useState<string[]>([]);
  const [tables, setTables] = useState<TableListRow[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [stats, setStats] = useState<{ tables: number; rows: number; size: string; parts: number } | null>(null);
  const [sortField, setSortField] = useState<TablesSortField | null>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  useEffect(() => {
    if (!selectedNode) {
      setSchemas([]);
      return;
    }
    let cancelled = false;
    usersAPI
      .getSchemasList(selectedNode)
      .then((s) => {
        if (!cancelled) setSchemas(s);
      })
      .catch(() => {
        if (!cancelled) setSchemas([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNode]);

  const fetchStats = useCallback(async () => {
    if (!selectedNode) {
      setStats(null);
      return;
    }
    try {
      const s = await tablesAPI.getTablesStats(selectedNode);
      setStats({
        tables: Number(s.total_tables),
        rows: Number(s.total_rows),
        size: s.total_size,
        parts: Number(s.total_parts),
      });
    } catch {
      setStats(null);
    }
  }, [selectedNode]);

  const fetchList = useCallback(async () => {
    if (!selectedNode) {
      setTables([]);
      setListTotal(0);
      return;
    }
    setListLoading(true);
    try {
      const offset = (listPage - 1) * itemsPerPage;
      const res = await tablesAPI.getTablesList({
        node: selectedNode,
        name: appliedSearch || undefined,
        schema: appliedSchema || undefined,
        engine: appliedEngine || undefined,
        sort: sortFieldToApi(sortField),
        order: sortDirection,
        limit: itemsPerPage,
        offset,
      });
      setTables(res.tables || []);
      setListTotal(res.total ?? 0);
      setEngines((prev) => {
        const next = new Set(prev);
        for (const t of res.tables || []) {
          if (t.engine) next.add(t.engine);
        }
        return Array.from(next).sort();
      });
    } catch {
      showError('Failed to load tables', 'Could not fetch table list from ClickHouse', 5000);
      setTables([]);
      setListTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [
    selectedNode,
    appliedSearch,
    appliedSchema,
    appliedEngine,
    listPage,
    itemsPerPage,
    sortField,
    sortDirection,
    showError,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(listTotal / itemsPerPage) || 1);
    if (listPage > tp) setListPage(tp);
  }, [listTotal, itemsPerPage, listPage]);

  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedNode', node);
    setListPage(1);
    setEngines([]);
  };

  const handleApplyFilters = () => {
    setIsApplyingFilters(true);
    setAppliedSearch(searchTerm.trim());
    setAppliedSchema(selectedDatabase === 'All Databases' ? '' : selectedDatabase);
    setAppliedEngine(selectedEngine === 'All Engines' ? '' : selectedEngine);
    setListPage(1);
    setTimeout(() => setIsApplyingFilters(false), 400);
  };

  const openTableDetails = async (row: TableListRow) => {
    if (!selectedNode) return;
    setDetailsLoading(true);
    setSelectedTable(null);
    try {
      const d = await tablesAPI.getTableDetails(row.uuid, selectedNode);
      setSelectedTable(mapTableDetailsToTable(d));
    } catch {
      showError('Details unavailable', 'Failed to load table metadata', 5000);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete || !selectedNode) return;
    try {
      await tablesAPI.deleteTable(tableToDelete.uuid, selectedNode);
      success(`Table ${tableToDelete.database}.${tableToDelete.name} dropped`);
      setTableToDelete(null);
      setSelectedTable(null);
      await fetchStats();
      await fetchList();
    } catch {
      /* api interceptor shows error */
    }
  };

  const handleCopyTable = async (newName: string) => {
    if (!tableToCopy || !selectedNode) return;
    try {
      await tablesAPI.copyTable(tableToCopy.uuid, newName.trim(), selectedNode);
      success(`Table copied to ${newName.trim()}`);
      setTableToCopy(null);
      await fetchStats();
      await fetchList();
    } catch {
      /* api interceptor */
    }
  };

  const handleSortChange = (field: TablesSortField, direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <div className="h-screen relative overflow-hidden">
      <BackgroundPattern />

      <div className="relative z-10 flex h-full">
        <div className="hidden md:block">
          <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
        </div>

        <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            title="Tables"
            description="Browse ClickHouse tables, sizes, and engines"
            onMenuOpen={() => setMobileMenuOpen(true)}
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
            loadingNodes={loadingNodes}
          />

          <main
            className={`flex-1 overflow-y-auto custom-scrollbar ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-transparent'
            }`}
          >
            <div className="max-w-[1920px] mx-auto p-6 space-y-6">
              <TablesStatsCards
                totalTables={stats?.tables ?? 0}
                totalRows={stats?.rows ?? 0}
                totalSizeLabel={stats?.size ?? '—'}
                totalParts={stats?.parts ?? 0}
              />

              <TablesFilter
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                  setSearchTerm(value);
                }}
                selectedDatabase={selectedDatabase}
                onDatabaseChange={(value) => {
                  setSelectedDatabase(value);
                }}
                selectedEngine={selectedEngine}
                onEngineChange={(value) => {
                  setSelectedEngine(value);
                }}
                databases={schemas}
                engines={engines}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setListPage(1);
                }}
                isApplyingFilters={isApplyingFilters}
                onApplyFilters={handleApplyFilters}
              />

              <TablesList
                tables={tables}
                onTableClick={openTableDetails}
                onDeleteClick={setTableToDelete}
                onCopyClick={setTableToCopy}
                itemsPerPage={itemsPerPage}
                total={listTotal}
                page={listPage}
                onPageChange={setListPage}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                loading={listLoading}
              />
            </div>
          </main>
        </div>
      </div>

      {detailsLoading && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <p className="text-white text-sm">Loading details…</p>
        </div>
      )}

      <TableDetailsModal
        isOpen={selectedTable !== null}
        onClose={() => setSelectedTable(null)}
        table={selectedTable}
        onDelete={(t) => {
          setTableToDelete({
            uuid: t.uuid,
            database: t.database,
            name: t.name,
            engine: t.engine,
            rows: t.total_rows,
            parts: t.parts,
            active_parts: t.active_parts,
            bytes: '',
            size_bytes: t.total_bytes,
          });
        }}
        onCopy={(t) => {
          setTableToCopy({
            uuid: t.uuid,
            database: t.database,
            name: t.name,
            engine: t.engine,
            rows: t.total_rows,
            parts: t.parts,
            active_parts: t.active_parts,
            bytes: '',
            size_bytes: t.total_bytes,
          });
        }}
      />

      <ConfirmDeleteTableModal
        isOpen={tableToDelete !== null}
        onClose={() => setTableToDelete(null)}
        table={tableToDelete}
        onConfirm={handleDeleteTable}
      />

      <CopyTableModal
        isOpen={tableToCopy !== null}
        onClose={() => setTableToCopy(null)}
        table={tableToCopy}
        onConfirm={handleCopyTable}
      />
    </div>
  );
}
