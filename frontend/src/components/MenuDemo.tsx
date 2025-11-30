import React, { useState } from 'react';
import { BackgroundPattern } from './BackgroundPattern';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';
import { Sidebar } from './Sidebar';
import { TopMenu } from './TopMenu';
import { MetricsCards } from './MetricsCards';
import { Bell, User } from 'lucide-react';

type MenuType = 'sidebar' | 'top' | 'both';

export function MenuDemo() {
  const [menuType, setMenuType] = useState<MenuType>('sidebar');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <BackgroundPattern />
      
      {/* Content */}
      <div className="relative z-10 flex h-screen">
        {/* Sidebar Menu */}
        {(menuType === 'sidebar' || menuType === 'both') && (
          <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="border-b border-yellow-500/20 bg-gray-900/40 backdrop-blur-md">
            <div className="px-6 py-4 flex items-center justify-between">
              <ClickhouseOpsLogo size="small" variant="light" />
              
              <div className="flex items-center gap-4">
                <button className="p-2 rounded-lg bg-gray-800/60 border border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-all">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-lg bg-gray-800/60 border border-yellow-500/20 text-gray-300 hover:text-yellow-400 hover:border-yellow-500/40 transition-all">
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Top Menu (if selected) */}
          {(menuType === 'top' || menuType === 'both') && <TopMenu />}

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-[1920px] mx-auto space-y-8">
              {/* Menu Type Selector */}
              <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
                <h2 className="text-yellow-400 mb-4">Выберите тип меню</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => setMenuType('sidebar')}
                    className={`px-6 py-3 rounded-lg transition-all ${
                      menuType === 'sidebar'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                        : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
                    }`}
                  >
                    Боковое меню
                  </button>
                  <button
                    onClick={() => setMenuType('top')}
                    className={`px-6 py-3 rounded-lg transition-all ${
                      menuType === 'top'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                        : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
                    }`}
                  >
                    Верхнее меню
                  </button>
                  <button
                    onClick={() => setMenuType('both')}
                    className={`px-6 py-3 rounded-lg transition-all ${
                      menuType === 'both'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900'
                        : 'bg-gray-800/60 text-gray-300 border border-yellow-500/20 hover:border-yellow-500/40'
                    }`}
                  >
                    Комбинированное
                  </button>
                </div>
              </div>

              {/* Page Content */}
              <div>
                <h1 className="text-yellow-400 mb-2">System Overview</h1>
                <p className="text-gray-400 mb-6">Пример страницы с различными типами меню</p>
                <MetricsCards />
              </div>

              {/* Menu Features */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
                  <h2 className="text-yellow-400 mb-4">Боковое меню (Sidebar)</h2>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Сворачивание/разворачивание</li>
                    <li>✓ Поиск по пунктам меню</li>
                    <li>✓ Вложенные подменю</li>
                    <li>✓ Счетчики (badges)</li>
                    <li>✓ Активное состояние</li>
                    <li>✓ Иконки для всех пунктов</li>
                    <li>✓ Футер с системной информацией</li>
                  </ul>
                </div>

                <div className="bg-gray-900/60 backdrop-blur-md rounded-xl p-6 border border-yellow-500/20">
                  <h2 className="text-yellow-400 mb-4">Верхнее меню (Top Menu)</h2>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✓ Горизонтальное расположение</li>
                    <li>✓ Выпадающие списки (dropdown)</li>
                    <li>✓ Подсветка активного раздела</li>
                    <li>✓ Счетчики уведомлений</li>
                    <li>✓ Анимация при наведении</li>
                    <li>✓ Компактный дизайн</li>
                    <li>✓ Автоскрытие dropdown</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
