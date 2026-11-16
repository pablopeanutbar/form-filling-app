import React from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { UserRound, ContactRound, MapPin, Send, GraduationCap, BriefcaseBusiness, Check } from 'lucide-react';
import { PageHeader, ProfileGate } from '../components/common/Page.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { EditForm } from '../components/profile/EditForm.jsx';
import { Education } from '../components/profile/Education.jsx';
import { Professional } from '../components/profile/Professional.jsx';
import { personalFields, contactFields, addressFields } from '../utils/profile.js';

const sections = [
  ['personal', 'Personal details', UserRound, 'The details that make you, you. Add only what you want to save.'],
  ['contact', 'Contact information', ContactRound, 'Choose how you’d like organizations to get in touch.'],
  ['permanent', 'Permanent address', MapPin, 'Your permanent home address, kept separate from your mailing address.'],
  ['correspondence', 'Correspondence address', Send, 'The address where you want to receive letters and other correspondence.'],
  ['education', 'Education', GraduationCap], ['professional', 'Professional', BriefcaseBusiness]
];
export function MyInformation() {
  const { section = 'personal' } = useParams();
  if (!sections.some(([key]) => key === section)) return <Navigate to="/app/profile" replace />;
  return <><PageHeader title="My Information" />
    <div className="profile-layout"><aside className="profile-section-sidebar"><nav aria-label="Information sections">{sections.map(([key, label, Icon]) =>
      <NavLink key={key} to={`/app/profile/${key}`} className={() => section === key ? 'active' : ''}><Icon size={17} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav>
      <div className="profile-tip"><Check size={18} /><p>Start with what you know.<br />You can fill in the rest later.</p></div></aside>
      <div className="profile-editor"><ProfileGate><Section key={section} section={section} /></ProfileGate></div>
    </div></>;
}
function Section({ section }) {
  const { profile, save } = useProfile();
  if (section === 'education') return <Education />;
  if (section === 'professional') return <Professional />;
  const address = ['permanent', 'correspondence'].includes(section);
  const fields = section === 'personal' ? personalFields : section === 'contact' ? contactFields : addressFields;
  const [, title, , description] = sections.find(([key]) => key === section);
  return <EditForm fields={fields} value={address ? profile.addresses?.[section] : profile[section]}
    title={title} description={description} onSave={async (body) => {
      const result = await save(address ? { addresses: { [section]: body } } : { [section]: body });
      return address ? result.addresses[section] : result[section];
    }} />;
}
