import React, { useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext.jsx';
import { useDirtyForm, useUnsaved } from '../../context/UnsavedContext.jsx';
import { draftFrom, payloadFrom, validateFields, linkFields, workFields, friendlyError } from '../../utils/profile.js';
import { Fields } from './Fields.jsx';
import { SaveBar } from './EditForm.jsx';
import { Dialog } from '../common/Dialog.jsx';

const skillFields = [{ name: 'skills', label: 'Skills', list: true, maxItems: 50, itemLength: 60, wide: true, hint: 'Separate skills with commas. Add up to 50.' }];
const toDraft = (data = {}) => ({ skills: (data.skills || []).join(', '), links: draftFrom(linkFields, data.profileLinks), work: (data.workExperience || []).map((item) => ({ ...draftFrom(workFields, item), isCurrent: Boolean(item.isCurrent) })) });
export function Professional({ onSaved }) {
  const { profile, save } = useProfile();
  const [baseline, setBaseline] = useState(() => toDraft(profile.professional));
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);
  const { confirm } = useUnsaved();
  const ref = useRef(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useDirtyForm(dirty || busy);
  const update = (next) => { setDraft(next); setSaved(false); setError(''); };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const issues = { skills: validateFields(skillFields, draft), links: validateFields(linkFields, draft.links), work: draft.work.map((item) => validateFields(workFields.filter((f) => !(f.name === 'endDate' && item.isCurrent)), { ...item, endDate: item.isCurrent ? '' : item.endDate })) };
    setErrors(issues);
    if ([issues.skills, issues.links, ...issues.work].some((e) => Object.keys(e).length)) {
      setError('Check the highlighted fields before saving.');
      requestAnimationFrame(() => ref.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    const body = { skills: payloadFrom(skillFields, draft).skills, profileLinks: payloadFrom(linkFields, draft.links),
      workExperience: draft.work.map((item) => ({ ...payloadFrom(workFields, item), isCurrent: item.isCurrent, endDate: item.isCurrent ? null : item.endDate || null })) };
    setBusy(true); setError('');
    try { const result = await save({ professional: body }); const next = toDraft(result.professional); setBaseline(next); setDraft(next); setSaved(true); onSaved?.(); }
    catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  };
  return <form ref={ref} noValidate onSubmit={submit} className="app-panel editor-panel">
    <div className="editor-heading"><h2>Professional information</h2><p>Keep your skills, experience, and profile links ready for your next opportunity.</p></div>
    {error && <div className="form-alert" role="alert">{error}</div>}
    <Fields fields={skillFields} draft={draft} setDraft={(fn) => update(fn(draft))} errors={errors.skills} disabled={busy} />
    <div className="form-subsection"><h3>Profile links</h3><p>Add only the profiles you want to share on applications.</p><Fields fields={linkFields} draft={draft.links} setDraft={(fn) => update({ ...draft, links: fn(draft.links) })} errors={errors.links} disabled={busy} /></div>
    <div className="form-subsection"><h3>Work experience</h3><p>{draft.work.length ? 'Keep each role separate, including roles at the same organization.' : 'No roles added yet. Add experience when you’re ready.'}</p>
      {draft.work.map((item, index) => <div className="work-record" key={index}><div className="work-record-heading"><h4>{item.jobTitle || `Role ${index + 1}`}</h4><button className="icon-button" type="button" disabled={busy} aria-label={`Remove role ${index + 1}`} onClick={() => setRemoveIndex(index)}><Trash2 size={17} /></button></div>
        <Fields fields={workFields.filter((f) => !(f.name === 'endDate' && item.isCurrent))} draft={item} setDraft={(fn) => update({ ...draft, work: draft.work.map((entry, i) => i === index ? fn(entry) : entry) })} errors={errors.work?.[index]} disabled={busy} />
        <label className="checkbox-label"><input type="checkbox" checked={item.isCurrent} disabled={busy} onChange={(event) => update({ ...draft, work: draft.work.map((entry, i) => i === index ? { ...entry, isCurrent: event.target.checked } : entry) })} />I currently work here</label>
      </div>)}
      <button className="app-button secondary" type="button" disabled={busy || draft.work.length >= 20} onClick={() => update({ ...draft, work: [...draft.work, { ...draftFrom(workFields), isCurrent: false }] })}><Plus size={16} />Add a role</button>
      {draft.work.length >= 20 && <p>You can save up to 20 roles.</p>}
    </div>
    <SaveBar dirty={dirty} busy={busy} saved={saved} onCancel={() => confirm(() => { setDraft(baseline); setErrors({}); setError(''); })} />
    {removeIndex != null && <Dialog title="Remove this role?" onClose={() => setRemoveIndex(null)}><p>The role will be removed when you save your changes.</p><div className="dialog-actions"><button className="app-button secondary" type="button" autoFocus onClick={() => setRemoveIndex(null)}>Keep role</button><button className="app-button danger" type="button" onClick={() => { update({ ...draft, work: draft.work.filter((_, i) => i !== removeIndex) }); setRemoveIndex(null); }}>Remove role</button></div></Dialog>}
  </form>;
}
