import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

interface AccountButtonProps {
  onOpenPremium: () => void;
}

export default function AccountButton({ onOpenPremium }: AccountButtonProps) {
  const { user, signOut, isLoading } = useAuthContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
    );
  }

  if (!user) {
    // Not logged in - show sign in button
    return (
      <button
        onClick={onOpenPremium}
        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="hidden sm:inline font-medium">Sign In</span>
      </button>
    );
  }

  // Logged in - show profile menu
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username || 'Profile'}
            className="w-9 h-9 rounded-full border-2 border-white shadow-md"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user.email[0].toUpperCase()}
          </div>
        )}
        {user.isPremium && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shadow">
            ★
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username || 'Profile'}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {user.email[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {user.username || user.email.split('@')[0]}
                </p>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            {user.isPremium && (
              <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                <span>★</span> Premium Member
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpenPremium();
              }}
              className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <span className="text-lg">⭐</span>
              <span>{user.isPremium ? 'Premium Features' : 'Upgrade to Premium'}</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut();
              }}
              className="w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
