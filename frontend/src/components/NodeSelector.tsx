import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Server, ChevronDown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { NodeInfo } from '../types/metrics';

interface NodeSelectorProps {
  compact?: boolean;
  asList?: boolean;
  nodes?: NodeInfo[];
  selectedNode?: string;
  onSelectNode?: (node: string) => void;
  loading?: boolean;
}

export function NodeSelector({ 
  compact = false, 
  asList = false,
  nodes = [],
  selectedNode = '',
  onSelectNode,
  loading = false
}: NodeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleNodeSelect = (nodeName: string) => {
    if (onSelectNode) {
      onSelectNode(nodeName);
    }
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // For now, we'll assume all nodes are online
  // In the future, this could be enhanced with status from API
  type NodeStatus = 'online' | 'offline' | 'warning';
  
  const getNodeStatus = (node: NodeInfo): NodeStatus => {
    // For now, all nodes are considered online
    // In the future, this could check node status from API
    return 'online';
  };

  const getStatusIcon = (status: NodeStatus = 'online') => {
    switch (status) {
      case 'online':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'warning':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      case 'offline':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    }
  };

  // Render as list without button
  if (asList) {
    if (loading) {
      return (
        <div className="w-full px-3 py-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
        </div>
      );
    }

    return (
      <div className="w-full">
        <div className={`${
          theme === 'light' ? 'text-amber-700 border-b border-amber-500/20' : 'text-yellow-400/90 border-b border-yellow-500/20'
        } text-xs font-medium px-3 py-2`}>
          Database Nodes
        </div>
        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {nodes.length === 0 ? (
            <div className={`px-3 py-4 text-center ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} text-sm`}>
              No nodes available
            </div>
          ) : (
            nodes.map((node) => (
              <button
                key={node.name}
                onClick={() => handleNodeSelect(node.name)}
                className={`w-full px-3 py-2.5 flex items-center gap-3 ${
                  theme === 'light' ? 'hover:bg-amber-50/50 border-b border-gray-200' : 'hover:bg-gray-800/40 border-b border-gray-800/30'
                } transition-all duration-200 last:border-b-0 ${
                  selectedNode === node.name 
                    ? (theme === 'light' ? 'bg-amber-500/10 border-l-2 border-l-amber-500/50' : 'bg-yellow-500/10 border-l-2 border-l-yellow-500/50')
                    : ''
                }`}
              >
                {/* Status Icon */}
                <div>
                  {getStatusIcon(getNodeStatus(node))}
                </div>

                {/* Node Info */}
                <div className="flex-1 text-left">
                  <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm font-mono`}>{node.name}</span>
                </div>

                {selectedNode === node.name && (
                  <CheckCircle className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                )}
              </button>
            ))
          )}
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
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
              <>
                {selectedNode ? getStatusIcon(getNodeStatus(nodes.find(n => n.name === selectedNode) || { name: selectedNode } as NodeInfo)) : getStatusIcon()}
                <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm truncate flex-1`}>
                  {selectedNode ? nodes.find(n => n.name === selectedNode)?.name || selectedNode : 'Select node...'}
                </span>
              </>
            )}
          </div>
          {!compact && selectedNode && (() => {
            const selectedNodeInfo = nodes.find(n => n.name === selectedNode);
            return selectedNodeInfo?.host ? (
              <span className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs truncate w-full font-mono`}>
                {selectedNodeInfo.host}
              </span>
            ) : null;
          })()}
        </div>
        
        <ChevronDown className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Portal */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className={`fixed ${compact ? 'w-full left-0 right-0' : 'w-[420px]'} overflow-x-hidden ${
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
              <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs mt-0.5`}>
                {loading ? 'Loading nodes...' : `${nodes.length} ${nodes.length === 1 ? 'node' : 'nodes'} available`}
              </div>
            </div>
          )}

          {/* Nodes List */}
          <div className={`${compact ? 'max-h-[250px]' : 'max-h-[400px]'} overflow-y-auto overflow-x-hidden custom-scrollbar`}>
            {loading ? (
              <div className="px-4 py-8 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              </div>
            ) : nodes.length === 0 ? (
              <div className={`px-4 py-8 text-center ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} text-sm`}>
                No nodes available
              </div>
            ) : (
              nodes.map((node) => (
                <button
                  key={node.name}
                  onClick={() => handleNodeSelect(node.name)}
                  className={`w-full ${compact ? 'px-3 py-2.5' : 'px-4 py-3'} flex items-start gap-3 ${
                    theme === 'light' ? 'hover:bg-amber-50/50 border-b border-gray-200' : 'hover:bg-gray-800/40 border-b border-gray-800/30'
                  } transition-all duration-200 last:border-b-0 ${
                    selectedNode === node.name 
                      ? (theme === 'light' ? 'bg-amber-500/10 border-l-2 border-l-amber-500/50' : 'bg-yellow-500/10 border-l-2 border-l-yellow-500/50')
                      : ''
                  }`}
                >
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(getNodeStatus(node))}
                  </div>

                  {/* Node Info */}
                  <div className="flex-1 text-left min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} text-sm font-mono truncate`}>{node.name}</span>
                      {selectedNode === node.name && (
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
                      )}
                    </div>

                    {!compact && (
                      <>
                        <div className={`flex items-center gap-3 text-xs truncate ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'}`}>
                          {node.cluster_name && (
                            <>
                              <span className="truncate">{node.cluster_name}</span>
                              {node.host && <span className="flex-shrink-0">•</span>}
                            </>
                          )}
                          {node.host && (
                            <span className="truncate">{node.host}</span>
                          )}
                        </div>

                        {/* Offline Status */}
                        {getNodeStatus(node) === 'offline' && (
                          <div className="flex items-center gap-1.5 text-xs mt-2">
                            <AlertCircle className="w-3 h-3 text-red-400" />
                            <span className="text-red-400">Node is offline</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer - Only for non-compact */}
          {!compact && !loading && nodes.length > 0 && (
            <div className={`${
              theme === 'light' ? 'bg-gray-50/50 border-t border-amber-500/20' : 'bg-gray-800/20 border-t border-yellow-500/10'
            } px-4 py-2.5`}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Online: {nodes.filter(n => getNodeStatus(n) === 'online').length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-yellow-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Warning: {nodes.filter(n => getNodeStatus(n) === 'warning').length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500/70 rounded-full" />
                    <span className={theme === 'light' ? 'text-gray-700' : 'text-gray-400'}>Offline: {nodes.filter(n => getNodeStatus(n) === 'offline').length}</span>
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
