import React from 'react';
import { cn } from '../../utils/cn.js';

export const Card = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-card border border-former-border shadow-card p-6 sm:p-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
