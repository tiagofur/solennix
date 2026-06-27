import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-2xl transition-all duration-200",
        // Variants
        variant === 'default' && "bg-card border border-border shadow-sm",
        variant === 'glass' && "liquid-glass",
        variant === 'flat' && "bg-surface-alt border border-transparent",
        // Padding
        padding === 'none' && "p-0",
        padding === 'sm' && "p-4",
        padding === 'md' && "p-6",
        padding === 'lg' && "p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
