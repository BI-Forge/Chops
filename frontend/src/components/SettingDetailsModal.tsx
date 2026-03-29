import { useEffect } from 'react';
import { XCircle, Settings, Info, Shield, Lock, Tag, FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Setting } from './SettingsTable';

interface SettingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  setting: Setting | null;
  /** When true, shows a loading state in the modal body */
  detailLoading?: boolean;
}

export function SettingDetailsModal({
  isOpen,
  onClose,
  setting,
  detailLoading = false,
}: SettingDetailsModalProps) {
  const { theme } = useTheme();

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !setting) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${
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
        } backdrop-blur-xl border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col`}
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
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gradient-to-br from-amber-500 to-yellow-600'
            } flex items-center justify-center`}>
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${
                theme === 'light' ? 'text-amber-700' : 'text-yellow-400'
              }`}>
                {setting.name}
              </h2>
              <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-sm mt-0.5`}>
                Setting Details
              </p>
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
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar relative">
          {detailLoading && (
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center ${
                theme === 'light' ? 'bg-white/60' : 'bg-gray-900/60'
              } backdrop-blur-[2px]`}
            >
              <span className={`text-sm ${theme === 'light' ? 'text-amber-800' : 'text-yellow-300'}`}>
                Loading details…
              </span>
            </div>
          )}
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Info className="w-5 h-5" />
                <h3 className="font-semibold">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Settings className="w-4 h-4" />
                    Name
                  </label>
                  <input
                    type="text"
                    value={setting.name}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>

                {/* Value */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <FileText className="w-4 h-4" />
                    Value
                  </label>
                  <input
                    type="text"
                    value={setting.value}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>

                {/* Type */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <Tag className="w-4 h-4" />
                    Type
                  </label>
                  <input
                    type="text"
                    value={setting.type}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm cursor-not-allowed`}
                  />
                </div>

                {/* Default */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2`}>
                    <FileText className="w-4 h-4" />
                    Default Value
                  </label>
                  <input
                    type="text"
                    value={setting.default}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold">Constraints</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Min Value */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Min Value
                  </label>
                  <input
                    type="text"
                    value={setting.min || 'No minimum'}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>

                {/* Max Value */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Max Value
                  </label>
                  <input
                    type="text"
                    value={setting.max || 'No maximum'}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>

                {/* Readonly */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4 flex items-center`}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={setting.readonly === 1}
                      disabled
                      className="w-5 h-5 rounded border-gray-300 text-amber-500 opacity-50 cursor-not-allowed"
                    />
                    <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                      <Lock className="w-4 h-4" />
                      Readonly
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Meta Information */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <Tag className="w-5 h-5" />
                <h3 className="font-semibold">Meta Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tier */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Tier
                  </label>
                  <input
                    type="text"
                    value={setting.tier}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm cursor-not-allowed`}
                  />
                </div>

                {/* Alias For */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4`}>
                  <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm mb-2 block`}>
                    Alias For
                  </label>
                  <input
                    type="text"
                    value={setting.alias_for || 'No alias'}
                    disabled
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'light'
                        ? 'bg-gray-100 border-gray-300 text-gray-500'
                        : 'bg-gray-800/50 border-gray-700 text-gray-500'
                    } text-sm font-mono cursor-not-allowed`}
                  />
                </div>

                {/* Changed */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4 flex items-center`}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={setting.changed === 1}
                      disabled
                      className="w-5 h-5 rounded border-gray-300 text-amber-500 opacity-50 cursor-not-allowed"
                    />
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                      Changed from default
                    </div>
                  </label>
                </div>

                {/* Is Obsolete */}
                <div className={`${
                  theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
                } border rounded-xl p-4 flex items-center`}>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={setting.is_obsolete === 1}
                      disabled
                      className="w-5 h-5 rounded border-gray-300 text-amber-500 opacity-50 cursor-not-allowed"
                    />
                    <div className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm`}>
                      Is Obsolete
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className={`flex items-center gap-2 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} mb-4`}>
                <FileText className="w-5 h-5" />
                <h3 className="font-semibold">Description</h3>
              </div>
              <div className={`${
                theme === 'light' ? 'bg-gray-100/50 border-gray-300/50' : 'bg-gray-800/30 border-gray-700/50'
              } border rounded-xl p-4`}>
                <div
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'light'
                      ? 'bg-gray-100 border-gray-300 text-gray-600'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400'
                  } text-sm whitespace-pre-wrap break-words`}
                >
                  {setting.description || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
