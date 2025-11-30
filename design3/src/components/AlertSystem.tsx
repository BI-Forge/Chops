import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useAlert, Alert, AlertType } from '../contexts/AlertContext';
import { useTheme } from '../contexts/ThemeContext';

const alertConfig = {
  success: {
    icon: CheckCircle,
    lightColors: {
      bg: 'bg-green-50',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/10',
      icon: 'text-green-600',
      title: 'text-green-800',
      message: 'text-green-700',
      closeHover: 'hover:bg-green-100',
    },
    darkColors: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      iconBg: 'bg-green-500/20',
      icon: 'text-green-400',
      title: 'text-green-300',
      message: 'text-green-400/80',
      closeHover: 'hover:bg-green-500/20',
    }
  },
  error: {
    icon: XCircle,
    lightColors: {
      bg: 'bg-red-50',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/10',
      icon: 'text-red-600',
      title: 'text-red-800',
      message: 'text-red-700',
      closeHover: 'hover:bg-red-100',
    },
    darkColors: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/20',
      icon: 'text-red-400',
      title: 'text-red-300',
      message: 'text-red-400/80',
      closeHover: 'hover:bg-red-500/20',
    }
  },
  warning: {
    icon: AlertTriangle,
    lightColors: {
      bg: 'bg-amber-50',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/10',
      icon: 'text-amber-600',
      title: 'text-amber-800',
      message: 'text-amber-700',
      closeHover: 'hover:bg-amber-100',
    },
    darkColors: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/20',
      icon: 'text-yellow-400',
      title: 'text-yellow-300',
      message: 'text-yellow-400/80',
      closeHover: 'hover:bg-yellow-500/20',
    }
  },
  info: {
    icon: Info,
    lightColors: {
      bg: 'bg-blue-50',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      icon: 'text-blue-600',
      title: 'text-blue-800',
      message: 'text-blue-700',
      closeHover: 'hover:bg-blue-100',
    },
    darkColors: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/20',
      icon: 'text-blue-400',
      title: 'text-blue-300',
      message: 'text-blue-400/80',
      closeHover: 'hover:bg-blue-500/20',
    }
  }
};

function AlertItem({ alert }: { alert: Alert }) {
  const { removeAlert } = useAlert();
  const { theme } = useTheme();
  const [isExiting, setIsExiting] = useState(false);
  
  const config = alertConfig[alert.type];
  const Icon = config.icon;
  const colors = theme === 'light' ? config.lightColors : config.darkColors;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeAlert(alert.id);
    }, 300);
  };

  useEffect(() => {
    // Auto-close animation before removal
    const duration = alert.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300);

    return () => clearTimeout(timer);
  }, [alert.duration]);

  return (
    <div
      className={`${colors.bg} ${colors.border} border backdrop-blur-md rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${
        isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-5'
      }`}
      style={{ maxWidth: '420px', width: '100%' }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`${colors.iconBg} rounded-lg p-2 flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={`${colors.title} font-medium mb-1`}>
            {alert.title}
          </div>
          {alert.message && (
            <div className={`${colors.message} text-sm`}>
              {alert.message}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className={`${colors.closeHover} rounded-lg p-1.5 transition-colors duration-200 flex-shrink-0`}
          aria-label="Close alert"
        >
          <X className={`w-4 h-4 ${colors.icon}`} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-black/5 dark:bg-white/5 overflow-hidden">
        <div 
          className={`h-full ${
            alert.type === 'success' ? 'bg-green-500' :
            alert.type === 'error' ? 'bg-red-500' :
            alert.type === 'warning' ? (theme === 'light' ? 'bg-amber-500' : 'bg-yellow-500') :
            'bg-blue-500'
          } transition-all duration-[${alert.duration || 5000}ms] ease-linear`}
          style={{
            width: '100%',
            animation: `shrink ${alert.duration || 5000}ms linear forwards`
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export function AlertSystem() {
  const { alerts } = useAlert();

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 pointer-events-none">
      <div className="flex flex-col gap-3 pointer-events-auto">
        {alerts.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
