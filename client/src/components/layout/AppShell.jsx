import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserRound, History, Settings2, MessageSquare, Menu, ChevronUp, LogOut, FileCheck2, Download, ArrowUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUnsaved } from '../../context/UnsavedContext.jsx';
import { useSmoothScrolling } from '../../hooks/useSmoothScrolling.js';
import { Dialog } from '../common/Dialog.jsx';
import { FloatingPathsBackground } from '../ui/floating-paths';
import LineSidebar from '../ui/LineSidebar.jsx';
import '../../styles/workspace.css';

const navigation = [
  ['/app', 'Dashboard', LayoutDashboard], ['/app/profile', 'My Information', UserRound],
  ['/app/history', 'History', History], ['/app/settings', 'Account Settings', Settings2], ['/app/report', 'Report', MessageSquare]
];
export function AppShell() {
  const { user, logout } = useAuth();
  const { confirm } = useUnsaved();
  const location = useLocation();
  const [mobile, setMobile] = useState(false);
  const [account, setAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const accountRef = useRef(null);
  const accountButton = useRef(null);
  const mainRef = useRef(null);
  const pageRef = useRef(null);
  const scroller = useSmoothScrolling();
  useEffect(() => { setMobile(false); setAccount(false); }, [location.pathname]);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: 'instant' });
    if (!window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches) return;
    const fade = pageRef.current?.animate?.(
      [{ opacity: .45, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 380, easing: 'cubic-bezier(.2,.65,.3,1)' },
    );
    return () => fade?.cancel();
  }, [location.pathname, scroller]);
  function backToTop() {
    mainRef.current?.focus({ preventScroll: true });
    if (scroller.current) {
      scroller.current.scrollTo(0);
      return;
    }
    const smooth = window.matchMedia?.('(prefers-reduced-motion: no-preference)').matches;
    window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'instant' });
  }
  useEffect(() => {
    const outside = (event) => { if (!accountRef.current?.contains(event.target)) setAccount(false); };
    const escape = (event) => { if (event.key === 'Escape') { setAccount(false); accountButton.current?.focus(); } };
    if (account) { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape); }
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [account]);
  const signOut = () => confirm(async () => {
    setBusy(true); setError(''); setMobile(false);
    try { await logout(); } catch { setError('We couldn’t sign you out. Please try again.'); }
    finally { setBusy(false); }
  });
  const nav = <nav className="workspace-nav" aria-label="Main navigation">{navigation.map(([to, label, Icon]) =>
    <NavLink key={to} to={to} end={to === '/app'}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav>;
  return <div className="workspace">
    <a className="workspace-skip" href="#workspace-main">Skip to content</a>
    <aside className="workspace-sidebar">
      <Link className="workspace-brand" to="/app"><span className="brand-symbol"><FileCheck2 size={22} /></span>formER</Link>
      <LineSidebar items={navigation} />
      <div className="sidebar-bottom">
        <div className="account-wrap" ref={accountRef}>
          {account && <div className="account-popover"><p>Signed in as<strong>{user?.email}</strong></p>
            <Link to="/app/settings"><Settings2 size={16} />Account settings</Link>
            <button onClick={signOut} disabled={busy}><LogOut size={16} />{busy ? 'Signing out…' : 'Sign out'}</button></div>}
          <button ref={accountButton} className="account-button" aria-label="Account menu" aria-expanded={account} onClick={() => setAccount(!account)}>
            <span className="account-avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</span><span><strong>Your account</strong><small>{user?.email}</small></span><ChevronUp size={16} /></button>
        </div>
      </div>
    </aside>
    <div className="workspace-body">
      <header className="workspace-topbar">
        <div className="mobile-brand"><FileCheck2 size={20} /><span>formER</span></div>
        <Link className="app-button workspace-extension-link" to="/extension"><Download size={16} aria-hidden="true" />Download extension</Link>
        <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={22} /></button>
      </header>
      <main ref={mainRef} id="workspace-main" className="workspace-main relative isolate" tabIndex={-1}>
        <FloatingPathsBackground className="pointer-events-none absolute inset-0 -z-10" position={-1} />
        {error && <div className="form-alert" role="alert">{error}<button onClick={signOut}>Try again</button></div>}
        <div ref={pageRef}><Outlet /></div>
      </main>
      <footer className="workspace-footer">
        <button className="workspace-back-to-top" type="button" onClick={backToTop}>Back to top <ArrowUp size={14} aria-hidden="true" /></button>
      </footer>
    </div>
    {mobile && <Dialog title="Your workspace" onClose={() => setMobile(false)}>{nav}
      <div className="mobile-account"><p>{user?.email}</p><button className="app-button secondary" disabled={busy} onClick={signOut}><LogOut size={16} />Sign out</button></div>
    </Dialog>}
  </div>;
}
