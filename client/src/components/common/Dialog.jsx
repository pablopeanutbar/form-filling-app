import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="workspace-dialog" aria-labelledby="dialog-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading"><h2 id="dialog-title">{title}</h2>
      <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose} disabled={busy}><X size={20} /></button>
    </div>{children}
  </dialog>;
}
