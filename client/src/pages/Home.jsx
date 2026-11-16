import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, UserRound, ContactRound, MapPin, Chrome, ArrowUpRight } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';
import { profileReadiness } from '../utils/profile.js';
import { PageHeader, ProfileGate, TextLink } from '../components/common/Page.jsx';

export function Home() {
  return <><PageHeader eyebrow="Your everyday head start" title="Make room for what’s next." description="Keep your details together. Start your next application a little further ahead." /><ProfileGate><Dashboard /></ProfileGate></>;
}
function Dashboard() {
  const { profile } = useProfile();
  const readiness = profileReadiness(profile);
  const completed = readiness.filter((item) => item.ready).length;
  const next = readiness.find((item) => !item.ready);
  const education = profile.education || [];
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
      <p className="readiness-note">These four checkpoints cover common application details. They don’t measure eligibility or verify your information.</p>
    </section>
    <aside className="dashboard-aside">
      <section className="education-overview"><div className="section-title"><span className="section-icon"><GraduationCap size={21} /></span><h2>Your education</h2></div>
        {education.length ? <><p>{education.length} saved {education.length === 1 ? 'qualification' : 'qualifications'}</p><ul className="education-preview">{education.slice(0, 3).map((item) => <li key={item.id}><strong>{item.degreeName}</strong><span>{[item.institution, item.passingYear].filter(Boolean).join(' · ') || item.qualificationLevel}</span></li>)}</ul></>
          : <><h3>Every qualification has its place.</h3><p>Keep school, college, and other qualifications separate and easy to find.</p></>}
        <TextLink to="/app/profile/education">{education.length ? 'Manage qualifications' : 'Add a qualification'}</TextLink>
      </section>
      <section className="extension-guide"><Chrome size={24} strokeWidth={1.6} /><p className="eyebrow">In your browser</p><h2>Your next step, explained.</h2>
        <p>The Chrome extension currently detects form fields. Account connection and filling saved answers aren’t available yet.</p>
        <details><summary>How to prepare <ArrowUpRight size={15} /></summary><ol><li>Save the details you use most often.</li><li>Keep each qualification up to date.</li><li>Review every answer before submitting an application yourself.</li></ol></details>
      </section>
    </aside>
    <section className="dashboard-bottom"><div><h2>A profile that grows with you.</h2><p>New address, new role, new qualification? Your information is always yours to update.</p></div><TextLink to="/app/profile">My Information</TextLink></section>
  </div>;
}
