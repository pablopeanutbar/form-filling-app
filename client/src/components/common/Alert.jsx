import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Alert = ({ variant = 'error', message, title, children, className }) => {
  if (!message && !children) return null;

  const config = {
    error: {
      container: 'bg-former-error-soft text-former-error border-former-error/25',
      icon: AlertCircle
    },
    success: {
      container: 'bg-former-success-soft text-former-success border-former-success/25',
      icon: CheckCircle2
    },
    warning: {
      container: 'bg-former-warning-soft text-former-warning border-former-warning/25',
      icon: AlertTriangle
    },
    info: {
      container: 'bg-primary-soft text-primary border-primary/25',
      icon: Info
    }
  };

  const current = config[variant] || config.error;
  const Icon = current.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-lg border text-[14px] leading-relaxed',
        current.container,
        className
      )}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        {message && <div>{message}</div>}
        {children}
      </div>
    </div>
  );
};
