import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Activity, 
  FileText, 
  Settings, 
  Users, 
  ChevronDown
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  dropdown?: MenuItem[];
}

export function TopMenu() {
  const [activeItem, setActiveItem] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'databases',
      label: 'Databases',
      icon: <Database className="w-4 h-4" />,
      dropdown: [
        { id: 'db-1', label: 'Production DB', icon: <Database className="w-4 h-4" /> },
        { id: 'db-2', label: 'Staging DB', icon: <Database className="w-4 h-4" /> },
        { id: 'db-3', label: 'Development DB', icon: <Database className="w-4 h-4" /> },
      ],
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: <Activity className="w-4 h-4" />,
      badge: 3,
      dropdown: [
        { id: 'metrics', label: 'Metrics', icon: <Activity className="w-4 h-4" /> },
        { id: 'queries', label: 'Queries', icon: <FileText className="w-4 h-4" />, badge: 12 },
        { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="bg-gray-900/60 backdrop-blur-md border-b border-yellow-500/20">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex items-center gap-2">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => item.dropdown && setOpenDropdown(item.id)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                onClick={() => setActiveItem(item.id)}
                className={`flex items-center gap-2 px-4 py-4 transition-all duration-200 border-b-2 ${
                  activeItem === item.id
                    ? 'text-yellow-400 border-yellow-500'
                    : 'text-gray-300 border-transparent hover:text-yellow-400 hover:bg-gray-800/40'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                
                {item.badge && (
                  <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
                
                {item.dropdown && (
                  <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown === item.id ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Dropdown */}
              {item.dropdown && openDropdown === item.id && (
                <div className="absolute top-full left-0 mt-0 w-56 bg-gray-900/95 backdrop-blur-md border border-yellow-500/20 rounded-lg shadow-xl shadow-black/50 overflow-hidden z-50">
                  {item.dropdown.map((dropdownItem) => (
                    <button
                      key={dropdownItem.id}
                      onClick={() => setActiveItem(dropdownItem.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                        activeItem === dropdownItem.id
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'text-gray-300 hover:bg-gray-800/60 hover:text-yellow-400'
                      }`}
                    >
                      {dropdownItem.icon}
                      <span className="flex-1 text-left">{dropdownItem.label}</span>
                      {dropdownItem.badge && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                          {dropdownItem.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
