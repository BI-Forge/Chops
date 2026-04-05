import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface AdminRoleSelectOption {
  id: number;
  name: string;
}

interface AdminRoleSelectInputProps {
  value: number;
  onChange: (roleId: number) => void;
  options: AdminRoleSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/** Searchable role picker styled like CascadingAutocompleteSelect (Access Path fields). */
export function AdminRoleSelectInput({
  value,
  onChange,
  options,
  placeholder = 'Select role',
  disabled = false,
  'aria-label': ariaLabel = 'Assign role',
}: AdminRoleSelectInputProps) {
  const { theme } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validOptions = (options || []).filter((o) => o && typeof o.name === 'string');
  const filteredOptions = validOptions.filter((o) =>
    o.name.toLowerCase().includes((searchValue || '').toLowerCase())
  );

  const selectedName = validOptions.find((o) => o.id === value)?.name ?? '';

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSearchValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showDropdown) {
      setSearchValue('');
    }
  }, [value, showDropdown]);

  const selectOption = (opt: AdminRoleSelectOption) => {
    onChange(opt.id);
    setShowDropdown(false);
    setSearchValue('');
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectOption(filteredOptions[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDropdown(false);
        setSearchValue('');
      }
    }
  };

  const handleFocus = () => {
    if (!disabled) {
      setShowDropdown(true);
      setSearchValue('');
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          aria-label={ariaLabel}
          value={showDropdown ? searchValue : selectedName}
          onChange={(e) => {
            setSearchValue(e.target.value);
            if (!showDropdown) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-8 rounded-lg border text-sm ${
            disabled
              ? theme === 'light'
                ? 'bg-gray-100 border-gray-300 text-gray-400 placeholder-gray-300 cursor-not-allowed'
                : 'bg-gray-900/30 border-gray-700 text-gray-600 placeholder-gray-700 cursor-not-allowed'
              : theme === 'light'
                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
                : 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
          } focus:outline-none transition-colors`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showDropdown ? 'rotate-180' : ''
            } ${
              disabled
                ? 'text-gray-300'
                : theme === 'light'
                  ? 'text-gray-400'
                  : 'text-gray-500'
            }`}
            aria-hidden
          />
        </div>
      </div>

      {showDropdown && !disabled && (
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-[10000] max-h-60 overflow-y-auto custom-scrollbar ${
            theme === 'light' ? 'bg-white border-amber-500/30' : 'bg-gray-800 border-yellow-500/30'
          }`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  selectedIndex === index
                    ? theme === 'light'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-yellow-500/20 text-yellow-300'
                    : value === opt.id
                      ? theme === 'light'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-yellow-500/10 text-yellow-400'
                      : theme === 'light'
                        ? 'text-gray-700 hover:bg-amber-50'
                        : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {opt.name}
              </button>
            ))
          ) : (
            <div
              className={`px-3 py-2 text-sm text-center ${
                theme === 'light' ? 'text-gray-500' : 'text-gray-600'
              }`}
            >
              No roles found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
