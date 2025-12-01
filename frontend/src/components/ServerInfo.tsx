import React, { useState, useEffect } from 'react';
import { metricsAPI } from '../services/metricsAPI';
import type { ServerInfo as ServerInfoType } from '../types/metrics';
import { 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Network, 
  Clock, 
  CheckCircle, 
  Zap,
  Globe,
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

interface ServerInfoProps {
  selectedNode?: string;
}

export function ServerInfo({ selectedNode }: ServerInfoProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('general');
  const [serverInfo, setServerInfo] = useState<ServerInfoType | null>(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  
  // Load server info when node changes
  useEffect(() => {
    if (!selectedNode) {
      setServerInfo(null);
      return;
    }

    const loadServerInfo = async () => {
      try {
        setLoading(true);
        const info = await metricsAPI.getServerInfo(selectedNode);
        setServerInfo(info);
      } catch (error) {
        console.error('Failed to load server info:', error);
        setServerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadServerInfo();
  }, [selectedNode]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Format version integer to readable version string
  // ClickHouse version format: XX.XX.XX.XXX (e.g., 23802007 = 23.8.2.7)
  const formatVersion = (versionInteger: number): string => {
    if (!versionInteger || versionInteger === 0) return 'Unknown';
    const versionStr = versionInteger.toString().padStart(8, '0');
    const major = parseInt(versionStr.substring(0, 2));
    const minor = parseInt(versionStr.substring(2, 4));
    const patch = parseInt(versionStr.substring(4, 6));
    const build = parseInt(versionStr.substring(6, 8));
    return `${major}.${minor}.${patch}.${build}`;
  };

  // Format uptime in seconds to readable format
  const formatUptime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 && parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ') || '0s';
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
                <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>{selectedNode || 'No node selected'}</span>
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
              {loading ? (
                <div className="col-span-2 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Loading...</div>
                </div>
              ) : serverInfo ? (
                <>
                  <InfoCard
                    label="Version"
                    value={formatVersion(serverInfo.version_integer)}
                    icon={<Zap className="w-4 h-4" />}
                    status="success"
                  />
                  <InfoCard
                    label="Uptime"
                    value={formatUptime(serverInfo.uptime)}
                    icon={<Clock className="w-4 h-4" />}
                  />
                </>
              ) : (
                <div className="col-span-2 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                    {selectedNode ? 'No data available' : 'Select a node to view server information'}
                  </div>
                </div>
              )}
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
            } grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`}>
              {loading ? (
                <div className="col-span-4 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Loading...</div>
                </div>
              ) : serverInfo ? (
                <>
                  {serverInfo.total_memory > 0 && (
                    <InfoCard
                      label="Total Memory"
                      value={formatBytes(serverInfo.total_memory)}
                      icon={<Database className="w-4 h-4" />}
                    />
                  )}
                  {serverInfo.total_storage > 0 && (
                    <InfoCard
                      label="Total Storage"
                      value={formatBytes(serverInfo.total_storage)}
                      icon={<HardDrive className="w-4 h-4" />}
                    />
                  )}
                  {serverInfo.available_storage > 0 && (
                    <InfoCard
                      label="Available Storage"
                      value={formatBytes(serverInfo.available_storage)}
                      icon={<HardDrive className="w-4 h-4" />}
                      status="success"
                    />
                  )}
                </>
              ) : (
                <div className="col-span-4 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                    {selectedNode ? 'No data available' : 'Select a node to view resources'}
                  </div>
                </div>
              )}
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
            } grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2`}>
              {loading ? (
                <div className="col-span-4 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>Loading...</div>
                </div>
              ) : serverInfo ? (
                <>
                  {serverInfo.host && (
                    <InfoCard
                      label="Host"
                      value={serverInfo.host}
                      icon={<Globe className="w-4 h-4" />}
                      copyable
                    />
                  )}
                  {serverInfo.cluster && (
                    <InfoCard
                      label="Cluster"
                      value={serverInfo.cluster}
                      icon={<Server className="w-4 h-4" />}
                    />
                  )}
                </>
              ) : (
                <div className="col-span-4 flex items-center justify-center py-4">
                  <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                    {selectedNode ? 'No data available' : 'Select a node to view network information'}
                  </div>
                </div>
              )}
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
