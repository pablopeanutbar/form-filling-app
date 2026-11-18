import React, { useCallback, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';

// Adapted from React Bits LineSidebar by David Haz. The shared license is in Folder.LICENSE.md.
const FALLOFF_CURVES = {
  linear: p => p,
  smooth: p => p * p * (3 - 2 * p),
  sharp: p => p * p * p
};

export default function LineSidebar({ items, proximityRadius = 110, falloff = 'smooth', smoothing = 180 }) {
  const listRef = useRef(null);
  const itemRefs = useRef([]);
  const targetsRef = useRef([]);
  const currentRef = useRef([]);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const motionRef = useRef(false);

  // The upstream animation eases one CSS value per row, with no React updates per frame.
  const runFrame = useCallback(now => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05);
    lastRef.current = now;
    const tau = Math.max(smoothing, 1) / 1000;
    const k = 1 - Math.exp(-dt / tau);
    let moving = false;
    const rows = itemRefs.current;
    for (let i = 0; i < rows.length; i++) {
      const el = rows[i];
      if (!el) continue;
      const target = targetsRef.current[i] || 0;
      const cur = currentRef.current[i] || 0;
      const next = cur + (target - cur) * k;
      const settled = Math.abs(target - next) < 0.0015;
      const value = settled ? target : next;
      currentRef.current[i] = value;
      el.style.setProperty('--effect', value.toFixed(4));
      if (!settled) moving = true;
    }
    rafRef.current = moving ? requestAnimationFrame(runFrame) : null;
  }, [smoothing]);

  const startLoop = () => {
    if (rafRef.current != null) return;
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  };

  const handlePointerMove = (event) => {
    if (!motionRef.current || event.pointerType === 'touch') return;
    const pointerY = event.clientY - listRef.current.getBoundingClientRect().top;
    const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear;
    itemRefs.current.forEach((row, index) => {
      if (!row) return;
      const center = row.offsetTop + row.offsetHeight / 2;
      targetsRef.current[index] = ease(Math.max(0, 1 - Math.abs(pointerY - center) / proximityRadius));
    });
    startLoop();
  };

  const handlePointerLeave = () => {
    if (!motionRef.current) return;
    targetsRef.current = [];
    startLoop();
  };

  useEffect(() => {
    const query = window.matchMedia?.('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const reset = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      targetsRef.current = [];
      currentRef.current = [];
      itemRefs.current.forEach((row) => row?.style.removeProperty('--effect'));
    };
    const update = () => {
      motionRef.current = query?.matches ?? false;
      if (!motionRef.current) reset();
    };
    update();
    query?.addEventListener('change', update);
    return () => {
      query?.removeEventListener('change', update);
      reset();
    };
  }, [runFrame]);

  return <nav aria-label="Main navigation">
    <ul ref={listRef} className="workspace-nav line-sidebar"
      onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onPointerCancel={handlePointerLeave}>
      {items.map(([to, label, Icon], index) => (
        <li key={to} ref={(row) => { itemRefs.current[index] = row; }}>
          <NavLink to={to} end={to === '/app'}>
            <span className="line-sidebar-marker" aria-hidden="true" />
            <span className="line-sidebar-label"><Icon size={19} strokeWidth={1.7} aria-hidden="true" />{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>;
}
