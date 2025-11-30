import React, { useState } from 'react';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { Sidebar } from '../components/Sidebar';
import { MobileMenu } from '../components/MobileMenu';
import { DashboardHeader } from '../components/DashboardHeader';
import { DashboardContent } from '../components/DashboardContent';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardPageProps {
  onLogout?: () => void;
  activePage?: string;
  onPageChange?: (page: string) => void;
}

export function DashboardPage({ onLogout, activePage, onPageChange }: DashboardPageProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

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
            onLogout={onLogout}
            activePage={activePage}
            onPageChange={onPageChange}
          />
        </div>

        {/* Mobile Menu */}
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onLogout={onLogout}
          activePage={activePage}
          onPageChange={onPageChange}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <DashboardHeader 
            title="Dashboard" 
            onMenuOpen={() => setMobileMenuOpen(true)}
          />

          {/* Main Content */}
          <DashboardContent />
        </div>
      </div>
    </div>
  );
}
