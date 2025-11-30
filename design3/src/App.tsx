import React, { useState } from 'react';
import { ClickhouseOpsLogo } from './components/ClickhouseOpsLogo';
import { BackgroundPattern } from './components/BackgroundPattern';
import { UsageInstructions } from './components/UsageInstructions';
import { ExamplePage1 } from './components/ExamplePage1';
import { ExamplePage2 } from './components/ExamplePage2';
import { TransferGuide } from './components/TransferGuide';
import { DashboardDemo } from './components/DashboardDemo';
import { MenuDemo } from './components/MenuDemo';
import { ChartsDemo } from './components/ChartsDemo';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { QueriesPage } from './pages/QueriesPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { AlertProvider } from './contexts/AlertContext';
import { AlertSystem } from './components/AlertSystem';
import { AlertsDemo } from './components/AlertsDemo';

function AppContent() {
  const [currentView, setCurrentView] = useState<'logos' | 'instructions' | 'transfer' | 'dashboard' | 'menu' | 'charts' | 'example1' | 'example2' | 'login' | 'dashboardPage' | 'queriesPage' | 'alerts'>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState<string>('dashboard');

  const handleLogin = (username: string, password: string) => {
    // Allow any credentials for demo
    setIsAuthenticated(true);
    setCurrentView('dashboardPage');
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('login');
    setActivePage('dashboard');
  };

  const handlePageChange = (page: string) => {
    setActivePage(page);
    if (page === 'dashboard') {
      setCurrentView('dashboardPage');
    } else if (page === 'queries') {
      setCurrentView('queriesPage');
    }
  };

  if (currentView === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (currentView === 'dashboardPage') {
    return <DashboardPage onLogout={handleLogout} activePage={activePage} onPageChange={handlePageChange} />;
  }

  if (currentView === 'queriesPage') {
    return <QueriesPage onLogout={handleLogout} activePage={activePage} onPageChange={handlePageChange} />;
  }

  if (currentView === 'alerts') {
    return (
      <div className="h-screen overflow-auto">
        <BackgroundPattern />
        <div className="relative z-10 p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setCurrentView('login')}
              className="mb-6 px-6 py-3 rounded-lg bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
            >
              ← Back to Navigation
            </button>
            <AlertsDemo />
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'charts') {
    return <ChartsDemo onLogout={handleLogout} />;
  }

  if (currentView === 'menu') {
    return <MenuDemo />;
  }

  if (currentView === 'dashboard') {
    return <DashboardDemo />;
  }

  if (currentView === 'example1') {
    return <ExamplePage1 />;
  }

  if (currentView === 'example2') {
    return <ExamplePage2 />;
  }

  if (currentView === 'transfer') {
    return (
      <div className="h-screen overflow-auto">
        <BackgroundPattern />
        <div className="relative z-10 p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setCurrentView('login')}
              className="mb-6 px-6 py-3 rounded-lg bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40 transition-all"
            >
              ← Back to Navigation
            </button>
            <TransferGuide />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10 p-8">
        <div className="max-w-6xl mx-auto w-full space-y-16">
          {/* Navigation tabs */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => setCurrentView('login')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'login'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Login Page
            </button>
            <button
              onClick={() => setCurrentView('dashboardPage')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'dashboardPage'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Dashboard Page
            </button>
            <button
              onClick={() => setCurrentView('alerts')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'alerts'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Алерты
            </button>
            <button
              onClick={() => setCurrentView('charts')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'charts'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Графики
            </button>
            <button
              onClick={() => setCurrentView('menu')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'menu'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Меню
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'dashboard'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('logos')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'logos'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Логотипы
            </button>
            <button
              onClick={() => setCurrentView('instructions')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'instructions'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Использование
            </button>
            <button
              onClick={() => setCurrentView('transfer')}
              className={`px-6 py-3 rounded-lg transition-all ${
                currentView === 'transfer'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                  : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
              }`}
            >
              Перенос в другой Make
            </button>
          </div>

          {currentView === 'instructions' ? (
            <UsageInstructions />
          ) : (
          <>
          {/* Main logo showcase */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-3xl shadow-2xl p-16 flex items-center justify-center border border-yellow-500/20">
            <ClickhouseOpsLogo size="large" variant="light" />
          </div>

          {/* Logo variations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Dark background variant */}
            <div className="bg-gray-800/60 backdrop-blur-md rounded-2xl shadow-xl p-8 flex items-center justify-center border border-yellow-500/10">
              <ClickhouseOpsLogo size="medium" variant="light" />
            </div>

            {/* Yellow background variant */}
            <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-xl p-8 flex items-center justify-center">
              <ClickhouseOpsLogo size="medium" variant="dark" />
            </div>

            {/* Gray background variant */}
            <div className="bg-gray-700/60 backdrop-blur-md rounded-2xl shadow-xl p-8 flex items-center justify-center border border-yellow-400/20">
              <ClickhouseOpsLogo size="medium" variant="light" />
            </div>
          </div>

          {/* Icon only variations */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-yellow-500/20">
            <h3 className="text-center text-gray-300 mb-6">Icon Variations</h3>
            <div className="flex items-center justify-center gap-12">
              <ClickhouseOpsLogo size="small" iconOnly variant="light" />
              <ClickhouseOpsLogo size="medium" iconOnly variant="light" />
              <ClickhouseOpsLogo size="large" iconOnly variant="light" />
            </div>
          </div>

          {/* Example content section to demonstrate background */}
          <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl shadow-xl p-12 border border-yellow-500/20">
            <h2 className="text-yellow-400 mb-4">Пример контента с фоновым паттерном</h2>
            <p className="text-gray-300 mb-6">
              Фоновый паттерн создан в едином стиле с логотипом, используя те же элементы: 
              цилиндры баз данных, молнии и курсоры. Паттерн ненавязчивый и не отвлекает 
              от основного контента. Темная тема идеально подходит для системы мониторинга.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800/80 rounded-lg p-4 border border-yellow-500/20">
                <h3 className="text-yellow-400 mb-2">Особенности</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li> Темный фон для комфортной работы</li>
                  <li>• Желтые акценты для узнаваемости</li>
                  <li>• Ненавязчивый повторяющийся паттерн</li>
                  <li>• Анимированные световые эффекты</li>
                </ul>
              </div>
              <div className="bg-gray-800/80 rounded-lg p-4 border border-yellow-500/20">
                <h3 className="text-yellow-400 mb-2">Применение</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Все страницы си��темы</li>
                  <li>• Отличная читабельность</li>
                  <li>• Единый фирменный стиль</li>
                  <li>• Профессиональный вид</li>
                </ul>
              </div>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AlertProvider>
        <AppContent />
        <AlertSystem />
      </AlertProvider>
    </ThemeProvider>
  );
}