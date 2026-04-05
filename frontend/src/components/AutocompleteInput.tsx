import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (valueToAdd?: string) => void;
  suggestions: string[];
  placeholder: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Render suggestions in a body portal with fixed position (avoids overflow clipping in modals). */
  useBodyPortal?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onAdd,
  suggestions,
  placeholder,
  onKeyDown,
  useBodyPortal = false,
}: AutocompleteInputProps) {
  const { theme } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value, suggestions.length]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setShowSuggestions(false);
      return;
    }
    if (inputRef.current && document.activeElement === inputRef.current) {
      setShowSuggestions(true);
    }
  }, [suggestions]);

  useEffect(() => {
    if (!useBodyPortal || !showSuggestions) return;
    updateDropdownPosition();
    const handler = () => updateDropdownPosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [useBodyPortal, showSuggestions, updateDropdownPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(t) &&
        inputRef.current &&
        !inputRef.current.contains(t)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setTimeout(() => {
      onAdd(suggestion);
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const suggestionListClass =
    theme === 'light'
      ? 'bg-white border-amber-500/30'
      : 'bg-gray-800 border-yellow-500/30';

  const suggestionsDropdown = showSuggestions && suggestions.length > 0 && (
    <div
      ref={suggestionsRef}
      className={`rounded-lg border shadow-lg max-h-60 overflow-y-auto custom-scrollbar ${suggestionListClass} ${
        useBodyPortal ? 'fixed z-[10050]' : 'absolute top-full left-0 right-0 mt-1 z-50'
      }`}
      style={
        useBodyPortal
          ? {
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
              width: `${dropdownPos.width}px`,
            }
          : undefined
      }
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectSuggestion(suggestion)}
          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
            selectedIndex === index
              ? theme === 'light'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-yellow-500/20 text-yellow-300'
              : theme === 'light'
                ? 'text-gray-700 hover:bg-amber-50'
                : 'text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
            if (useBodyPortal) {
              updateDropdownPosition();
            }
          }
        }}
        placeholder={placeholder}
        className={`w-full px-3 py-2 pr-10 rounded-lg border ${
          theme === 'light'
            ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-amber-500/50'
            : 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-yellow-500/50'
        } focus:outline-none transition-colors text-sm`}
      />
      <button
        type="button"
        onClick={() => onAdd(value)}
        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
          theme === 'light'
            ? 'text-gray-400 hover:text-amber-500'
            : 'text-gray-500 hover:text-yellow-500'
        }`}
        aria-label="Add"
      >
        <Plus className="w-4 h-4" />
      </button>

      {useBodyPortal && suggestionsDropdown
        ? createPortal(suggestionsDropdown, document.body)
        : suggestionsDropdown}
    </div>
  );
}
