import { createContext, createElement, useContext, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const ScrollContext = createContext({ current: null });

export function SmoothScrollingProvider({ children }) {
  const scroller = useRef(null);
  const { pathname } = useLocation();
  // The landing page has its own anchors and navbar offsets.
  const anchors = pathname === '/extension';

  useEffect(() => {
    const motionAllowed = window.matchMedia?.('(prefers-reduced-motion: no-preference)');
    if (!motionAllowed || typeof ResizeObserver === 'undefined') return;

    function update() {
      scroller.current?.destroy();
      scroller.current = motionAllowed.matches ? new Lenis({
        autoRaf: true,
        lerp: 0.23,
        anchors,
        allowNestedScroll: true,
        stopInertiaOnNavigate: true,
        prevent: (element) => element.matches('dialog, input:focus, select:focus, textarea:focus, [contenteditable="true"]:focus'),
      }) : null;
    }

    update();
    motionAllowed.addEventListener('change', update);
    return () => {
      motionAllowed.removeEventListener('change', update);
      scroller.current?.destroy();
      scroller.current = null;
    };
  }, [anchors]);

  return createElement(ScrollContext.Provider, { value: scroller }, children);
}

export function useSmoothScrolling() {
  return useContext(ScrollContext);
}
