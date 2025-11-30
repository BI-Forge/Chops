import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundPattern } from '../components/BackgroundPattern';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { ClickhouseOpsLogo } from '../components/ClickhouseOpsLogo';
import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { Shield, Zap, Activity, Sparkles, TrendingUp, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../services/AuthContext';
import { authAPI } from '../services/api';

export function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  if (!authLoading && isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (username: string, password: string) => {
    setError('');
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed';
      setError(errorMessage);
      throw err;
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    setError('');
    try {
      await authAPI.register({ username, email, password });
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw err;
    }
  };

  const features = [
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description: 'Monitor your ClickHouse cluster performance in real-time with detailed analytics and insights',
      gradient: 'from-amber-500 to-yellow-500',
      delay: '0s'
    },
    {
      icon: Zap,
      title: 'Performance Optimization',
      description: 'Automatic recommendations for query optimization and configuration to maximize performance',
      gradient: 'from-yellow-500 to-orange-500',
      delay: '0.1s'
    },
    {
      icon: Shield,
      title: 'Security & Control',
      description: 'Enterprise-level access management, action audit, and database security control',
      gradient: 'from-orange-500 to-amber-600',
      delay: '0.2s'
    }
  ];

  return (
    <div className={`h-screen relative overflow-hidden ${
      theme === 'light' 
        ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50' 
        : 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950'
    }`}>
      {/* Background Pattern */}
      <BackgroundPattern />
      <AnimatedBackground />
      
      {/* Content */}
      <div className="relative z-10 h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-page-enter overflow-auto">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16 items-center my-auto">
          
          {/* Left Side - Login/Register Form */}
          <div 
            className={`bg-gradient-to-br ${
              theme === 'light'
                ? 'from-white/90 via-white/85 to-white/90 border-amber-500/40 shadow-amber-500/20'
                : 'from-gray-900/80 via-gray-900/70 to-gray-900/80 border-yellow-500/30 shadow-yellow-500/10'
            } backdrop-blur-xl border rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 relative overflow-hidden animate-slide-in-left`}
          >
            
            <div className="relative z-10 w-full max-w-md mx-auto">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Tabs */}
              <div className="mb-8">
                <div className={`flex gap-2 ${
                  theme === 'light' ? 'bg-gray-100 border-gray-300' : 'bg-gray-800/60 border-gray-700/50'
                } p-1.5 rounded-xl border backdrop-blur-sm relative overflow-hidden`}>
                  {/* Animated tab indicator */}
                  <div 
                    className={`absolute h-[calc(100%-8px)] top-1 transition-all duration-300 ease-out bg-gradient-to-r ${
                      theme === 'light' 
                        ? 'from-amber-500 to-orange-500 shadow-amber-500/50' 
                        : 'from-amber-500 to-yellow-500 shadow-yellow-500/50'
                    } rounded-lg shadow-lg`}
                    style={{
                      width: 'calc(50% - 4px)',
                      left: activeTab === 'login' ? '4px' : 'calc(50% + 0px)',
                    }}
                  />
                  
                  <button
                    onClick={() => {
                      setActiveTab('login');
                      setError('');
                    }}
                    className={`relative z-10 flex-1 py-3 px-4 rounded-lg transition-all duration-300 ${
                      activeTab === 'login'
                        ? 'text-gray-900'
                        : (theme === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-gray-400 hover:text-gray-200')
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Lock className="w-4 h-4" />
                      Sign In
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('register');
                      setError('');
                    }}
                    className={`relative z-10 flex-1 py-3 px-4 rounded-lg transition-all duration-300 ${
                      activeTab === 'register'
                        ? 'text-gray-900'
                        : (theme === 'light' ? 'text-gray-700 hover:text-gray-900' : 'text-gray-400 hover:text-gray-200')
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Sign Up
                    </span>
                  </button>
                </div>
              </div>
              
              <div className="transition-all duration-300">
                {activeTab === 'login' ? (
                  <div className="animate-fade-in">
                    <LoginForm onLogin={handleLogin} />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <RegisterForm onRegister={handleRegister} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Logo and Features */}
          <div className="hidden lg:block space-y-6">
            {/* Logo Card */}
            <div 
              className={`bg-gradient-to-br ${
                theme === 'light'
                  ? 'from-white/90 via-white/85 to-white/90 border-amber-500/40 shadow-amber-500/20'
                  : 'from-gray-900/80 via-gray-900/70 to-gray-900/80 border-yellow-500/30 shadow-yellow-500/10'
              } backdrop-blur-xl border rounded-3xl shadow-2xl p-8 relative overflow-hidden group animate-slide-in-right`}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-yellow-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:via-yellow-500/5 group-hover:to-orange-500/5 transition-all duration-500 rounded-3xl" />
              
                {/* Shine effect on hover */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-shine"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
                  }}
                />

              <div className="relative z-10 text-center space-y-4">
                <div className="flex justify-center mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-yellow-500 blur-2xl opacity-20 animate-pulse" />
                  <div className="relative transform hover:scale-105 transition-transform duration-300">
                    <ClickhouseOpsLogo size="large" variant={theme === 'light' ? 'default' : 'dark'} />
                  </div>
                </div>
                
                <p className={`${theme === 'light' ? 'text-gray-700' : 'text-gray-400'} max-w-md mx-auto animate-fade-in`}>
                  Advanced monitoring and operations platform for ClickHouse database clusters
                </p>
              </div>
            </div>

            {/* Features Cards */}
            {features.map((feature, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${
                  theme === 'light'
                    ? 'from-white/80 via-white/75 to-white/80 border-amber-500/30 hover:border-amber-500/60'
                    : 'from-gray-900/60 via-gray-900/50 to-gray-900/60 border-yellow-500/20 hover:border-yellow-500/50'
                } backdrop-blur-xl border rounded-2xl p-6 transition-all duration-500 group cursor-default relative overflow-hidden animate-slide-in-right`}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{ 
                  animationDelay: `${parseFloat(feature.delay) + 0.15}s`,
                  transform: hoveredFeature === index ? 'translateX(8px) scale(1.02)' : 'translateX(0) scale(1)',
                }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-yellow-500/0 to-orange-500/0 group-hover:from-amber-500/10 group-hover:via-yellow-500/10 group-hover:to-orange-500/10 transition-all duration-500 rounded-2xl" />
                
                {/* Shine effect on hover */}
                <div 
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${
                    hoveredFeature === index ? 'animate-shine' : ''
                  }`}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
                  }}
                />
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40`}>
                    <feature.icon className="w-7 h-7 text-gray-900" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`${
                      theme === 'light' ? 'text-amber-700 group-hover:text-amber-800' : 'text-yellow-400 group-hover:text-yellow-300'
                    } mb-2 transition-colors duration-300 flex items-center gap-2`}>
                      {feature.title}
                      {hoveredFeature === index && (
                        <TrendingUp className="w-4 h-4 animate-bounce" />
                      )}
                    </h3>
                    <p className={`${
                      theme === 'light' ? 'text-gray-700 group-hover:text-gray-800' : 'text-gray-400 group-hover:text-gray-300'
                    } text-sm transition-colors duration-300 leading-relaxed`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`absolute bottom-2 sm:bottom-4 left-0 right-0 text-center ${theme === 'light' ? 'text-gray-700' : 'text-gray-500'} text-xs sm:text-sm z-10 px-4`}>
        <p className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <span>© 2024 Clickhouse OPS</span>
          <span className={`hidden sm:inline ${theme === 'light' ? 'text-amber-500/50' : 'text-yellow-500/50'}`}>•</span>
          <span className="hidden sm:inline">All rights reserved</span>
          <span className={theme === 'light' ? 'text-amber-500/50' : 'text-yellow-500/50'}>•</span>
          <span className="flex items-center gap-1">
            Powered by BI Forge LLC
          </span>
        </p>
      </div>
    </div>
  );
}
