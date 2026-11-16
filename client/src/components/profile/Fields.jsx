import React, { useId } from 'react';

export function Fields({ fields, draft, setDraft, errors = {}, disabled = false }) {
  const prefix = useId();
  return <div className="profile-fields">{fields.map((field) => {
    const id = `${prefix}-${field.name}`;
    const error = errors[field.name];
    const props = { id, name: field.name, value: draft[field.name] ?? '', disabled,
      onChange: (event) => setDraft((current) => ({ ...current, [field.name]: event.target.value })),
      required: field.required, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : field.hint ? `${id}-hint` : undefined };
    return <div key={field.name} className={`profile-field ${field.wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{field.label}<span>{field.required ? 'Required' : 'Optional'}</span></label>
      {field.options ? <select {...props}><option value="">Choose an option</option>{field.options.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        : field.textarea ? <textarea {...props} rows={3} maxLength={field.maxLength} />
          : <input {...props} type={field.type || 'text'} maxLength={field.maxLength} min={field.min} max={field.max} step={field.step || 'any'} autoComplete={field.autoComplete || 'off'} placeholder={field.placeholder} />}
      {error ? <p className="field-error" id={`${id}-error`}>{error}</p> : field.hint && <p id={`${id}-hint`}>{field.hint}</p>}
    </div>;
  })}</div>;
}
