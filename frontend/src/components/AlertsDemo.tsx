import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, Zap, Copy, Trash2, Play } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import { useTheme } from '../contexts/ThemeContext';

export function AlertsDemo() {
  const { success, error, warning, info } = useAlert();
  const { theme } = useTheme();

  const exampleAlerts = [
    {
      type: 'success' as const,
      icon: CheckCircle,
      title: 'Success Alerts',
      examples: [
        { title: 'Query Executed', message: 'Query returned 1,247 rows in 0.32 seconds' },
        { title: 'Connection Successful', message: 'Connected to production-node-01' },
        { title: 'Data Exported', message: 'Successfully exported 50,000 records to CSV' },
        { title: 'Settings Saved', message: 'Your preferences have been updated' }
      ]
    },
    {
      type: 'error' as const,
      icon: XCircle,
      title: 'Error Alerts',
      examples: [
        { title: 'Connection Failed', message: 'Unable to connect to node: production-node-04' },
        { title: 'Query Timeout', message: 'Query execution exceeded 30 second limit' },
        { title: 'Syntax Error', message: 'Invalid SQL syntax at line 15, column 8' },
        { title: 'Authentication Failed', message: 'Invalid credentials provided' }
      ]
    },
    {
      type: 'warning' as const,
      icon: AlertTriangle,
      title: 'Warning Alerts',
      examples: [
        { title: 'High Memory Usage', message: 'Memory usage is at 87% - consider optimization' },
        { title: 'Slow Query Detected', message: 'Query took 15.4 seconds to complete' },
        { title: 'Disk Space Low', message: 'Only 12% of storage space remaining' },
        { title: 'Deprecated Function', message: 'Function arrayJoin() is deprecated in ClickHouse 23.x' }
      ]
    },
    {
      type: 'info' as const,
      icon: Info,
      title: 'Info Alerts',
      examples: [
        { title: 'Database Update', message: 'Node connection refreshed automatically' },
        { title: 'New Query Available', message: '3 new slow queries detected in the last hour' },
        { title: 'Maintenance Scheduled', message: 'System maintenance on Saturday 2AM-4AM UTC' },
        { title: 'Version Update', message: 'ClickHouse OPS v2.1.5 is now available' }
      ]
    }
  ];

  const triggerAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    switch (type) {
      case 'success':
        success(title, message);
        break;
      case 'error':
        error(title, message);
        break;
      case 'warning':
        warning(title, message);
        break;
      case 'info':
        info(title, message);
        break;
    }
  };

  const triggerMultipleAlerts = () => {
    success('Query 1 Completed', 'Fetched 1,234 rows in 0.5s');
    setTimeout(() => {
      info('Query 2 Started', 'Processing aggregation query...');
    }, 300);
    setTimeout(() => {
      warning('Query 2 Slow', 'Query execution exceeding 5 seconds');
    }, 600);
    setTimeout(() => {
      success('Query 2 Completed', 'Aggregated 45,678 rows in 8.2s');
    }, 900);
    setTimeout(() => {
      error('Query 3 Failed', 'Connection timeout after 30 seconds');
    }, 1200);
  };

  const triggerStressTest = () => {
    const messages = [
      { type: 'success' as const, title: 'Success #1', message: 'First success message' },
      { type: 'error' as const, title: 'Error #1', message: 'First error message' },
      { type: 'warning' as const, title: 'Warning #1', message: 'First warning message' },
      { type: 'info' as const, title: 'Info #1', message: 'First info message' },
      { type: 'success' as const, title: 'Success #2', message: 'Second success message' },
      { type: 'error' as const, title: 'Error #2', message: 'Second error message' }
    ];

    messages.forEach((msg, index) => {
      setTimeout(() => {
        triggerAlert(msg.type, msg.title, msg.message);
      }, index * 400);
    });
  };

  return (
    <div className={`${theme === 'light' ? 'bg-white/90' : 'bg-gray-900/40'} backdrop-blur-md rounded-xl p-6 border ${
      theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/20'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className={`${
          theme === 'light' ? 'bg-amber-500/20' : 'bg-yellow-500/20'
        } rounded-lg p-2`}>
          <Zap className={`w-6 h-6 ${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'}`} />
        </div>
        <div>
          <h2 className={`${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} text-xl`}>
            Alert System Demo
          </h2>
          <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
            Click on any alert example to trigger it
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <button
          onClick={triggerMultipleAlerts}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
            theme === 'light'
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-500/30'
              : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
          }`}
        >
          <Play className="w-4 h-4" />
          <span className="font-medium">Multiple Alerts</span>
        </button>

        <button
          onClick={triggerStressTest}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
            theme === 'light'
              ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-500/30'
              : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="font-medium">Stress Test</span>
        </button>

        <button
          onClick={() => info('Alert System', 'This is a custom notification system with 4 types of alerts', 8000)}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 ${
            theme === 'light'
              ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-500/30'
              : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }`}
        >
          <Info className="w-4 h-4" />
          <span className="font-medium">About</span>
        </button>
      </div>

      {/* Alert Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {exampleAlerts.map((category) => {
          const Icon = category.icon;
          const colorClasses = {
            success: {
              bg: theme === 'light' ? 'bg-green-50' : 'bg-green-500/10',
              border: 'border-green-500/30',
              icon: 'text-green-600 dark:text-green-400',
              title: theme === 'light' ? 'text-green-800' : 'text-green-300',
              button: theme === 'light' 
                ? 'bg-green-100 hover:bg-green-200 text-green-700'
                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
            },
            error: {
              bg: theme === 'light' ? 'bg-red-50' : 'bg-red-500/10',
              border: 'border-red-500/30',
              icon: 'text-red-600 dark:text-red-400',
              title: theme === 'light' ? 'text-red-800' : 'text-red-300',
              button: theme === 'light'
                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                : 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
            },
            warning: {
              bg: theme === 'light' ? 'bg-amber-50' : 'bg-yellow-500/10',
              border: theme === 'light' ? 'border-amber-500/30' : 'border-yellow-500/30',
              icon: theme === 'light' ? 'text-amber-600' : 'text-yellow-400',
              title: theme === 'light' ? 'text-amber-800' : 'text-yellow-300',
              button: theme === 'light'
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
            },
            info: {
              bg: theme === 'light' ? 'bg-blue-50' : 'bg-blue-500/10',
              border: 'border-blue-500/30',
              icon: 'text-blue-600 dark:text-blue-400',
              title: theme === 'light' ? 'text-blue-800' : 'text-blue-300',
              button: theme === 'light'
                ? 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
            }
          };

          const colors = colorClasses[category.type];

          return (
            <div
              key={category.type}
              className={`${colors.bg} border ${colors.border} rounded-lg p-4`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`w-5 h-5 ${colors.icon}`} />
                <h3 className={`${colors.title} font-medium`}>{category.title}</h3>
              </div>

              <div className="space-y-2">
                {category.examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => triggerAlert(category.type, example.title, example.message)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 ${colors.button}`}
                  >
                    <div className="font-medium text-sm">{example.title}</div>
                    <div className={`text-xs mt-0.5 ${
                      theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {example.message}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Features List */}
      <div className={`mt-8 p-4 rounded-lg border ${
        theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/30 border-gray-700'
      }`}>
        <h4 className={`${theme === 'light' ? 'text-gray-800' : 'text-gray-200'} font-medium mb-3`}>
          Features
        </h4>
        <ul className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm space-y-2`}>
          <li>• Four alert types: Success, Error, Warning, and Info</li>
          <li>• Auto-dismiss after 5 seconds (configurable)</li>
          <li>• Progress bar showing remaining time</li>
          <li>• Smooth animations and transitions</li>
          <li>• Stacked display for multiple alerts</li>
          <li>• Manual close button</li>
          <li>• Responsive design for mobile and desktop</li>
          <li>• Consistent with yellow color scheme</li>
        </ul>
      </div>
    </div>
  );
}
