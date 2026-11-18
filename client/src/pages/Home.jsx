import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, UserRound, ContactRound, MapPin } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';
import { profileReadiness } from '../utils/profile.js';
import { PageHeader, ProfileGate } from '../components/common/Page.jsx';

export function Home() {
  return <><PageHeader title="Make room for what’s next." /><ProfileGate><Dashboard /></ProfileGate></>;
}
function Dashboard() {
  const { profile } = useProfile();
  const readiness = profileReadiness(profile);
  const completed = readiness.filter((item) => item.ready).length;
  const next = readiness.find((item) => !item.ready);
  const icons = [UserRound, ContactRound, MapPin, GraduationCap];
  const name = profile.personal?.fullName?.trim().split(/\s+/)[0];
  return <div className="dashboard-layout">
    <section className="readiness-panel app-panel">
      <div className="readiness-intro"><div><p className="eyebrow">{name ? `Welcome back, ${name}` : 'A good place to begin'}</p>
        <h2>{completed === 4 ? 'Your essentials are in place.' : 'A few details now.\nLess repetition later.'}</h2>
        <p>{completed === 4 ? 'Take a moment to check that everything is up to date before your next application.' : 'Build your profile at your own pace. Add only the information you want to keep here.'}</p>
        <Link className="app-button" to={`/app/profile/${next?.key || 'personal'}`}>{completed === 4 ? 'Review your profile' : completed ? 'Continue your profile' : 'Add your first details'}<ArrowRight size={17} /></Link>
      </div><div className="readiness-count" aria-label={`${completed} of 4 essentials added`}><span>{completed}<small>/ 4</small></span><p>essentials added</p><div className="readiness-ticks">{readiness.map((item) => <i key={item.key} className={item.ready ? 'complete' : ''} />)}</div></div></div>
      <div className="readiness-list">{readiness.map((item, i) => { const Icon = icons[i]; return <Link key={item.key} to={`/app/profile/${item.key}`}>
        <span className={`section-icon ${item.ready ? 'is-ready' : ''}`}>{item.ready ? <Check size={18} /> : <Icon size={19} />}</span>
        <span className="readiness-label"><strong>{item.label}</strong><small>{item.detail}</small></span>
        <span className={`readiness-status ${item.ready ? 'is-ready' : ''}`}>{item.ready ? 'Added' : 'Add details'}</span><ArrowRight size={16} />
      </Link>; })}</div>
    </section>
    <section className="dashboard-bottom"><h2>A profile that grows with you.</h2></section>
  </div>;
}
