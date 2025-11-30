import { Menu } from 'lucide-react';
import { NodeSelector } from './NodeSelector';
import { useTheme } from '../contexts/ThemeContext';
import type { NodeInfo } from '../types/metrics';

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  onMenuOpen?: () => void;
  nodes?: NodeInfo[];
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
