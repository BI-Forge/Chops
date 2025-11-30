import { useState, useEffect } from 'react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardContent } from '../components/DashboardContent';
import { metricsAPI } from '../services/metricsAPI';

export function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nodes, setNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [loadingNodes, setLoadingNodes] = useState(true);

  // Load nodes from API
  useEffect(() => {
    const loadNodes = async () => {
      try {
        setLoadingNodes(true);
        const availableNodes = await metricsAPI.getAvailableNodes();
        setNodes(availableNodes);
        
        // Get saved node from sessionStorage or use first node
        const savedNode = sessionStorage.getItem('selectedNode');
        if (savedNode && availableNodes.includes(savedNode)) {
          setSelectedNode(savedNode);
        } else if (availableNodes.length > 0) {
          setSelectedNode(availableNodes[0]);
          sessionStorage.setItem('selectedNode', availableNodes[0]);
        }
      } catch (error) {
        console.error('Failed to load nodes:', error);
      } finally {
        setLoadingNodes(false);
      }
    };

    loadNodes();
  }, []);

  // Save selected node to sessionStorage
  const handleNodeSelect = (node: string) => {
    setSelectedNode(node);
    sessionStorage.setItem('selectedNode', node);
  };

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10 flex h-full">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar 
            collapsed={sidebarCollapsed} 
            onCollapse={setSidebarCollapsed}
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader 
            title="Dashboard" 
            onMenuOpen={() => setMobileMenuOpen(true)}
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={handleNodeSelect}
            loadingNodes={loadingNodes}
          />

          {/* Main Content */}
          <DashboardContent selectedNode={selectedNode} />
        </div>
      </div>
    </div>
  );
}
