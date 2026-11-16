import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../common/Button.jsx';
import { LogOut, User, CheckCircle2 } from 'lucide-react';

export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error('Failed to log out:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-former-canvas">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-former-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link to="/app" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M9 13h6" />
                <path d="M9 17h4" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-former-text">formER</span>
          </Link>

          {/* User Status & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-former-canvas-muted rounded-full border border-former-border">
              <User className="w-3.5 h-3.5 text-former-text-secondary" />
              <span className="text-xs font-medium text-former-text">{user?.email}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-former-success pl-1 border-l border-former-border">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={LogOut}
              isLoading={isLoggingOut}
              onClick={handleLogout}
              aria-label="Sign out of formER"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
};
