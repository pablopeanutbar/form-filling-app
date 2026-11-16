import React from 'react';
import { cn } from '../../utils/cn.js';
import { Spinner } from './Spinner.jsx';

export const Button = React.forwardRef(
  (
    {
      children,
      type = 'button',
      variant = 'primary',
      size = 'default',
      isLoading = false,
      disabled = false,
      className,
      icon: Icon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-former-disabled disabled:text-white/80 shadow-sm',
      secondary:
        'bg-white text-former-text border border-former-border hover:bg-former-canvas active:bg-former-canvas disabled:text-former-disabled disabled:border-former-border/60',
      destructive:
        'bg-former-error text-white hover:bg-red-700 active:bg-red-800 disabled:bg-former-disabled disabled:text-white/80',
      tertiary:
        'bg-transparent text-former-secondary hover:text-former-text hover:bg-former-canvas disabled:text-former-disabled',
      ghost:
        'bg-transparent text-primary hover:bg-primary-soft disabled:text-former-disabled'
    };

    const sizes = {
      sm: 'h-9 px-3.5 text-xs rounded-full gap-1.5',
      default: 'h-11 px-5 text-[15px] rounded-full gap-2',
      lg: 'h-12 px-6 text-base rounded-full gap-2.5',
      icon: 'h-11 w-11 rounded-full'
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === 'sm' ? 'sm' : 'md'} className="text-current" />
            <span>{typeof children === 'string' ? 'Processing...' : children}</span>
          </>
        ) : (
          <>
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
