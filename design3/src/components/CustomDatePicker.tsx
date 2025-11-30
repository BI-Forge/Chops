import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showTime?: boolean;
}

export function CustomDatePicker({ value, onChange, placeholder = 'Select date', showTime = false }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  // Parse value to get date and time
  const parseDateTime = (val: string) => {
    if (!val) return { date: '', time: '00:00' };
    
    // Check if value contains time
    if (val.includes('T') || val.includes(' ')) {
      const [datePart, timePart] = val.split(/[T ]/);
      return {
        date: datePart,
        time: timePart ? timePart.substring(0, 5) : '00:00'
      };
    }
    
    return { date: val, time: '00:00' };
  };

  const { date: selectedDateStr, time: selectedTime } = parseDateTime(value);
  const [time, setTime] = useState(selectedTime);

  // Update time when value changes
  useEffect(() => {
    const { time: newTime } = parseDateTime(value);
    setTime(newTime);
  }, [value]);

  // Current viewing month
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDateStr) {
      return new Date(selectedDateStr + 'T00:00:00');
    }
    return new Date();
  });

  const selectedDate = selectedDateStr ? new Date(selectedDateStr + 'T00:00:00') : null;

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = showTime ? 450 : 380;

        setPosition({
          top: spaceBelow >= dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, showTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const formatDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const dateFormatted = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (showTime && timeStr) {
      return `${dateFormatted} ${timeStr}`;
    }
    
    return dateFormatted;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const handleDateSelect = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    
    if (showTime) {
      onChange(`${dateStr}T${time}`);
    } else {
      onChange(dateStr);
    }
    
    if (!showTime) {
      setIsOpen(false);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (selectedDateStr) {
      onChange(`${selectedDateStr}T${newTime}`);
    }
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setTime('00:00');
  };

  const handleToday = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    
    if (showTime) {
      setTime(currentTime);
      onChange(`${dateStr}T${currentTime}`);
    } else {
      onChange(dateStr);
    }
    
    setIsOpen(false);
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(viewDate);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  const renderCalendar = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const today = isToday(day);
      const selected = isSelected(day);
      
      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
          className={`aspect-square rounded-lg transition-all duration-200 relative group ${
            selected
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 shadow-lg scale-105'
              : today
                ? theme === 'light'
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : theme === 'light'
                  ? 'text-gray-700 hover:bg-amber-50'
                  : 'text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <span className="relative z-10">{day}</span>
          {today && !selected && (
            <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full ${
              theme === 'light' ? 'bg-amber-600' : 'bg-yellow-400'
            }`} />
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
          isOpen
            ? theme === 'light'
              ? 'border-amber-500/50 bg-amber-50 shadow-sm'
              : 'border-yellow-500/50 bg-gray-700/30 shadow-lg shadow-yellow-500/5'
            : theme === 'light'
              ? 'border-gray-300 bg-white hover:border-amber-500/50'
              : 'border-gray-700/50 bg-gray-800/50 hover:border-yellow-500/30'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showTime ? (
            <Clock className={`w-4 h-4 flex-shrink-0 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-400'
            }`} />
          ) : (
            <Calendar className={`w-4 h-4 flex-shrink-0 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-400'
            }`} />
          )}
          <span className={`truncate ${
            value 
              ? theme === 'light' ? 'text-gray-800' : 'text-white'
              : theme === 'light' ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {value ? formatDateTime(selectedDateStr, time) : placeholder}
          </span>
        </div>
        {value && (
          <button
            onClick={handleClear}
            className={`p-0.5 rounded hover:bg-gray-200/50 transition-colors flex-shrink-0 ${
              theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-400 hover:text-yellow-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed z-[9999] rounded-xl border backdrop-blur-md shadow-xl animate-fade-in ${
              theme === 'light'
                ? 'bg-white/95 border-amber-500/30'
                : 'bg-gray-800/95 border-yellow-500/20'
            }`}
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: '320px',
            }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}>
              <button
                onClick={handlePrevMonth}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  theme === 'light'
                    ? 'hover:bg-amber-100 text-gray-700 hover:text-amber-700'
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className={theme === 'light' ? 'text-gray-800' : 'text-white'}>
                {monthNames[month]} {year}
              </div>
              
              <button
                onClick={handleNextMonth}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  theme === 'light'
                    ? 'hover:bg-amber-100 text-gray-700 hover:text-amber-700'
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-yellow-400'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar */}
            <div className="p-4">
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className={`text-center text-xs ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Time Picker */}
            {showTime && (
              <div className={`px-4 pb-3 border-t ${
                theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
              }`}>
                <div className="pt-3">
                  <label className={`block text-sm mb-2 ${
                    theme === 'light' ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    Time
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => handleTimeChange(e.target.value)}
                      className={`flex-1 px-3 py-2 rounded-lg border transition-all duration-200 ${
                        theme === 'light'
                          ? 'bg-white border-gray-300 text-gray-800 focus:border-amber-500 focus:outline-none'
                          : 'bg-gray-700/50 border-gray-600 text-white focus:border-yellow-500 focus:outline-none'
                      }`}
                    />
                    <button
                      onClick={() => {
                        const now = new Date();
                        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                        handleTimeChange(currentTime);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        theme === 'light'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-500/30'
                          : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer with quick actions */}
            <div className={`flex items-center gap-2 p-3 border-t ${
              theme === 'light' ? 'border-amber-500/20' : 'border-yellow-500/20'
            }`}>
              <button
                onClick={handleToday}
                className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                  theme === 'light'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-500/30'
                    : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                }`}
              >
                {showTime ? 'Now' : 'Today'}
              </button>
              {value && (
                <button
                  onClick={() => {
                    onChange('');
                    setTime('00:00');
                    setIsOpen(false);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    theme === 'light'
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      : 'bg-gray-700/50 hover:bg-gray-700 text-gray-400 border border-gray-600'
                  }`}
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
