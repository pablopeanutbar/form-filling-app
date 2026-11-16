import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronDown, CircleHelp, FileQuestion, History, Info,
  Link2, LogOut, MessageSquare, Monitor, NotebookPen, UserRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useUnsaved } from '../context/UnsavedContext.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Button } from '../components/common/Button.jsx';
import { PageHeader, TextLink } from '../components/common/Page.jsx';
import '../styles/account-pages.css';

function SectionHeading({ icon: Icon, title, description }) {
  return <div className="ap-section-heading">
    <span className="section-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.6} /></span>
    <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
  </div>;
}

function Availability({ children }) {
  return <span className="ap-availability"><Info size={14} aria-hidden="true" />{children}</span>;
}

function HistoryPage() {
  return <>
    <PageHeader title="History" />
    <section className="app-panel ap-history" aria-labelledby="activity-title">
      <div className="ap-card-header"><h2 id="activity-title">Recent activity</h2><Availability>Not available yet</Availability></div>
      <div className="ap-history-empty">
        <div className="ap-empty-art" aria-hidden="true"><History size={36} strokeWidth={1.3} /></div>
        <h3>Your history starts here.</h3>
        <p>Activity history isn’t available in formER yet. There are no recorded dates or results to display here.</p>
        <Link className="app-button" to="/app/profile">Review my information<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className="ap-card-footnote"><Info size={16} aria-hidden="true" /><p>This page can’t confirm whether an application was submitted.</p></div>
    </section>
  </>;
}

function SettingsPage() {
  const { user, logout } = useAuth();
  const { confirm } = useUnsaved();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const joined = user?.createdAt ? new Date(user.createdAt) : null;
  const memberSince = joined && !Number.isNaN(joined.getTime())
    ? joined.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;

  const signOut = () => confirm(async () => {
    setBusy(true);
    setError('');
    try { await logout(); }
    catch { setError('We couldn’t sign you out. Please try again.'); }
    finally { setBusy(false); }
  });

  return <>
    <PageHeader title="Account settings" />
    <div className="ap-stack">
      <section className="app-panel ap-settings-card">
        <SectionHeading icon={UserRound} title="Your account" description="The account you use to sign in to formER." />
        <dl className="ap-account-details">
          <div><dt>Sign-in email</dt><dd>{user?.email || 'Email unavailable'}</dd></div>
          {memberSince && <div><dt>Member since</dt><dd>{memberSince}</dd></div>}
        </dl>
        <p className="ap-caption">Changing your sign-in email or password isn’t available yet.</p>
      </section>
      <section className="app-panel ap-settings-card">
        <SectionHeading icon={Link2} title="Extension connections" description="See which copies of the formER extension are connected to your account." />
        <TextLink to="/extension/connections">Manage connections</TextLink>
      </section>
      <section className="app-panel ap-settings-card">
        <SectionHeading icon={Monitor} title="Your session" description="Finished for now? Sign out of this browser." />
        <div className="ap-session-action"><p>Your saved information will be here when you sign back in.</p>
          <Button variant="secondary" icon={LogOut} isLoading={busy} onClick={signOut} aria-busy={busy}>
            <span>{busy ? 'Signing out…' : 'Sign out'}</span>
          </Button>
        </div>
        {error && <Alert className="ap-signout-error" message={error} />}
      </section>
    </div>
  </>;
}

const reportTopics = [
  {
    id: 'answers', icon: FileQuestion, title: 'An answer looks wrong',
    description: 'Missing details or an unexpected answer.',
    guidance: 'Check the details saved in My Information and compare them with what the form asks for. Review every answer on the original website before submitting.',
    to: '/app/profile', link: 'Review my information'
  },
  {
    id: 'extension', icon: Monitor, title: 'A form or extension isn’t working',
    description: 'Fields aren’t detected or filled as expected.',
    guidance: 'Connect your account in the extension, then choose Analyze form for suggestions. Filling fields automatically isn’t available yet. You can still complete the form yourself on the original website.'
  },
  {
    id: 'account', icon: UserRound, title: 'Account or saved information',
    description: 'Trouble with your account or updating your details.',
    guidance: 'If an update fails, check your connection and try saving again. You can review your sign-in email and sign out from Account Settings.',
    to: '/app/settings', link: 'Open account settings'
  },
  {
    id: 'other', icon: CircleHelp, title: 'Something else',
    description: 'An unexpected message or another problem.',
    guidance: 'Keep a note of the page you were on, what you tried, and what happened. Save any unsaved changes before reloading the page. There isn’t a way to send this information to formER yet.'
  }
];

function ReportPage() {
  return <>
    <PageHeader title="Report a problem" />
    <div className="ap-layout">
      <section className="app-panel ap-report" aria-labelledby="report-title">
        <div className="ap-report-intro">
          <Availability>Reporting isn’t available yet</Availability>
          <h2 id="report-title">Something not quite right?</h2>
          <p>You can’t send a report from formER yet. In the meantime, choose a topic below for a few things you can check.</p>
        </div>
        <div className="ap-topics">{reportTopics.map(({ id, icon: Icon, title, description, guidance, to, link }) =>
          <details key={id} className="ap-topic">
            <summary><span className="section-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.6} /></span>
              <span className="ap-topic-label"><strong>{title}</strong><span>{description}</span></span>
              <ChevronDown size={17} className="ap-topic-chevron" aria-hidden="true" />
            </summary>
            <div className="ap-topic-content"><p>{guidance}</p>{to && <TextLink to={to}>{link}</TextLink>}</div>
          </details>
        )}</div>
        <div className="ap-card-footnote"><MessageSquare size={16} aria-hidden="true" /><p>Opening a topic doesn’t send a report or notify support.</p></div>
      </section>
      <aside className="ap-aside">
        <section className="ap-guide">
          <span className="section-icon" aria-hidden="true"><NotebookPen size={21} strokeWidth={1.6} /></span>
          <h2>A useful note starts with the basics.</h2>
          <p>If you’re keeping a note of an issue for yourself, include:</p>
          <ol className="ap-note-list"><li>What you were trying to do.</li><li>What you expected to happen.</li><li>What happened instead.</li></ol>
        </section>
        <div className="ap-side-note"><h3>Keep personal details out</h3><p>Leave out passwords, ID numbers, and private answers. A short description of the issue is enough.</p></div>
      </aside>
    </div>
  </>;
}

export function AccountPages({ page }) {
  return <div className="account-pages">
    {page === 'settings' ? <SettingsPage /> : page === 'history' ? <HistoryPage /> : <ReportPage />}
  </div>;
}
