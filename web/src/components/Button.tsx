import React from 'react';
import clsx from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-semibold transition-all active-ios-scale disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        // Variants
        variant === 'primary' && "bg-linear-to-br from-primary to-primary-dark text-on-primary shadow-xs hover:shadow-sm active:opacity-90",
        variant === 'secondary' && "bg-surface-alt border border-border text-text hover:bg-surface-alt/80",
        variant === 'outline' && "bg-transparent border border-border text-text hover:bg-surface-alt",
        variant === 'glass' && "liquid-glass text-text hover:bg-surface/60",
        variant === 'danger' && "bg-error text-white shadow-xs hover:bg-error/90",
        // Sizes
        size === 'sm' && "px-3.5 py-1.5 text-xs rounded-xl gap-1.5",
        size === 'md' && "px-5 py-2.5 text-sm rounded-xl gap-2",
        size === 'lg' && "px-6 py-3.5 text-base rounded-2xl gap-2.5",
        className
      )}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" role="status" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
};
