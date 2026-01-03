import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (valueToAdd?: string) => void;
  suggestions: string[];
  placeholder: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function AutocompleteInput({
  value,
  onChange,
  onAdd,
  suggestions,
  placeholder,
  onKeyDown,
}: AutocompleteInputProps) {
  const { theme } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Reset selected index when value or suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
    // Don't auto-show suggestions, only show on focus
  }, [value, suggestions.length]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Trigger add after a short delay to allow state update
    setTimeout(() => {
      onAdd(suggestion);
    }, 10);
  };

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
        onClick={onAdd}
        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
          theme === 'light'
            ? 'text-gray-400 hover:text-amber-500'
            : 'text-gray-500 hover:text-yellow-500'
        }`}
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 max-h-60 overflow-y-auto ${
            theme === 'light'
              ? 'bg-white border-amber-500/30'
              : 'bg-gray-800 border-yellow-500/30'
          }`}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
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
      )}
    </div>
  );
}