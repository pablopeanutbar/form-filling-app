import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export function PageHeader({ title, children }) {
  return <header className="page-heading"><h1>{title}</h1>{children}</header>;
}
export function ProfileGate({ children }) {
  const { loading, error, reload } = useProfile();
  const { checkSession } = useAuth();
  const navigate = useNavigate();
  if (loading) return <div className="page-skeleton" role="status" aria-label="Loading your information"><div /><div /><div /><span className="sr-only">Loading your information…</span></div>;
  if (error) return <section className="app-panel load-error"><AlertCircle size={28} /><h2>We couldn’t load your information</h2>
    <p>{error.status === 401 ? 'Please sign in again to continue.' : 'Check your connection, then give it another try.'}</p>
    {error.status === 401 ? <button className="app-button" onClick={async () => { await checkSession(); navigate('/login'); }}>Sign in again</button> : <button className="app-button" onClick={reload}>Try again</button>}</section>;
  return children;
}
export function TextLink({ to, children }) { return <Link className="text-link" to={to}>{children}<ArrowRight size={16} /></Link>; }
