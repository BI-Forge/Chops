import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AutocompleteSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allOptionLabel?: string;
}

export function AutocompleteSelect({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  allOptionLabel = 'All'
}: AutocompleteSelectProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = [allOptionLabel, ...options].filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const handleScroll = () => {
      if (isOpen && inputRef.current) {
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

  // Reset selected index when filtered options change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isOpen && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectOption(filteredOptions[selectedIndex]);
        } else if (filteredOptions.length > 0) {
          selectOption(filteredOptions[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
      }
    }
  };

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(-1);
  };

  const handleClear = () => {
    onChange(allOptionLabel);
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const displayValue = isOpen ? searchTerm : value;

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
          theme === 'light' ? 'text-gray-700' : 'text-gray-500'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            updatePosition();
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full ${
            theme === 'light'
              ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
              : 'bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-500 focus:border-yellow-500/50'
          } border rounded-lg pl-10 pr-10 py-2.5 focus:outline-none transition-colors`}
        />
        {value !== allOptionLabel && (
          <button
            onClick={handleClear}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
              theme === 'light'
                ? 'text-gray-400 hover:text-amber-600'
                : 'text-gray-500 hover:text-yellow-400'
            } transition-colors`}
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed rounded-lg border shadow-xl z-[9999] max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 ${
              theme === 'light'
                ? 'bg-white/95 border-gray-300'
                : 'bg-gray-900/95 border-yellow-500/20'
            } backdrop-blur-xl custom-scrollbar`}
            style={{
              top: `${position.top + 4}px`,
              left: `${position.left}px`,
              width: `${position.width}px`
            }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    theme === 'light' ? 'border-b border-gray-200' : 'border-b border-gray-800/30'
                  } last:border-b-0 ${
                    selectedIndex === index
                      ? theme === 'light'
                        ? 'bg-amber-500/10 text-amber-700 border-l-2 border-l-amber-500/50'
                        : 'bg-yellow-500/10 text-yellow-400 border-l-2 border-l-yellow-500/50'
                      : option === value
                        ? theme === 'light'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-yellow-500/10 text-yellow-400'
                        : theme === 'light'
                          ? 'text-gray-800 hover:bg-gray-100'
                          : 'text-gray-300 hover:bg-gray-800/40'
                  }`}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className={`px-4 py-2.5 text-sm ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                No results found
              </div>
            )}
          </div>,
          document.body
        )
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
    </div>
  );
}