import React, { useState } from 'react';
import { GraduationCap, Plus, Pencil, Trash2, Check } from 'lucide-react';
import { useProfile } from '../../context/ProfileContext.jsx';
import { educationFields, friendlyError } from '../../utils/profile.js';
import { EditForm } from './EditForm.jsx';
import { Dialog } from '../common/Dialog.jsx';

export function Education({ onSaved }) {
  const { profile, saveEducation, deleteEducation } = useProfile();
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const records = profile.education || [];
  const remove = async () => {
    setBusy(true); setError('');
    try { await deleteEducation(removing.id); setRemoving(null); setNotice('Qualification removed.'); }
    catch (err) { setError(friendlyError(err, 'remove this qualification')); }
    finally { setBusy(false); }
  };
  if (editing) return <EditForm key={editing.id || 'new'} fields={educationFields} value={editing}
    title={editing.id ? 'Edit qualification' : 'Add a qualification'}
    description="Give each qualification its own record, even when you have more than one at the same level."
    splitAt={10} onClose={() => setEditing(null)}
    onSave={(body) => saveEducation(body, editing.id)} onSaved={() => { setEditing(null); setNotice(''); onSaved?.(); }} />;
  return <section className="app-panel education-panel">
    <div className="editor-heading"><h2>Educational qualifications</h2><p>Your school, college, and other qualifications, each with their own details.</p></div>
    {notice && <p className="save-notice" role="status"><Check size={16} />{notice}</p>}
    {records.length ? <div className="qualification-list">{records.map((item) => <article className="qualification" key={item.id}>
      <span className="section-icon"><GraduationCap size={22} /></span><div className="qualification-content"><span className="qualification-level">{item.qualificationLevel}</span><h3>{item.degreeName}</h3>
        <p>{[item.institution, item.boardOrUniversity].filter(Boolean).join(' · ') || 'Institution not added'}</p>
        <div className="qualification-meta">{item.passingYear && <span>{item.passingYear}</span>}{item.percentage != null && <span>{item.percentage}%</span>}{item.cgpa != null && <span>CGPA {item.cgpa}{item.cgpaScale ? ` / ${item.cgpaScale}` : ''}</span>}</div></div>
      <div className="record-actions"><button className="icon-button" aria-label={`Edit ${item.degreeName}`} onClick={() => { setNotice(''); setEditing(item); }}><Pencil size={17} /></button>
        <button className="icon-button" aria-label={`Remove ${item.degreeName}`} onClick={() => { setError(''); setRemoving(item); }}><Trash2 size={17} /></button></div>
    </article>)}</div> : <div className="education-empty"><span className="large-empty-icon"><GraduationCap size={34} strokeWidth={1.4} /></span><h3>Your learning, all in one place.</h3><p>Add your first qualification. You can return to add grades and other details later.</p></div>}
    <button className="app-button secondary" onClick={() => { setNotice(''); setEditing({}); }}><Plus size={17} />Add a qualification</button>
    {removing && <Dialog title="Remove this qualification?" onClose={() => setRemoving(null)} busy={busy}><p>“{removing.degreeName}” will be removed from your saved information. This cannot be undone.</p>
      {error && <div className="form-alert" role="alert">{error}</div>}
      <div className="dialog-actions"><button className="app-button secondary" disabled={busy} onClick={() => setRemoving(null)} autoFocus>Keep qualification</button><button className="app-button danger" disabled={busy} onClick={remove}>{busy ? 'Removing…' : 'Remove qualification'}</button></div>
    </Dialog>}
  </section>;
}
