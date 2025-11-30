import React from 'react';
import { BackgroundPattern } from './BackgroundPattern';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';

export function ExamplePage1() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Фоновый паттерн */}
      <BackgroundPattern />
      
      {/* Контент страницы */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-yellow-500/20 bg-gray-900/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <ClickhouseOpsLogo size="small" variant="light" />
            <nav className="flex gap-6">
              <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Dashboard</a>
              <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Queries</a>
              <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Monitoring</a>
              <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">Settings</a>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-6 py-12">
          <h1 className="text-yellow-400 mb-8">Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Stats cards */}
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
              <div className="text-gray-400 mb-2">Active Queries</div>
              <div className="text-yellow-400">1,234</div>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
              <div className="text-gray-400 mb-2">CPU Usage</div>
              <div className="text-yellow-400">45%</div>
            </div>
            <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
              <div className="text-gray-400 mb-2">Memory Usage</div>
              <div className="text-yellow-400">62%</div>
            </div>
          </div>

          {/* Main panel */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-8 border border-yellow-500/20">
            <h2 className="text-yellow-400 mb-4">System Overview</h2>
            <p className="text-gray-300">
              Пример страницы с фоновым паттерном. Все элементы хорошо читаемы на темном фоне.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
