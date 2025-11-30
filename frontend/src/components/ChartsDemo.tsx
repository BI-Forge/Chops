import React, { useState } from 'react';
import { BackgroundPattern } from './BackgroundPattern';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';
import { Sidebar } from './Sidebar';
import { MetricsCards } from './MetricsCards';
import { SystemCharts } from './SystemCharts';
import { ServerInfo } from './ServerInfo';
import { NodeSelector } from './NodeSelector';
import { QueriesPage } from '../pages/QueriesPage';
import { Bell } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ChartsDemoProps {
  onLogout?: () => void;
}

export function ChartsDemo({ onLogout }: ChartsDemoProps = {}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { theme } = useTheme();

  // Get page title and description based on current page
  const getPageInfo = () => {
    switch (currentPage) {
      case 'dashboard':
        return { title: 'Dashboard', description: 'Real-time monitoring and system load analytics' };
      case 'queries':
        return { title: 'Queries', description: 'Monitor and manage ClickHouse queries' };
      case 'batches':
        return { title: 'Batches', description: 'Manage batch operations' };
      case 'users':
        return { title: 'Users', description: 'User management and access control' };
      case 'tables':
        return { title: 'Tables', description: 'Database tables overview' };
      case 'settings':
        return { title: 'Settings', description: 'System configuration' };
      default:
        return { title: 'Dashboard', description: 'Real-time monitoring and system load analytics' };
    }
  };

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Sidebar Menu */}
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onCollapse={setSidebarCollapsed} 
          onLogout={onLogout}
          activePage={currentPage}
          onPageChange={setCurrentPage}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className={`border-b ${
            theme === 'light' ? 'border-amber-500/30 bg-white/90' : 'border-yellow-500/20 bg-gray-900/40'
          } backdrop-blur-md h-[73px] flex items-center`}>
            <div className="px-6 w-full flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-xl`}>{getPageInfo().title}</h1>
                  <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-xs mt-0.5`}>{getPageInfo().description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <NodeSelector />
                <button className={`p-2 rounded-lg ${
                  theme === 'light'
                    ? 'bg-amber-50/50 border-amber-500/30 text-gray-700 hover:text-amber-700 hover:border-amber-500/50'
                    : 'bg-gray-800/60 border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40'
                } border transition-all`}>
                  <Bell className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div 
              key={currentPage}
              className="animate-page-enter"
            >
              {currentPage === 'queries' ? (
                <QueriesPage />
              ) : (
                <div className="p-8">
                  <div className="max-w-[1920px] mx-auto space-y-8">
                    {/* Metrics Cards */}
                    <MetricsCards />

                    {/* Charts Section */}
                    <div>
                      <h2 className="text-yellow-400 mb-6">Performance Charts</h2>
                      <SystemCharts />
                    </div>

                    {/* Server Information */}
                    <ServerInfo />
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
