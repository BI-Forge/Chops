import { MetricsCards } from './MetricsCards';
import { SystemCharts } from './SystemCharts';
import { ServerInfo } from './ServerInfo';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardContentProps {
  selectedNode?: string;
}

export function DashboardContent({ selectedNode = '' }: DashboardContentProps) {
  const { theme } = useTheme();
  
  return (
    <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-[1920px] mx-auto space-y-6 sm:space-y-8 animate-page-enter">
        {/* Metrics Cards */}
        <MetricsCards selectedNode={selectedNode} />

        {/* Charts Section */}
        <div>
          <h2 className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4 sm:mb-6 text-lg sm:text-xl`}>Performance Charts</h2>
          <SystemCharts selectedNode={selectedNode} />
        </div>

        {/* Server Information */}
        <ServerInfo selectedNode={selectedNode} />
      </div>
    </main>
  );
}
