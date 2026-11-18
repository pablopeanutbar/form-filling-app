import React from 'react';
import { Check, GraduationCap, UserRound, ContactRound, MapPin } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';
import { profileReadiness } from '../utils/profile.js';
import { ProfileGate } from '../components/common/Page.jsx';
import { InteractiveHoverButton } from '../components/ui/interactive-hover-button.jsx';

export function Home() {
  return <ProfileGate><Dashboard /></ProfileGate>;
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
      <div className="readiness-intro"><div><p className="readiness-welcome">{name ? `Welcome back, ${name}` : 'Welcome to formER'}</p>
        <h1 className="readiness-title">Your details all at one place</h1>
        <p>Fill most of your details here so you may never have to fill them in on the internet again.</p>
        <InteractiveHoverButton className="readiness-action" to={`/app/profile/${next?.key || 'personal'}`}>{completed === 4 ? 'Review your profile' : completed ? 'Continue your profile' : 'Add your first details'}</InteractiveHoverButton>
      </div><div className="readiness-count" aria-label={`${completed} of 4 essentials added`}><span>{completed}<small>/ 4</small></span><p>essentials added</p><div className="readiness-ticks">{readiness.map((item) => <i key={item.key} className={item.ready ? 'complete' : ''} />)}</div></div></div>
      <div className="readiness-list">{readiness.map((item, i) => { const Icon = icons[i]; return <div className="readiness-row" key={item.key}>
        <span className={`section-icon ${item.ready ? 'is-ready' : ''}`}>{item.ready ? <Check size={18} /> : <Icon size={19} />}</span>
        <span className="readiness-label"><strong>{item.label}</strong><small>{item.detail}</small></span>
        <InteractiveHoverButton to={`/app/profile/${item.key}`} aria-label={`${item.ready ? 'Edit' : 'Add'} ${item.label}`}>
          {item.ready ? 'Edit' : 'Add details'}
        </InteractiveHoverButton>
      </div>; })}</div>
    </section>
    <section className="dashboard-bottom"><h2>A profile that grows with you.</h2></section>
  </div>;
}
