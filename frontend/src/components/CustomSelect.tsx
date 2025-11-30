import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[] | Option[];
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
}

export function CustomSelect({ value, onChange, options, icon: Icon, label }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Normalize options to always be Option[]
  const normalizedOptions: Option[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as HTMLElement) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as HTMLElement)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen && buttonRef.current) {
        updatePosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {label ? (
        // Inline mode with label and icon
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`${theme === 'light' ? 'text-amber-600' : 'text-yellow-400'} flex-shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <label className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} text-sm whitespace-nowrap`}>{label}</label>
          
          <div className="relative min-w-[180px]">
            {/* Select Button */}
            <button
              ref={buttonRef}
              onClick={handleToggle}
              className={`w-full appearance-none ${
                theme === 'light' 
                  ? 'bg-white border-gray-300 text-gray-800 focus:border-amber-500/50 hover:border-amber-500/40' 
                  : 'bg-gray-800/50 border-gray-700/50 text-white focus:border-yellow-500/50 hover:border-yellow-500/30'
              } border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all cursor-pointer text-left`}
            >
              {selectedOption?.label}
            </button>
            
            {/* Arrow Icon */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>
      ) : (
        // Block mode without label
        <div className="relative w-full">
          {/* Select Button */}
          <button
            ref={buttonRef}
            onClick={handleToggle}
            className={`w-full appearance-none ${
              theme === 'light' 
                ? 'bg-white border-gray-300 text-gray-800 focus:border-amber-500/50 hover:border-amber-500/40' 
                : 'bg-gray-800/50 border-gray-700/50 text-white focus:border-yellow-500/50 hover:border-yellow-500/30'
            } border rounded-lg px-4 py-2.5 text-sm focus:outline-none transition-all cursor-pointer text-left`}
          >
            {selectedOption?.label}
          </button>
          
          {/* Arrow Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown className={`w-4 h-4 ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      )}

      {/* Dropdown Menu - Portal */}
      {isOpen && createPortal(
          <div 
            ref={dropdownRef}
            className={`fixed ${
              theme === 'light' 
                ? 'bg-white/95 border-gray-300' 
                : 'bg-gray-900/95 border-yellow-500/20'
            } backdrop-blur-xl border rounded-lg shadow-xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-top-1 duration-150`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              {normalizedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    theme === 'light' ? 'border-b border-gray-200' : 'border-b border-gray-800/30'
                  } last:border-b-0 ${
                    option.value === value
                      ? (theme === 'light' 
                          ? 'bg-amber-500/10 text-amber-700 border-l-2 border-l-amber-500/50' 
                          : 'bg-yellow-500/10 text-yellow-400 border-l-2 border-l-yellow-500/50')
                      : (theme === 'light' 
                          ? 'text-gray-800 hover:bg-gray-100' 
                          : 'text-gray-300 hover:bg-gray-800/40')
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>,
        document.body
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 191, 36, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 191, 36, 0.5);
        }
      `}</style>
    </>
  );
}
