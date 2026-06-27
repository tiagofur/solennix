import React, { useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, type = 'text', ...props }, ref) => {
    const id = useId();
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-bold text-text-secondary px-1 uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={clsx(
            "w-full px-4 py-3 rounded-xl border border-border bg-surface hover:border-border-strong focus:border-primary focus:bg-surface focus:outline-hidden focus:ring-4 focus:ring-primary/10 text-sm text-text placeholder-text-tertiary transition-all",
            error && "border-error focus:border-error focus:ring-error/10",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs font-semibold text-error px-1">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-text-tertiary px-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
