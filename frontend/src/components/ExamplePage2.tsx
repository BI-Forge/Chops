import React from 'react';
import { BackgroundPattern } from './BackgroundPattern';
import { ClickhouseOpsLogo } from './ClickhouseOpsLogo';

export function ExamplePage2() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Фоновый паттерн */}
      <BackgroundPattern />
      
      {/* Контент страницы */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full">
          <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl p-8 border border-yellow-500/20 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <ClickhouseOpsLogo size="medium" variant="light" />
            </div>

            {/* Login form */}
            <h2 className="text-yellow-400 mb-6 text-center">Sign In</h2>
            
            <form className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  className="w-full bg-gray-800/80 border border-yellow-500/20 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full bg-gray-800/80 border border-yellow-500/20 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:border-yellow-500/50 transition-colors"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 py-3 rounded-lg hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg hover:shadow-yellow-500/20"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 text-center text-gray-400 text-sm">
              Forgot password? <a href="#" className="text-yellow-400 hover:text-yellow-300">Reset here</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
