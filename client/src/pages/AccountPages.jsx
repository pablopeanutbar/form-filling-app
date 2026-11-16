import React from 'react';
import { History, MessageSquare, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, TextLink } from '../components/common/Page.jsx';

export function AccountPages({ page }) {
  const { user } = useAuth();
  if (page === 'settings') return <><PageHeader title="Account settings" description="A clear view of your account and the controls available to you." />
    <section className="app-panel account-settings"><div className="section-title"><span className="section-icon"><UserRound size={20} /></span><h2>Your account</h2></div>
      <dl><div><dt>Sign-in email</dt><dd>{user?.email}</dd></div>{user?.createdAt && <div><dt>Member since</dt><dd>{new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</dd></div>}</dl>
      <TextLink to="/app/profile/contact">Edit your application contact details</TextLink>
      <div className="availability-note"><h3>More account controls are on the way</h3><p>Password changes, account deletion, data export, and extension connections aren’t available in the app yet. You can sign out from your account menu.</p></div>
    </section></>;
  const history = page === 'history';
  const Icon = history ? History : MessageSquare;
  return <><PageHeader title={history ? 'History' : 'Report a problem'} description={history ? 'Your form-filling activity, when it’s available.' : 'Help make formER better for your next application.'} />
    <section className="app-panel unavailable-state"><span className="large-empty-icon"><Icon size={30} strokeWidth={1.4} /></span>
      <span className="availability-label">Not available yet</span><h2>{history ? 'A place for your future activity.' : 'Reporting is still taking shape.'}</h2>
      <p>{history ? 'Activity tracking hasn’t been connected yet, so there’s no history to show. For now, you can get your information ready.' : 'You can’t send a report from formER yet. Your saved information can still be reviewed and updated in My Information.'}</p>
      <TextLink to="/app/profile">Go to My Information</TextLink>
    </section></>;
}
