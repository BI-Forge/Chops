import React from 'react';
import { XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, userName }: ConfirmDeleteModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[10000] flex items-center justify-center p-4 ${
        theme === 'light' ? 'bg-black/50' : 'bg-black/70'
      } backdrop-blur-sm`}
      onClick={onClose}
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
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-red-500/20 border-red-500/30'
            } border flex items-center justify-center`}>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
              }`}>
                Confirm Delete
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
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
        <div className="p-6">
          <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} text-center`}>
            Are you sure you want to delete user{' '}
            <span className={`font-semibold ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'}`}>
              {userName}
            </span>
            ?
          </p>
          <p className={`${theme === 'light' ? 'text-gray-600' : 'text-gray-500'} text-sm text-center mt-2`}>
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg border ${
              theme === 'light'
                ? 'bg-white hover:bg-gray-50 border-gray-300 hover:border-amber-500/40 text-gray-700 hover:text-amber-700'
                : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-700 hover:border-yellow-500/30 text-gray-300 hover:text-yellow-400'
            } transition-all duration-200 flex items-center gap-2 font-medium`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 rounded-lg ${
              theme === 'light'
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
            } transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl`}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
