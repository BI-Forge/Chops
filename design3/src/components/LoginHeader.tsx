import React from 'react';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';
import { Database, Zap } from 'lucide-react';

export function LoginHeader() {
  return (
    <div className="text-center space-y-4 mb-8">
      <div className="flex justify-center mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 blur-2xl opacity-20 animate-pulse" />
        <div className="relative transform hover:scale-105 transition-transform duration-300">
          <ClickhouseOpsLogo size="large" variant="light" />
        </div>
      </div>
      
      <h1 className="text-yellow-400 relative inline-block">
        <span className="relative z-10">Welcome to Clickhouse OPS</span>
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 blur-lg -z-10" />
      </h1>
      
      <p className="text-gray-400 max-w-md mx-auto animate-fade-in">
        Advanced monitoring and operations platform for ClickHouse database clusters
      </p>

      <div className="flex items-center justify-center gap-6 pt-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm group hover:text-green-400 transition-colors cursor-default">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse group-hover:shadow-lg group-hover:shadow-green-500/50" />
          <span>3 Nodes Active</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm group hover:text-yellow-400 transition-colors cursor-default">
          <Database className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          <span>12 Databases</span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 text-sm group hover:text-amber-400 transition-colors cursor-default">
          <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>99.9% Uptime</span>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
