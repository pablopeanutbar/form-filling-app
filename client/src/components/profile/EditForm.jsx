import React, { useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useDirtyForm, useUnsaved } from '../../context/UnsavedContext.jsx';
import { draftFrom, payloadFrom, validateFields, friendlyError } from '../../utils/profile.js';
import { Fields } from './Fields.jsx';

export function SaveBar({ dirty, busy, saved, onCancel }) {
  return <div className="save-bar"><span role="status">{busy ? <><Loader2 size={15} className="spin" />Saving changes…</> : dirty ? 'Unsaved changes' : saved ? <><Check size={16} />Changes saved</> : null}</span>
    <div><button className="app-button secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="app-button" disabled={busy || !dirty} type="submit">{busy ? 'Saving…' : 'Save changes'}</button></div></div>;
}
export function EditForm({ fields, value, onSave, onClose, title, description, splitAt, onSaved, addressCopy }) {
  const [baseline, setBaseline] = useState(() => draftFrom(fields, value));
  const [draft, setDraft] = useState(baseline);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previousAddress, setPreviousAddress] = useState(null);
  const ref = useRef(null);
  const { confirm } = useUnsaved();
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useDirtyForm(dirty || busy);
  const changeDraft = (update) => { setDraft(update); setSaved(false); setError(''); };
  const cancel = () => confirm(() => { setDraft(baseline); setPreviousAddress(null); setErrors({}); setError(''); if (onClose) onClose(); });
  const permanentDraft = addressCopy ? draftFrom(fields, addressCopy.value) : null;
  const canCopy = permanentDraft && Object.values(permanentDraft).some((part) => String(part ?? '').trim());
  const copyingAddress = previousAddress !== null;
  const toggleAddress = (checked) => {
    changeDraft(checked ? permanentDraft : previousAddress);
    setPreviousAddress(checked ? draft : null);
    setErrors({});
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const issues = validateFields(fields, draft);
    setErrors(issues);
    if (Object.keys(issues).length) {
      setError('Check the highlighted fields before saving.');
      requestAnimationFrame(() => ref.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await onSave(payloadFrom(fields, draft));
      const next = draftFrom(fields, result);
      setDraft(next); setBaseline(next); setSaved(true);
      if (copyingAddress) setPreviousAddress(next);
      onSaved?.(result);
    } catch (err) { setError(friendlyError(err)); }
    finally { setBusy(false); }
  };
  return <form ref={ref} onSubmit={submit} noValidate className="app-panel editor-panel">
    <div className="editor-heading"><h2>{title}</h2><p>{description}</p></div>
    {error && <div className="form-alert" role="alert">{error}</div>}
    {addressCopy && <label className="checkbox-label address-copy">
      <input type="checkbox" checked={copyingAddress} disabled={busy || !canCopy}
        onChange={(event) => toggleAddress(event.target.checked)} />
      Same as permanent address
    </label>}
    <Fields fields={splitAt ? fields.slice(0, splitAt) : fields} draft={draft} setDraft={changeDraft} errors={errors} disabled={busy || copyingAddress} />
    {splitAt && <details className="additional-details" open={Object.keys(errors).some((key) => fields.slice(splitAt).some((f) => f.name === key)) || undefined}>
      <summary>Results and grades <span>Optional</span></summary><p>Enter the results shown on your records. We won’t convert between CGPA and percentage.</p>
      <Fields fields={fields.slice(splitAt)} draft={draft} setDraft={changeDraft} errors={errors} disabled={busy} />
    </details>}
    <SaveBar dirty={dirty} busy={busy} saved={saved} onCancel={cancel} />
  </form>;
}
