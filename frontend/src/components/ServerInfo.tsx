import React, { useState } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Network, 
  Clock, 
  CheckCircle, 
  Activity,
  Zap,
  Users,
  Globe,
  Shield,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface InfoCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'error';
  copyable?: boolean;
}

function InfoCard({ label, value, icon, status, copyable }: InfoCardProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const statusColors = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  };
  
  return (
    <div className={`p-4 rounded-lg border ${
      status ? statusColors[status] : (theme === 'light' ? 'border-gray-300/60 bg-white/60' : 'border-gray-700/50 bg-gray-800/20')
    } transition-all duration-300 ${
      theme === 'light' ? 'hover:border-amber-500/40' : 'hover:border-yellow-500/30'
    } hover:scale-[1.02] hover:shadow-lg`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className={theme === 'light' ? 'text-gray-700' : 'text-gray-500'}>{icon}</div>}
            <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>{label}</span>
          </div>
          <div className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} font-mono text-base`}>{value}</div>
        </div>
        {copyable && (
          <button
            onClick={handleCopy}
            className={`p-1 rounded ${
              theme === 'light' ? 'text-gray-700 hover:text-amber-600' : 'text-gray-500 hover:text-yellow-400'
            } transition-colors`}
            title="Copy to clipboard"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function ServerInfo() {
  const [expandedSection, setExpandedSection] = useState<string | null>('general');
  const { theme } = useTheme();
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  return (
    <div className={`${
      theme === 'light' ? 'bg-white/90 border-amber-500/30' : 'bg-gray-900/40 border-yellow-500/20'
    } backdrop-blur-md rounded-xl border overflow-hidden animate-fade-in`}>
      {/* Header */}
      <div className={`${
        theme === 'light' 
          ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-b border-amber-500/30' 
          : 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-b border-yellow-500/20'
      } p-6 animate-slide-down`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg p-3">
              <Server className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h2 className={theme === 'light' ? 'text-amber-700 mb-1' : 'text-yellow-400 mb-1'}>Database Server Information</h2>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400">Online</span>
                </div>
                <span className={theme === 'light' ? 'text-gray-500' : 'text-gray-500'}>•</span>
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Healthy</span>
                <span className={theme === 'light' ? 'text-gray-500' : 'text-gray-500'}>•</span>
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>production-node-01</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6 space-y-4">
        {/* General Information */}
        <div className={`border ${
          theme === 'light' ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-yellow-500/20 hover:border-yellow-500/40'
        } rounded-lg overflow-hidden transition-all duration-300`}>
          <button
            onClick={() => toggleSection('general')}
            className={`w-full flex items-center justify-between p-4 ${
              theme === 'light' ? 'bg-amber-50/50 hover:bg-amber-50' : 'bg-gray-800/20 hover:bg-gray-800/40'
            } transition-all duration-300 group`}
          >
            <div className="flex items-center gap-3">
              <Database className={`w-5 h-5 ${
                theme === 'light' ? 'text-amber-600 group-hover:text-amber-700' : 'text-yellow-400'
              } group-hover:scale-110 transition-transform duration-300`} />
              <span className={`${
                theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-200 group-hover:text-yellow-400'
              } transition-colors duration-300`}>General Information</span>
            </div>
            {expandedSection === 'general' ? (
              <ChevronUp className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            )}
          </button>
          {expandedSection === 'general' && (
            <div className={`p-4 ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-gray-800/10'
            } grid grid-cols-1 md:grid-cols-2 gap-4`}>
              <InfoCard
                label="Version"
                value="23.8.2.7"
                icon={<Zap className="w-4 h-4" />}
                status="success"
              />
              <InfoCard
                label="Uptime"
                value="15d 7h 32m"
                icon={<Clock className="w-4 h-4" />}
              />
            </div>
          )}
        </div>
        
        {/* System Resources */}
        <div className={`border ${
          theme === 'light' ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-yellow-500/20 hover:border-yellow-500/40'
        } rounded-lg overflow-hidden transition-all duration-300`}>
          <button
            onClick={() => toggleSection('resources')}
            className={`w-full flex items-center justify-between p-4 ${
              theme === 'light' ? 'bg-amber-50/50 hover:bg-amber-50' : 'bg-gray-800/20 hover:bg-gray-800/40'
            } transition-all duration-300 group`}
          >
            <div className="flex items-center gap-3">
              <Cpu className={`w-5 h-5 ${
                theme === 'light' ? 'text-amber-600 group-hover:text-amber-700' : 'text-yellow-400'
              } group-hover:scale-110 transition-transform duration-300`} />
              <span className={`${
                theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-200 group-hover:text-yellow-400'
              } transition-colors duration-300`}>System Resources</span>
            </div>
            {expandedSection === 'resources' ? (
              <ChevronUp className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            )}
          </button>
          {expandedSection === 'resources' && (
            <div className={`p-4 ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-gray-800/10'
            } grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
              <InfoCard
                label="CPU Cores"
                value="32 vCPU"
                icon={<Cpu className="w-4 h-4" />}
              />
              <InfoCard
                label="Total Memory"
                value="128 GB"
                icon={<Database className="w-4 h-4" />}
              />
              <InfoCard
                label="Total Storage"
                value="2 TB NVMe"
                icon={<HardDrive className="w-4 h-4" />}
              />
              <InfoCard
                label="Available Storage"
                value="500 GB"
                icon={<HardDrive className="w-4 h-4" />}
                status="success"
              />
            </div>
          )}
        </div>
        
        {/* Network & Connection */}
        <div className={`border ${
          theme === 'light' ? 'border-amber-500/30 hover:border-amber-500/50' : 'border-yellow-500/20 hover:border-yellow-500/40'
        } rounded-lg overflow-hidden transition-all duration-300`}>
          <button
            onClick={() => toggleSection('network')}
            className={`w-full flex items-center justify-between p-4 ${
              theme === 'light' ? 'bg-amber-50/50 hover:bg-amber-50' : 'bg-gray-800/20 hover:bg-gray-800/40'
            } transition-all duration-300 group`}
          >
            <div className="flex items-center gap-3">
              <Network className={`w-5 h-5 ${
                theme === 'light' ? 'text-amber-600 group-hover:text-amber-700' : 'text-yellow-400'
              } group-hover:scale-110 transition-transform duration-300`} />
              <span className={`${
                theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-200 group-hover:text-yellow-400'
              } transition-colors duration-300`}>Network & Connection</span>
            </div>
            {expandedSection === 'network' ? (
              <ChevronUp className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'}`} />
            )}
          </button>
          {expandedSection === 'network' && (
            <div className={`p-4 ${
              theme === 'light' ? 'bg-gray-50/50' : 'bg-gray-800/10'
            } grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`}>
              <InfoCard
                label="Host"
                value="ch-prod-01.local"
                icon={<Globe className="w-4 h-4" />}
                copyable
              />
              <InfoCard
                label="Port"
                value="9000"
                icon={<Network className="w-4 h-4" />}
                copyable
              />
              <InfoCard
                label="HTTP Port"
                value="8123"
                icon={<Network className="w-4 h-4" />}
                copyable
              />
              <InfoCard
                label="Cluster"
                value="production-cluster-01"
                icon={<Server className="w-4 h-4" />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add CSS animations
const styles = `
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes slide-down {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}

.animate-slide-down {
  animation: slide-down 0.6s ease-out forwards;
}
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('serverinfo-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'serverinfo-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
