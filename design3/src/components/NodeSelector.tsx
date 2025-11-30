import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Server, ChevronDown, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Node {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning';
  cluster: string;
  location: string;
  load: number;
  uptime: string;
}

const nodes: Node[] = [
  {
    id: '1',
    name: 'production-node-01',
    status: 'online',
    cluster: 'production-cluster-01',
    location: 'US-East',
    load: 45,
    uptime: '15d 7h 32m'
  },
  {
    id: '2',
    name: 'production-node-02',
    status: 'online',
    cluster: 'production-cluster-01',
    location: 'US-West',
    load: 62,
    uptime: '15d 7h 28m'
  },
  {
    id: '3',
    name: 'production-node-03',
    status: 'warning',
    cluster: 'production-cluster-01',
    location: 'EU-Central',
    load: 87,
    uptime: '12d 3h 15m'
  },
  {
    id: '4',
    name: 'staging-node-01',
    status: 'online',
    cluster: 'staging-cluster-01',
    location: 'US-East',
    load: 23,
    uptime: '8d 12h 45m'
  },
  {
    id: '5',
    name: 'development-node-01',
    status: 'online',
    cluster: 'development-cluster-01',
    location: 'US-East',
    load: 15,
    uptime: '5d 18h 22m'
  },
  {
    id: '6',
    name: 'production-node-04',
    status: 'offline',
    cluster: 'production-cluster-02',
    location: 'Asia-Pacific',
    load: 0,
    uptime: 'Offline'
  },
];

interface NodeSelectorProps {
  compact?: boolean;
  asList?: boolean;
}

export function NodeSelector({ compact = false, asList = false }: NodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node>(nodes[0]);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as HTMLElement) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen && buttonRef.current) {
        updatePosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
  };

  const handleNodeSelect = (node: Node) => {
    setSelectedNode(node);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const getStatusIcon = (status: Node['status']) => {
    switch (status) {
      case 'online':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      case 'offline':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
  };

  const getStatusColor = (status: Node['status']) => {
    switch (status) {
      case 'online':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'offline':
        return 'text-red-400';
    }
  };

  const getLoadColor = (load: number) => {
    if (load >= 80) return 'text-red-400';
    if (load >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Render as list without button
  if (asList) {
    return (
      <div className="w-full">
        <div className={`${
          theme === 'light' ? 'text-amber-700 border-b border-amber-500/20' : 'text-yellow-400/90 border-b border-yellow-500/20'
        } text-xs font-medium px-3 py-2`}>
          Database Nodes
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => setSelectedNode(node)}
              className={`w-full px-3 py-2.5 flex items-center gap-3 ${
                theme === 'light' ? 'hover:bg-amber-50/50 border-b border-gray-200' : 'hover:bg-gray-800/40 border-b border-gray-800/30'
              } transition-all duration-200 last:border-b-0 ${
                selectedNode.id === node.id 
                  ? (theme === 'light' ? 'bg-amber-500/10 border-l-2 border-l-amber-500/50' : 'bg-yellow-500/10 border-l-2 border-l-yellow-500/50')
                  : ''
              }`}
            >
              {/* Status Icon */}
              <div>
                {getStatusIcon(node.status)}
              </div>

              {/* Node Info */}
              <div className="flex-1 text-left">
                <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm font-mono`}>{node.name}</span>
              </div>

              {selectedNode.id === node.id && (
                <CheckCircle className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`flex items-center ${compact ? 'gap-2 px-3 py-2.5' : 'gap-3 px-4 py-2.5'} ${
          theme === 'light' ? 'bg-white/90 border-amber-500/30 hover:border-amber-500/50' : 'bg-gray-900/40 border-yellow-500/20 hover:border-yellow-500/40'
        } backdrop-blur-md border rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group w-full`}
      >
        {!compact && (
          <div className={`bg-gradient-to-br ${
            theme === 'light' ? 'from-amber-500/40 to-orange-500/40 border-amber-500/30' : 'from-amber-500/30 to-yellow-500/30 border-yellow-500/20'
          } rounded-md p-1.5 border group-hover:scale-110 transition-transform duration-300`}>
            <Server className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
          </div>
        )}
        
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-2 w-full">
            {getStatusIcon(selectedNode.status)}
            <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm truncate flex-1`}>{selectedNode.name}</span>
          </div>
          {!compact && (
            <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs truncate w-full`}>{selectedNode.cluster}</span>
          )}
        </div>
        
        <ChevronDown className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Portal */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed ${compact ? 'w-full left-0 right-0' : 'w-[420px]'} ${
            theme === 'light' ? 'bg-white/95 border-amber-500/30' : 'bg-gray-900/90 border-yellow-500/20'
          } backdrop-blur-xl border rounded-lg shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-2 duration-200`}
          style={compact ? {
            top: `${position.top}px`,
            maxWidth: '100vw',
            margin: '0 1rem'
          } : {
            top: `${position.top}px`,
            right: `${position.right}px`
          }}
        >
          {/* Header - Only for non-compact */}
          {!compact && (
            <div className={`${
              theme === 'light' ? 'bg-amber-50/50 border-b border-amber-500/20' : 'bg-gray-800/30 border-b border-yellow-500/10'
            } px-4 py-3`}>
              <div className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400/90'} text-sm`}>Select Database Node</div>
              <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs mt-0.5`}>{nodes.length} nodes available</div>
            </div>
          )}

          {/* Nodes List */}
          <div className={`${compact ? 'max-h-[250px]' : 'max-h-[400px]'} overflow-y-auto custom-scrollbar`}>
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => handleNodeSelect(node)}
                className={`w-full ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} flex items-start gap-3 ${
                  theme === 'light' ? 'hover:bg-amber-50/50 border-b border-gray-200' : 'hover:bg-gray-800/40 border-b border-gray-800/30'
                } hover:translate-x-1 transition-all duration-200 last:border-b-0 ${
                  selectedNode.id === node.id 
                    ? (theme === 'light' ? 'bg-amber-500/10 border-l-2 border-l-amber-500/50' : 'bg-yellow-500/10 border-l-2 border-l-yellow-500/50')
                    : ''
                }`}
              >
                {/* Status Icon */}
                <div className="mt-1">
                  {getStatusIcon(node.status)}
                </div>

                {/* Node Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm font-mono`}>{node.name}</span>
                    {selectedNode.id === node.id && (
                      <CheckCircle className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                    )}
                  </div>
                  
                  {!compact && (
                    <>
                      <div className={`flex items-center gap-3 text-xs ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`}>
                        <span>{node.cluster}</span>
                        <span>•</span>
                        <span>{node.location}</span>
                      </div>

                      {/* Offline Status */}
                      {node.status === 'offline' && (
                        <div className="flex items-center gap-1.5 text-xs mt-2">
                          <AlertCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">Node is offline</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer - Only for non-compact */}
          {!compact && (
            <div className={`${
              theme === 'light' ? 'bg-gray-50/50 border-t border-amber-500/20' : 'bg-gray-800/20 border-t border-yellow-500/10'
            } px-4 py-2.5`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Online: {nodes.filter(n => n.status === 'online').length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-yellow-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Warning: {nodes.filter(n => n.status === 'warning').length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Offline: {nodes.filter(n => n.status === 'offline').length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
