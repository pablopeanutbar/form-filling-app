import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-former-canvas-muted px-4 py-8 sm:py-12">
      {/* Top Brand Header */}
      <div className="w-full max-w-[440px] mx-auto text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-white shadow-sm mb-4">
          {/* formER Icon */}
          <svg
            className="w-7 h-7"
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
        <h1 className="text-2xl font-semibold tracking-tight text-former-text">formER</h1>
        <p className="text-[14px] text-former-text-secondary mt-1">Intelligent form filling platform</p>
      </div>

      {/* Main Form Container */}
      <main className="w-full max-w-[440px] mx-auto">
        {(title || subtitle) && (
          <div className="text-center mb-6">
            {title && <h2 className="text-xl font-semibold text-former-text">{title}</h2>}
            {subtitle && <p className="text-[14px] text-former-text-secondary mt-1.5">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {/* Security & System Trust Footer */}
      <footer className="w-full max-w-[440px] mx-auto text-center mt-8 pt-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-former-text-muted">
          <ShieldCheck className="w-3.5 h-3.5 text-former-success" />
          <span>Secure HttpOnly cookie session &bull; CSRF protected</span>
        </div>
      </footer>
    </div>
  );
};
