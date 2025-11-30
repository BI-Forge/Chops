import React from 'react';
import { Check } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function CustomCheckbox({ checked, onChange, onClick }: CustomCheckboxProps) {
  const { theme } = useTheme();
  
  return (
    <label 
      className="flex items-center cursor-pointer group" 
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <div 
        className={`
          w-4 h-4 rounded border transition-all duration-200
          ${checked 
            ? (theme === 'light' 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10' 
                : 'bg-yellow-500/10 border-yellow-500/40 shadow-sm shadow-yellow-500/10')
            : (theme === 'light' 
                ? 'bg-white border-gray-300 group-hover:border-amber-500/40 group-hover:bg-amber-50/30' 
                : 'bg-gray-800/40 border-gray-600/30 group-hover:border-yellow-500/20 group-hover:bg-gray-800/60')
          }
          flex items-center justify-center
        `}
      >
        {checked && (
          <Check className={`w-3 h-3 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400/90'}`} strokeWidth={2.5} />
        )}
      </div>
    </label>
  );
}
