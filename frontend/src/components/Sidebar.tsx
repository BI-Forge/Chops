import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  Settings, 
  Users, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Table,
  Shield
} from 'lucide-react';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../services/AuthContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

// Sidebar renders the navigation menu with profile controls.
export function Sidebar({ collapsed: controlledCollapsed, onCollapse }: SidebarProps) {
  const { sidebarCollapsed: contextCollapsed, setSidebarCollapsed } = useSidebar();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use controlled prop if provided, otherwise use context
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : contextCollapsed;
  
  // Update menu position when it opens
  useEffect(() => {
    if (userMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 8, // 8px gap
        left: rect.left + 16, // 16px padding
        width: collapsed ? 224 : rect.width - 32 // 224px fixed width or button width minus padding
      });
    }
  }, [userMenuOpen, collapsed]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both button and menu
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);
  
  // Determine active item based on current route
  const getActiveItem = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname === '/query-history') return 'queries';
    if (location.pathname === '/backups') return 'backups';
    if (location.pathname === '/tables') return 'tables';
    if (location.pathname === '/users') return 'users';
    if (location.pathname === '/settings') return 'settings';
    if (location.pathname === '/admin-settings') return 'admin-settings';
    return 'dashboard';
  };
  
  const activeItem = getActiveItem();
  
  const userName = user?.username || 'Admin User';
  const systemRoleLabel = user?.role_name?.trim() || 'User';
  const userInitial = userName.charAt(0).toUpperCase();
  
  // Generate color based on first letter of name
  const getColorForLetter = (letter: string) => {
    const charCode = letter.charCodeAt(0);
    const colors = [
      'from-amber-400 to-orange-500',
      'from-yellow-400 to-amber-500',
      'from-amber-500 to-yellow-600',
      'from-orange-400 to-amber-600',
      'from-yellow-500 to-orange-500',
      'from-amber-600 to-yellow-500',
    ];
    return colors[charCode % colors.length];
  };
  
  const avatarGradient = getColorForLetter(userInitial);
  
  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    if (controlledCollapsed !== undefined) {
      onCollapse?.(newCollapsed);
    } else {
      setSidebarCollapsed(newCollapsed);
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePageChange = (pageId: string) => {
    if (pageId === 'dashboard') {
      navigate('/dashboard');
    } else if (pageId === 'queries') {
      navigate('/query-history');
    } else if (pageId === 'backups') {
      navigate('/backups');
    } else if (pageId === 'tables') {
      navigate('/tables');
    } else if (pageId === 'users') {
      navigate('/users');
    } else if (pageId === 'settings') {
      navigate('/settings');
    } else if (pageId === 'admin-settings') {
      navigate('/admin-settings');
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'queries',
      label: 'Queries',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'backups',
      label: 'Backups',
      icon: <Database className="w-5 h-5" />,
    },
    {
      id: 'users',
      label: 'Users',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'tables',
      label: 'Tables',
      icon: <Table className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <div
      className={`${
        theme === 'light' 
          ? 'bg-white/90 border-amber-500/30' 
          : 'bg-gray-900/40 border-yellow-500/20'
      } backdrop-blur-md border-r transition-all duration-300 h-screen flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
      data-testid="sidebar"
    >
      {/* Logo Header */}
      <div className={`px-4 py-4 border-b ${theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'} h-[73px] flex items-center`}>
        <div className="flex items-center justify-between w-full">
          {collapsed ? (
            <div className="flex-1 flex justify-center">
              <ClickhouseOpsLogo size="small" variant={theme === 'light' ? 'default' : 'dark'} iconOnly={true} />
            </div>
          ) : (
            <>
              <ClickhouseOpsLogo size="small" variant={theme === 'light' ? 'default' : 'dark'} />
              <button
                onClick={handleCollapse}
                className={`p-1.5 rounded-md ${
                  theme === 'light'
                    ? 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                    : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800/30'
                } transition-all`}
                title="Collapse menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        
        {collapsed && (
          <button
            onClick={handleCollapse}
            className={`w-full mt-4 p-1.5 rounded-md ${
              theme === 'light'
                ? 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800/30'
            } transition-all flex items-center justify-center`}
            title="Expand menu"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handlePageChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
              activeItem === item.id
                ? theme === 'light'
                  ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-400/60 text-amber-700'
                  : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/40 text-yellow-400'
                : theme === 'light'
                  ? 'text-gray-700 hover:bg-amber-50 hover:text-amber-700 hover:translate-x-1 border border-transparent'
                  : 'text-gray-300 hover:bg-gray-800/30 hover:text-yellow-400 hover:translate-x-1 border border-transparent'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <div className={`${
              activeItem === item.id 
                ? theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                : theme === 'light' 
                  ? 'text-gray-600 group-hover:text-amber-700' 
                  : 'text-gray-400 group-hover:text-yellow-400'
            } transition-all duration-200 ${activeItem === item.id ? '' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            
            {!collapsed && (
              <span className="flex-1 text-left">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* User Menu Footer */}
      <div className={`p-4 border-t ${theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'}`}>
        {collapsed ? (
          <button
            ref={buttonRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full p-2 rounded-lg ${
              theme === 'light'
                ? 'bg-amber-50/50 border-amber-500/30 hover:border-amber-500/50'
                : 'bg-gray-800/30 border-yellow-500/20 hover:border-yellow-500/40'
            } border text-gray-900 transition-all flex items-center justify-center`}
            data-testid="user-menu-toggle"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-sm`}>
              {userInitial}
            </div>
          </button>
        ) : (
          <button
            ref={buttonRef}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              theme === 'light'
                ? 'bg-amber-50/50 border-amber-500/30 hover:border-amber-500/50'
                : 'bg-gray-800/30 border-yellow-500/20 hover:border-yellow-500/40'
            } border transition-all group`}
            data-testid="user-menu-toggle"
          >
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-sm`}>
              {userInitial}
            </div>
            <div className="flex-1 text-left">
              <div className={`text-sm ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>{userName}</div>
              <div className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{systemRoleLabel}</div>
            </div>
            <ChevronDown className={`w-4 h-4 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'} transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* Dropdown menu - rendered via Portal */}
        {userMenuOpen && createPortal(
          <div 
            ref={menuRef}
            className={`fixed ${
              theme === 'light' 
                ? 'bg-white border-amber-500/30' 
                : 'bg-gray-800 border-yellow-500/20'
            } backdrop-blur-md border rounded-lg shadow-xl overflow-hidden z-[9999]`}
            style={{
              bottom: menuPosition.bottom,
              left: menuPosition.left,
              width: menuPosition.width
            }}
          >
            <button 
              onClick={() => {
                setUserMenuOpen(false);
                handlePageChange('admin-settings');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-amber-50'
                  : 'text-gray-300 hover:bg-gray-700/50'
              } transition-all text-sm`}
            >
              <Shield className="w-4 h-4" />
              <span className="whitespace-nowrap">Admin Settings</span>
            </button>
            
            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-4 py-2.5 ${
                theme === 'light'
                  ? 'text-gray-700 hover:bg-amber-50'
                  : 'text-gray-300 hover:bg-gray-700/50'
              } transition-all text-sm border-t ${
                theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'
              }`}
            >
              {theme === 'light' ? (
                <><Moon className="w-4 h-4" /> <span className="whitespace-nowrap">Dark Mode</span></>
              ) : (
                <><Sun className="w-4 h-4" /> <span className="whitespace-nowrap">Light Mode</span></>
              )}
            </button>
            
            <button 
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-2.5 ${
                theme === 'light'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-red-400 hover:bg-red-900/20'
              } transition-all text-sm border-t ${
                theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'
              }`}
              data-testid="user-menu-logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="whitespace-nowrap">Logout</span>
            </button>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
