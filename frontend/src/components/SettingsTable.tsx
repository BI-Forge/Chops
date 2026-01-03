import React from 'react';
import { Check, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5" />
      : <ArrowDown className="w-3.5 h-3.5" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={`border-b ${
            theme === 'light' ? 'border-amber-500/30 text-gray-700' : 'border-yellow-500/20 text-gray-400'
          }`}>
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
            <th className="text-left py-3 px-4 text-sm font-medium">
              Value
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium">
              Type
            </th>
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
            <th className="text-left py-3 px-4 text-sm font-medium">
              Tier
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {settings.map((setting) => (
            <tr
              key={setting.name}
              onClick={() => onViewDetails(setting)}
              className={`cursor-pointer transition-colors ${
                theme === 'light'
                  ? 'hover:bg-amber-50/50'
                  : 'hover:bg-yellow-500/10'
              }`}
            >
              {/* Name */}
              <td className="px-4 py-4">
                <span className={`font-mono text-sm ${
                  theme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  {setting.name}
                </span>
              </td>

              {/* Value */}
              <td className="px-4 py-4">
                <span className={`font-mono text-sm ${
                  theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {setting.value}
                </span>
              </td>

              {/* Type */}
              <td className="px-4 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  theme === 'light'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {setting.type}
                </span>
              </td>

              {/* Changed */}
              <td className="px-4 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  setting.changed === 1
                    ? theme === 'light'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30'
                    : theme === 'light'
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
                }`}>
                  {setting.changed === 1 ? 'Yes' : 'No'}
                </span>
              </td>

              {/* Server */}
              <td className="px-4 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                  setting.server
                    ? theme === 'light'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-amber-500/20 text-yellow-400 border-yellow-500/30'
                    : theme === 'light'
                      ? 'bg-gray-100 text-gray-600 border-gray-200'
                      : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
                }`}>
                  {setting.server ? 'Yes' : 'No'}
                </span>
              </td>

              {/* Tier */}
              <td className="px-4 py-4">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${getTierColor(setting.tier)}`}>
                  {setting.tier}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}