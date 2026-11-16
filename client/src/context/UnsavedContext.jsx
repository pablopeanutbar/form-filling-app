import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Dialog } from '../components/common/Dialog.jsx';

const UnsavedContext = createContext(null);
export function UnsavedProvider({ children }) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(null);
  const blocker = useBlocker(dirty);
  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const cancel = () => { if (blocker.state === 'blocked') blocker.reset(); setPending(null); };
  const discard = () => {
    if (blocker.state === 'blocked') blocker.proceed();
    if (pending) pending();
    setPending(null);
  };
  const confirm = (action) => { if (dirty) setPending(() => action); else action(); };
  return <UnsavedContext.Provider value={{ dirty, setDirty, confirm }}>{children}
    {(blocker.state === 'blocked' || pending) && <Dialog title="Leave without saving?" onClose={cancel}>
      <p>Your latest changes haven’t been saved. Stay here to keep editing, or discard them and continue.</p>
      <div className="dialog-actions"><button className="app-button secondary" onClick={cancel} autoFocus>Keep editing</button>
        <button className="app-button danger" onClick={discard}>Discard changes</button></div>
    </Dialog>}
  </UnsavedContext.Provider>;
}
export const useUnsaved = () => useContext(UnsavedContext);
export function useDirtyForm(dirty) {
  const { setDirty } = useUnsaved();
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
}
