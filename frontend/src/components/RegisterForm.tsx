import { useState } from 'react';
import { Lock, Mail, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { CustomCheckbox } from './CustomCheckbox';

interface RegisterFormProps {
  onRegister: (username: string, email: string, password: string) => Promise<void>;
}

export function RegisterForm({ onRegister }: RegisterFormProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!agreeToTerms) {
      // Show error but don't block - just highlight the checkbox
      return;
    }

    setIsLoading(true);
    
    try {
      await onRegister(username, email, password);
      // Success - parent component will handle navigation
    } catch (err: any) {
      // Error handling is done in parent component
      // But we can show field-specific errors if needed
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
      if (errorMessage) {
        if (errorMessage.toLowerCase().includes('username')) {
          setErrors({ ...errors, username: errorMessage });
        } else if (errorMessage.toLowerCase().includes('email')) {
          setErrors({ ...errors, email: errorMessage });
        } else if (errorMessage.toLowerCase().includes('password')) {
          setErrors({ ...errors, password: errorMessage });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
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
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors(prev => ({ ...prev, username: undefined }));
              }}
              placeholder="johndoe"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white text-gray-900 placeholder-gray-500'
                  : 'bg-gray-800/60 text-gray-200 placeholder-gray-500'
              } ${
                errors.username 
                  ? 'border-2 border-red-500/60' 
                  : (theme === 'light' ? 'border-2 border-amber-600/50' : 'border border-yellow-500/30')
              } rounded-xl focus:outline-none ${
                theme === 'light'
                  ? 'focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } focus:ring-4 transition-all duration-300`}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 to-yellow-500/0 group-focus-within:from-amber-500/5 group-focus-within:to-yellow-500/5 pointer-events-none transition-all duration-300" />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
          </div>
        </div>

        {/* Email Input */}
        <div className="space-y-2 group">
          <label htmlFor="reg-email" className={`${theme === 'light' ? 'text-gray-900 font-medium' : 'text-gray-300'} text-sm flex items-center gap-2`}>
            <Mail className={`w-4 h-4 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} group-focus-within:scale-110 transition-transform`} />
            Email
          </label>
          <div className="relative">
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors(prev => ({ ...prev, email: undefined }));
              }}
              placeholder="john.doe@example.com"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white text-gray-900 placeholder-gray-500'
                  : 'bg-gray-800/60 text-gray-200 placeholder-gray-500'
              } ${
                errors.email 
                  ? 'border-2 border-red-500/60' 
                  : (theme === 'light' ? 'border-2 border-amber-600/50' : 'border border-yellow-500/30')
              } rounded-xl focus:outline-none ${
                theme === 'light'
                  ? 'focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } focus:ring-4 transition-all duration-300`}
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 to-yellow-500/0 group-focus-within:from-amber-500/5 group-focus-within:to-yellow-500/5 pointer-events-none transition-all duration-300" />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Password Input */}
        <div className="space-y-2 group">
          <label htmlFor="reg-password" className={`${theme === 'light' ? 'text-gray-900 font-medium' : 'text-gray-300'} text-sm flex items-center gap-2`}>
            <Lock className={`w-4 h-4 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} group-focus-within:scale-110 transition-transform`} />
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors(prev => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white text-gray-900 placeholder-gray-500'
                  : 'bg-gray-800/60 text-gray-200 placeholder-gray-500'
              } ${
                errors.password 
                  ? 'border-2 border-red-500/60' 
                  : (theme === 'light' ? 'border-2 border-amber-600/50' : 'border border-yellow-500/30')
              } rounded-xl focus:outline-none ${
                theme === 'light'
                  ? 'focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } focus:ring-4 transition-all duration-300 pr-12`}
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
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="space-y-2 group">
          <label htmlFor="confirm-password" className={`${theme === 'light' ? 'text-gray-900 font-medium' : 'text-gray-300'} text-sm flex items-center gap-2`}>
            <Lock className={`w-4 h-4 ${theme === 'light' ? 'text-amber-700' : 'text-yellow-400'} group-focus-within:scale-110 transition-transform`} />
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors(prev => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder="••••••••"
              required
              className={`w-full px-4 py-3 ${
                theme === 'light'
                  ? 'bg-white text-gray-900 placeholder-gray-500'
                  : 'bg-gray-800/60 text-gray-200 placeholder-gray-500'
              } ${
                errors.confirmPassword 
                  ? 'border-2 border-red-500/60' 
                  : (theme === 'light' ? 'border-2 border-amber-600/50' : 'border border-yellow-500/30')
              } rounded-xl focus:outline-none ${
                theme === 'light'
                  ? 'focus:border-amber-600 focus:ring-amber-500/30 focus:bg-white hover:border-amber-600/70'
                  : 'focus:border-yellow-500/80 focus:ring-yellow-500/20 focus:bg-gray-800/80 hover:border-yellow-500/50'
              } focus:ring-4 transition-all duration-300 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                theme === 'light' ? 'text-gray-700 hover:text-amber-700' : 'text-gray-400 hover:text-yellow-400'
              } transition-all duration-300 hover:scale-110`}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/0 to-yellow-500/0 group-focus-within:from-amber-500/5 group-focus-within:to-yellow-500/5 pointer-events-none transition-all duration-300" />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start gap-2">
          <div className="mt-0.5">
            <CustomCheckbox
              checked={agreeToTerms}
              onChange={() => setAgreeToTerms(!agreeToTerms)}
            />
          </div>
          <label
            htmlFor="terms"
            className={`${theme === 'light' ? 'text-gray-900' : 'text-gray-400'} text-sm cursor-pointer`}
            onClick={() => setAgreeToTerms(!agreeToTerms)}
          >
            I agree to the{' '}
            <button type="button" className={`${theme === 'light' ? 'text-amber-700 hover:text-amber-800 font-medium' : 'text-yellow-400 hover:text-yellow-300'} transition-colors`}>
              Terms and Conditions
            </button>
            {' '}and{' '}
            <button type="button" className={`${theme === 'light' ? 'text-amber-700 hover:text-amber-800 font-medium' : 'text-yellow-400 hover:text-yellow-300'} transition-colors`}>
              Privacy Policy
            </button>
          </label>
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Create Account</span>
              </>
            )}
          </div>
        </button>
      </form>
    </div>
  );
}
