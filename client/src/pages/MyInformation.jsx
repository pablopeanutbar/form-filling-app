import React, { useState } from 'react';
import { NavLink, useParams, Navigate } from 'react-router-dom';
import { UserRound, ContactRound, MapPin, Send, GraduationCap, BriefcaseBusiness } from 'lucide-react';
import { PageHeader, ProfileGate } from '../components/common/Page.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { EditForm } from '../components/profile/EditForm.jsx';
import { Education } from '../components/profile/Education.jsx';
import { Professional } from '../components/profile/Professional.jsx';
import { SaveSuccessFeedback } from '../components/profile/SaveSuccessFeedback.jsx';
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
  const [saveCount, setSaveCount] = useState(0);
  const onSaved = () => setSaveCount((count) => count + 1);
  if (!sections.some(([key]) => key === section)) return <Navigate to="/app/profile" replace />;
  return <><PageHeader title="My Information" />
    <div className="profile-layout"><aside className="profile-section-sidebar"><nav aria-label="Information sections">{sections.map(([key, label, Icon]) =>
      <NavLink key={key} to={`/app/profile/${key}`} className={() => section === key ? 'active' : ''}><Icon size={17} strokeWidth={1.7} /><span>{label}</span></NavLink>)}</nav></aside>
      <div className="profile-editor"><ProfileGate><Section key={section} section={section} onSaved={onSaved} /></ProfileGate></div>
    </div>
    <SaveSuccessFeedback saveCount={saveCount} />
  </>;
}
function Section({ section, onSaved }) {
  const { profile, save } = useProfile();
  if (section === 'education') return <Education onSaved={onSaved} />;
  if (section === 'professional') return <Professional onSaved={onSaved} />;
  const address = ['permanent', 'correspondence'].includes(section);
  const fields = section === 'personal' ? personalFields : section === 'contact' ? contactFields : addressFields;
  const [, title, , description] = sections.find(([key]) => key === section);
  return <EditForm fields={fields} value={address ? profile.addresses?.[section] : profile[section]}
    addressCopy={section === 'correspondence' ? { value: profile.addresses?.permanent ?? {} } : undefined}
    title={title} description={description} onSaved={onSaved} onSave={async (body) => {
      const result = await save(address ? { addresses: { [section]: body } } : { [section]: body });
      return address ? result.addresses[section] : result[section];
    }} />;
}
