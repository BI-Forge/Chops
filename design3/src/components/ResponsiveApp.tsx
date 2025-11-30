import React, { useState } from 'react';
import { useMobileDetect } from '../hooks/useMobileDetect';

// Desktop components
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { QueriesPage } from '../pages/QueriesPage';

// Mobile components
import { MobileLoginPage } from '../pages/mobile/MobileLoginPage';
import { MobileDashboardPage } from '../pages/mobile/MobileDashboardPage';
import { MobileQueriesPage } from '../pages/mobile/MobileQueriesPage';

type Page = 'dashboard' | 'queries' | 'batches' | 'users' | 'tables' | 'settings';

export function ResponsiveApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const { isMobile, isTablet } = useMobileDetect();

  const handleLogin = (email: string, password: string) => {
    console.log('Login attempt:', { email, password });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page as Page);
  };

  // Use mobile version for phones and tablets
  const useMobileVersion = isMobile || isTablet;

  // Login Page
  if (!isLoggedIn) {
    return useMobileVersion ? (
      <MobileLoginPage onLogin={handleLogin} />
    ) : (
      <LoginPage onLogin={handleLogin} />
    );
  }

  // Dashboard and other pages
  if (useMobileVersion) {
    // Mobile version
    switch (currentPage) {
      case 'dashboard':
        return <MobileDashboardPage onLogout={handleLogout} />;
      case 'queries':
        return <MobileQueriesPage onLogout={handleLogout} />;
      case 'batches':
      case 'users':
      case 'tables':
      case 'settings':
        // For now, show dashboard for unimplemented mobile pages
        return <MobileDashboardPage onLogout={handleLogout} />;
      default:
        return <MobileDashboardPage onLogout={handleLogout} />;
    }
  } else {
    // Desktop version
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onLogout={handleLogout} />;
      case 'queries':
        return <QueriesPage onLogout={handleLogout} />;
      case 'batches':
      case 'users':
      case 'tables':
      case 'settings':
        // For now, show dashboard for unimplemented pages
        return <DashboardPage onLogout={handleLogout} />;
      default:
        return <DashboardPage onLogout={handleLogout} />;
    }
  }
}
