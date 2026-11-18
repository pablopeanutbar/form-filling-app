import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Folder from '../ui/Folder.jsx';
import './save-success-feedback.css';

const items = [{ title: 'Profile details' }];

function Notice() {
  const [exiting, setExiting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setExiting(true), 1950);
    const dismiss = setTimeout(() => setDismissed(true), 2200);
    return () => {
      clearTimeout(fade);
      clearTimeout(dismiss);
    };
  }, []);

  if (dismissed) return null;

  return <div className="save-success-card" data-exiting={exiting || undefined} aria-hidden="true">
    <div className="save-success-folder" inert="">
      <Folder items={items} mode="flap" variant="solid" theme="light" color="#0071E3"
        size={0.28} open={false} intro draggable={false} zoomOnClick={false}
        peek={false} tilt={0} closeOnOutsideClick={false} speed={1.2} />
    </div>
    <p>Details saved successfully</p>
  </div>;
}

export function SaveSuccessFeedback({ saveCount }) {
  return createPortal(<>
    <div className="sr-only" role="status" aria-atomic="true">
      {saveCount > 0 && <span key={saveCount}>Details saved successfully</span>}
    </div>
    {saveCount > 0 && <Notice key={saveCount} />}
  </>, document.body);
}
