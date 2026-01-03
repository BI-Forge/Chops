import React, { useState, useEffect } from 'react';
import { XCircle, Copy, Database } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CopyTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  table: { name: string } | null;
}

export function CopyTableModal({ isOpen, onClose, onConfirm, table }: CopyTableModalProps) {
  const { theme } = useTheme();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  // Initialize newName when table changes
  useEffect(() => {
    if (table) {
      setNewName(`${table.name}_copy`);
      setError('');
    }
  }, [table]);

  if (!isOpen || !table) return null;

  const handleConfirm = () => {
    if (!newName.trim()) {
      setError('Table name cannot be empty');
      return;
    }
    if (newName === table.name) {
      setError('New name must be different from original');
      return;
    }
    onConfirm(newName);
    setNewName(`${table.name}_copy`);
    setError('');
  };

  const handleClose = () => {
    setNewName(`${table.name}_copy`);
    setError('');
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm`}
      onClick={handleClose}
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      <div 
        className={`bg-gradient-to-br ${
          theme === 'light'
            ? 'from-white/95 to-gray-50/95 border-amber-500/30'
            : 'from-gray-900/95 to-gray-800/95 border-yellow-500/30'
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-md`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg ${
              theme === 'light'
                ? 'bg-amber-500/20 border-amber-500/30'
                : 'bg-yellow-500/20 border-yellow-500/30'
            } border flex items-center justify-center`}>
              <Database className={`w-6 h-6 ${
                theme === 'light' ? 'text-amber-600' : 'text-yellow-400'
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
              }`}>
                Copy Table
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`w-10 h-10 rounded-lg ${
              theme === 'light'
                ? 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300/50 hover:border-amber-500/30'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700/50 hover:border-yellow-500/30'
            } border transition-all duration-200 flex items-center justify-center group`}
          >
            <XCircle className={`w-5 h-5 ${
              theme === 'light' ? 'text-gray-700 group-hover:text-amber-700' : 'text-gray-400 group-hover:text-yellow-400'
            }`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
            Create a copy of table{' '}
            <span className={`font-semibold ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
              {table.name}
            </span>
          </p>
          
          <div>
            <label 
              htmlFor="newTableName" 
              className={`block text-sm font-medium mb-2 ${
                theme === 'light' ? 'text-gray-700' : 'text-gray-300'
              }`}
            >
              New Table Name
            </label>
            <input
              id="newTableName"
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm();
                }
              }}
              className={`w-full px-4 py-2.5 rounded-lg border ${
                error
                  ? 'border-red-500/50 focus:border-red-500'
                  : theme === 'light'
                    ? 'border-amber-500/30 focus:border-amber-500/50 bg-white text-gray-900'
                    : 'border-yellow-500/20 focus:border-yellow-500/40 bg-gray-800/50 text-gray-100'
              } focus:outline-none focus:ring-2 ${
                error
                  ? 'focus:ring-red-500/20'
                  : theme === 'light'
                    ? 'focus:ring-amber-500/20'
                    : 'focus:ring-yellow-500/20'
              } transition-all duration-200`}
              placeholder="Enter new table name"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <button
            onClick={handleClose}
            className={`px-6 py-2.5 rounded-lg border ${
              theme === 'light'
                ? 'bg-white hover:bg-gray-50 border-gray-300 hover:border-amber-500/40 text-gray-700 hover:text-amber-700'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700 hover:border-yellow-500/30 text-gray-300 hover:text-yellow-400'
            } transition-all duration-200 flex items-center gap-2 font-medium`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-6 py-2.5 rounded-lg ${
              theme === 'light'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-gray-900'
            } transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl`}
          >
            <Copy className="w-4 h-4" />
            Copy Table
          </button>
        </div>
      </div>
    </div>
  );
}