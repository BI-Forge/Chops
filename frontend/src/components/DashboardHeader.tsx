import { Menu, Bell } from 'lucide-react';
import { NodeSelector } from './NodeSelector';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  onMenuOpen?: () => void;
  nodes?: string[];
  selectedNode?: string;
  onSelectNode?: (node: string) => void;
  loadingNodes?: boolean;
}

export function DashboardHeader({ 
  title = 'Dashboard', 
  description = 'Real-time monitoring and system load analytics', 
  onMenuOpen,
  nodes = [],
  selectedNode = '',
  onSelectNode,
  loadingNodes = false
}: DashboardHeaderProps) {
  const { theme } = useTheme();
  const { success, error, warning, info } = useAlert();
  
  const handleTestAlerts = () => {
    success('Query Executed Successfully', 'The query returned 1,247 rows in 0.32 seconds');
    setTimeout(() => {
      info('Database Update', 'Node connection refreshed');
    }, 500);
    setTimeout(() => {
      warning('High Memory Usage', 'Memory usage is at 87% - consider optimization');
    }, 1000);
    setTimeout(() => {
      error('Connection Failed', 'Unable to connect to node: production-node-04');
    }, 1500);
  };
  
  return (
    <header className={`border-b ${
      theme === 'light' ? 'border-amber-500/30 bg-white/90' : 'border-yellow-500/20 bg-gray-900/40'
    } backdrop-blur-md h-[73px] flex items-center`}>
      <div className="px-6 w-full flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuOpen}
          className={`md:hidden p-2 rounded-lg transition-colors ${
            theme === 'light'
              ? 'hover:bg-amber-100 text-gray-700'
              : 'hover:bg-gray-800 text-gray-400 hover:text-yellow-400'
          }`}
        >
          <Menu className="w-6 h-6" />
        </button>
        
        {/* Title and Description - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-4">
          <div>
            <h1 className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-xl`}>{title}</h1>
            <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-xs mt-0.5`}>{description}</p>
          </div>
        </div>
        
        {/* Right Section - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-4">
          {/* Test Alerts Button */}
          <button
            onClick={handleTestAlerts}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
              theme === 'light'
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-500/30'
                : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}
            title="Test Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm">Test Alerts</span>
          </button>
          
          <NodeSelector 
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={onSelectNode || (() => {})}
            loading={loadingNodes}
          />
        </div>
      </div>
    </header>
  );
}
