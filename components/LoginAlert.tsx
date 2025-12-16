'use client';

import { X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface LoginAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export default function LoginAlert({ isOpen, onClose, onLogin }: LoginAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div 
        className={`bg-gray-900 border-2 border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 p-6 max-w-md w-full mx-4 transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Login Required</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-cyan-200/80 mb-6 leading-relaxed">
          You need to login to access the AI features. Please sign in or create an account to continue.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onLogin}
            className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/50"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}

