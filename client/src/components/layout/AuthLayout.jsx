// Adapted from Hirael Login 03 (MIT), Mohammad Shehadeh.
// https://github.com/MohammadShehadeh/hirael — references/hirael-login-03.txt
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './AuthLayout.css';

const jitter = (index) => {
  const value = Math.sin(index + 1) * 10_000;
  return value - Math.floor(value);
};

// Keep the reference's two sets of 36 curves and deterministic 20–30s durations.
// Normalized SVG path lengths let CSS reproduce the flow without a motion dependency.
function FloatingPaths({ position }) {
  return <svg className="auth-flow" fill="none" viewBox="0 0 696 316" aria-hidden="true" focusable="false">
    {Array.from({ length: 36 }, (_, i) => <path
      key={i}
      d={`M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`}
      pathLength="1"
      stroke="currentColor"
      strokeOpacity={0.1 + i * 0.03}
      strokeWidth={0.5 + i * 0.03}
      style={{ animationDuration: `${20 + jitter(i) * 10}s` }}
    />)}
  </svg>;
}

function AuthBrand({ className = '' }) {
  return <Link to="/" className={`auth-brand ${className}`} aria-label="formER home">
    {/* Existing formER authentication logo. */}
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h6" /><path d="M9 17h4" />
    </svg><span>formER</span>
  </Link>;
}

export const AuthLayout = ({ children, title, subtitle }) => (
  <section className="former-auth">
    <aside className="auth-aside">
      <div className="auth-paths" aria-hidden="true"><FloatingPaths position={1} /><FloatingPaths position={-1} /></div>
      <AuthBrand className="auth-enter" />
      <div className="auth-aside-copy auth-enter" style={{ animationDelay: '240ms' }}>
        <p>Your details.<br /><em>Ready for what’s next.</em></p>
        <span>Keep your information together.<br />Make a little less work of every application.</span>
      </div>
    </aside>
    <main className="auth-main">
      <Link to="/" className="auth-home auth-enter"><ChevronLeft size={16} aria-hidden="true" />Back to home</Link>
      <div className="auth-panel">
        <AuthBrand className="auth-mobile-brand auth-enter" />
        <header className="auth-heading">
          <h1 className="auth-enter" style={{ animationDelay: '60ms' }}>{title}</h1>
          <p className="auth-enter" style={{ animationDelay: '120ms' }}>{subtitle}</p>
        </header>
        {children}
      </div>
    </main>
  </section>
);
