import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, UserRound, History, Settings2, MessageSquare, Menu, ChevronUp, LogOut, ArrowUpRight, FileCheck2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useUnsaved } from '../../context/UnsavedContext.jsx';
import { Dialog } from '../common/Dialog.jsx';
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
  useEffect(() => { setMobile(false); setAccount(false); window.scrollTo(0, 0); }, [location.pathname]);
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
      <p className="sidebar-caption">Your workspace</p>{nav}
      <div className="sidebar-bottom">
        <Link className="website-link" to="/">Visit formER <ArrowUpRight size={16} /></Link>
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
      <div className="workspace-topbar"><div className="mobile-brand"><FileCheck2 size={20} /><span>formER</span></div>
        <span className="topbar-caption">A little less typing. A little more living.</span>
        <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobile(true)}><Menu size={22} /></button>
        <span className="topbar-private"><UserRound size={15} />Personal workspace</span></div>
      <main id="workspace-main" className="workspace-main" tabIndex={-1}>
        {error && <div className="form-alert" role="alert">{error}<button onClick={signOut}>Try again</button></div>}
        <Outlet />
      </main>
      <footer className="workspace-footer"><span>Your information. On your terms.</span><span>formER</span></footer>
    </div>
    {mobile && <Dialog title="Your workspace" onClose={() => setMobile(false)}>{nav}
      <div className="mobile-account"><p>{user?.email}</p><button className="app-button secondary" disabled={busy} onClick={signOut}><LogOut size={16} />Sign out</button></div>
    </Dialog>}
  </div>;
}
