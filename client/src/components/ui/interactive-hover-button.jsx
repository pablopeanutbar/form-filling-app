import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import './interactive-hover-button.css';

// Adapted from Magic UI's InteractiveHoverButton, distributed on 21st.dev.
// https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/interactive-hover-button.tsx
export const InteractiveHoverButton = forwardRef(function InteractiveHoverButton({
  children, className, compact = false, to, href, disabled = false, onClick, type = 'button', ...props
}, ref) {
  const Element = to ? Link : href ? 'a' : 'button';
  return <Element {...props} ref={ref}
    {...(to ? { to } : href ? { href } : { type, disabled })}
    aria-disabled={disabled || undefined}
    tabIndex={disabled ? -1 : props.tabIndex}
    onClick={(event) => {
      if (disabled) { event.preventDefault(); return; }
      onClick?.(event);
    }}
    className={cn('interactive-hover-button', compact && 'interactive-hover-button-compact', className)}>
    <span className="ihb-rest">
      <span className="ihb-dot" aria-hidden="true" />
      <span className="ihb-label">{children}</span>
      <ArrowRight className="ihb-touch-arrow" size={16} aria-hidden="true" />
    </span>
    <span className="ihb-over" aria-hidden="true"><span>{children}</span><ArrowRight size={16} /></span>
  </Element>;
});
