import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export const Input = React.forwardRef(
  (
    {
      id,
      label,
      type = 'text',
      error,
      hint,
      className,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const computedType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-[14px] font-medium text-former-text select-none flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-former-error ml-1" aria-hidden="true">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={id}
            type={computedType}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={cn(
              'w-full h-11 px-3.5 bg-white text-[15px] text-former-text placeholder:text-former-text-muted rounded-input border border-former-border-strong transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'disabled:bg-former-canvas-muted disabled:text-former-disabled disabled:cursor-not-allowed',
              error && 'border-former-error focus:ring-former-error text-former-error',
              isPassword && 'pr-11',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-0 h-11 w-11 flex items-center justify-center text-former-text-muted hover:text-former-text transition-colors focus:outline-none focus-visible:text-primary"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {error && (
          <p id={`${id}-error`} className="text-[13px] text-former-error font-normal" role="alert">
            {error}
          </p>
        )}

        {!error && hint && (
          <p id={`${id}-hint`} className="text-[13px] text-former-text-secondary font-normal">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
