import React from 'react';
import { BackgroundPattern } from './BackgroundPattern';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';
import { MetricsCards } from './MetricsCards';
import { Bell, Settings, User } from 'lucide-react';

export function DashboardDemo() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-yellow-500/20 bg-gray-900/40 backdrop-blur-md">
          <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
            <ClickhouseOpsLogo size="small" variant="light" />
            
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-lg bg-gray-800/60 border border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-gray-800/60 border border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-all">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-lg bg-gray-800/60 border border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-all">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-[1920px] mx-auto px-6 py-8">
          <div className="space-y-8">
            {/* Page title */}
            <div>
              <h1 className="text-yellow-400 mb-2">System Overview</h1>
              <p className="text-gray-400">Мониторинг в реальном времени</p>
            </div>

            {/* Metrics Cards */}
            <MetricsCards />

            {/* Additional info panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
                <h2 className="text-yellow-400 mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {[
                    { time: '2 min ago', text: 'Query execution completed', status: 'success' },
                    { time: '5 min ago', text: 'New connection established', status: 'info' },
                    { time: '8 min ago', text: 'CPU spike detected', status: 'warning' },
                    { time: '12 min ago', text: 'Backup completed', status: 'success' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.status === 'success' ? 'bg-green-500' :
                        activity.status === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <div className="text-gray-300 text-sm">{activity.text}</div>
                        <div className="text-gray-500 text-xs">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
                <h2 className="text-yellow-400 mb-4">System Information</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Uptime', value: '15 days 7h 32m' },
                    { label: 'Version', value: '23.8.2.7' },
                    { label: 'Cluster', value: 'production-cluster-01' },
                    { label: 'Nodes', value: '3 active / 3 total' },
                  ].map((info, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-800/40 rounded-lg border border-gray-700/50">
                      <span className="text-gray-400">{info.label}</span>
                      <span className="text-gray-200 font-mono text-sm">{info.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
