import { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Database, 
  FileText, 
  Settings, 
  Users, 
  BarChart3,
  LogOut,
  X
} from 'lucide-react';
import { NodeSelector } from './NodeSelector';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../services/AuthContext';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Determine active item based on current route
  const getActiveItem = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname === '/query-history') return 'queries';
    if (location.pathname === '/backups') return 'backups';
    if (location.pathname === '/users') return 'users';
    return 'dashboard';
  };
  
  const activeItem = getActiveItem();
  
  const userName = user?.username || 'Admin User';
  const userInitial = userName.charAt(0).toUpperCase();
  
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

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'queries', label: 'Queries', icon: <FileText className="w-5 h-5" /> },
    { id: 'databases', label: 'Databases', icon: <Database className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleMenuItemClick = (itemId: string) => {
    if (itemId === 'dashboard') {
      navigate('/dashboard');
    } else if (itemId === 'queries') {
      navigate('/query-history');
    } else if (itemId === 'backups') {
      navigate('/backups');
    } else if (itemId === 'users') {
      navigate('/users');
    }
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div 
        ref={menuRef}
        className={`fixed top-0 left-0 h-full w-full z-50 ${
          theme === 'light' ? 'bg-white' : 'bg-gray-900'
        } shadow-2xl transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="mobile-menu"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-4 border-b ${
            theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'
          }`}>
            <div className="flex items-center justify-between mb-4">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${avatarGradient} flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-semibold">{userInitial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${
                    theme === 'light' ? 'text-gray-900' : 'text-gray-200'
                  } text-sm font-medium truncate`}>
                    {userName}
                  </p>
                  <p className={`${
                    theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                  } text-xs truncate`}>
                    Administrator
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'hover:bg-amber-100 text-gray-700'
                    : 'hover:bg-gray-800 text-gray-400'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeItem === item.id
                      ? theme === 'light'
                        ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 shadow-sm'
                        : 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 shadow-lg shadow-yellow-500/10'
                      : theme === 'light'
                        ? 'text-gray-700 hover:bg-amber-50/50 hover:text-amber-700'
                        : 'text-gray-400 hover:bg-gray-800/60 hover:text-yellow-400'
                  }`}
                >
                  <span className={`${
                    activeItem === item.id
                      ? theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
                      : ''
                  }`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Footer Actions */}
          <div className={`border-t ${
            theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'
          }`}>
            {/* Node Selector as List */}
            <NodeSelector asList />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                theme === 'light'
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-red-400 hover:bg-red-500/10'
              }`}
              data-testid="mobile-menu-logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
