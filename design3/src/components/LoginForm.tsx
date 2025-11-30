import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, LogIn } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { CustomCheckbox } from './CustomCheckbox';

interface LoginFormProps {
  onLogin: (username: string, password: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate loading
    setTimeout(() => {
      onLogin(username, password);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username Input */}
        <div className="space-y-2 group">
          <label htmlFor="username" className={`${theme === 'light' ? 'text-gray-900 font-medium' : 'text-gray-300'} text-sm flex items-center gap-2`}>
            <User className={`w-4 h-4 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} group-focus-within:scale-110 transition-transform`} />
            Username
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white border-2 border-amber-600/50 text-gray-900 placeholder-gray-500 focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'bg-gray-800/60 border-yellow-500/30 text-gray-200 placeholder-gray-500 focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } border rounded-xl focus:outline-none focus:ring-4 transition-all duration-300`}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 to-yellow-500/0 group-focus-within:from-amber-500/5 group-focus-within:to-yellow-500/5 pointer-events-none transition-all duration-300" />
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2 group">
          <label htmlFor="password" className={`${theme === 'light' ? 'text-gray-900 font-medium' : 'text-gray-300'} text-sm flex items-center gap-2`}>
            <Lock className={`w-4 h-4 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} group-focus-within:scale-110 transition-transform`} />
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white border-2 border-amber-600/50 text-gray-900 placeholder-gray-500 focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'bg-gray-800/60 border-yellow-500/30 text-gray-200 placeholder-gray-500 focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } border rounded-xl focus:outline-none focus:ring-4 transition-all duration-300 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-400 hover:text-yellow-400'
              } transition-all duration-300 hover:scale-110`}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 to-yellow-500/0 group-focus-within:from-amber-500/5 group-focus-within:to-yellow-500/5 pointer-events-none transition-all duration-300" />
          </div>
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CustomCheckbox
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <span className={`${
              theme === 'light' ? 'text-gray-900' : 'text-gray-400'
            } text-sm transition-colors cursor-pointer`}
              onClick={() => setRememberMe(!rememberMe)}
            >
              Remember me
            </span>
          </div>
          <button
            type="button"
            className={`${
              theme === 'light' ? 'text-amber-700 hover:text-amber-800 font-medium' : 'text-yellow-400 hover:text-yellow-300'
            } text-sm transition-colors`}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="relative w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 rounded-xl transition-all duration-300 shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          
          <div className="relative z-10 flex items-center gap-2">
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-900/20 border-t-gray-900 rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span>Sign In</span>
              </>
            )}
          </div>
        </button>
      </form>
    </div>
  );
}
