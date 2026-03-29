import { Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface Setting {
  name: string;
  value: string;
  changed: number;
  description: string;
  min: string | null;
  max: string | null;
  disallowed_values: string[];
  readonly: number;
  type: string;
  default: string;
  alias_for: string;
  is_obsolete: number;
  tier: string;
  server: boolean;
}

interface SettingsTableProps {
  settings: Setting[];
  onViewDetails: (setting: Setting) => void;
  onSort: (field: 'name' | 'changed' | 'server') => void;
  sortField: 'name' | 'changed' | 'server' | null;
  sortDirection: 'asc' | 'desc';
}

export function SettingsTable({ settings, onViewDetails, onSort, sortField, sortDirection }: SettingsTableProps) {
  const { theme } = useTheme();

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'production':
        return theme === 'light'
          ? 'bg-green-100 text-green-800 border-green-200'
          : 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'beta':
        return theme === 'light'
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'experimental':
        return theme === 'light'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30';
      case 'milestone':
        return theme === 'light'
          ? 'bg-violet-100 text-violet-800 border-violet-200'
          : 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'obsolete':
        return theme === 'light'
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return theme === 'light'
          ? 'bg-gray-100 text-gray-800 border-gray-200'
          : 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const SortIcon = ({ field }: { field: 'name' | 'changed' | 'server' }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const rowBorder = theme === 'light' ? 'border-amber-500/20 hover:bg-amber-50/30' : 'border-yellow-500/10 hover:bg-gray-800/40';

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr
            className={`border-b ${
              theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
            }`}
          >
            <th
              className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
              }`}
              onClick={() => onSort('name')}
            >
              <div className="flex items-center gap-1.5">
                <span>Name</span>
                <SortIcon field="name" />
              </div>
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium">Value</th>
            <th className="text-left py-3 px-4 text-sm font-medium">Type</th>
            <th
              className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
              }`}
              onClick={() => onSort('changed')}
            >
              <div className="flex items-center gap-1.5">
                <span>Changed</span>
                <SortIcon field="changed" />
              </div>
            </th>
            <th
              className={`text-left py-3 px-4 text-sm font-medium cursor-pointer select-none transition-colors ${
                theme === 'light' ? 'hover:text-amber-700' : 'hover:text-yellow-400'
              }`}
              onClick={() => onSort('server')}
            >
              <div className="flex items-center gap-1.5">
                <span>Server</span>
                <SortIcon field="server" />
              </div>
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium">Tier</th>
            <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {settings.map((setting) => (
            <tr
              key={setting.name}
              className={`border-b ${rowBorder} transition-colors cursor-pointer`}
              onClick={() => onViewDetails(setting)}
            >
              <td className="py-3 px-4">
                <span className={`font-mono text-sm ${theme === 'light' ? 'text-gray-800' : 'text-white'}`}>
                  {setting.name}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`font-mono text-sm ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {setting.value}
                </span>
              </td>
              <td className="py-3 px-4">
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${
                    theme === 'light'
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-blue-500/20 border-blue-500/30'
                  }`}
                >
                  <span className={`text-xs font-medium ${theme === 'light' ? '' : 'text-blue-400'}`}>
                    {setting.type}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                    setting.changed === 1
                      ? theme === 'light'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30'
                      : theme === 'light'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
                  }`}
                >
                  {setting.changed === 1 ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                    setting.server
                      ? theme === 'light'
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30'
                      : theme === 'light'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
                  }`}
                >
                  {setting.server ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-3 px-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getTierColor(
                    setting.tier
                  )}`}
                >
                  {setting.tier}
                </span>
              </td>
              <td className="py-3 px-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(setting);
                  }}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    theme === 'light'
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-600 text-amber-700'
                      : 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500/50 text-yellow-400'
                  }`}
                  title="View details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
