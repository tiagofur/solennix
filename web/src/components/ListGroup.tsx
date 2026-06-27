import React from 'react';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface ListGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass';
}

export const ListGroup: React.FC<ListGroupProps> = ({
  children,
  variant = 'default',
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "rounded-2xl overflow-hidden divide-y divide-separator/20 border border-border shadow-xs",
        variant === 'default' && "bg-card",
        variant === 'glass' && "liquid-glass",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
  chevron?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  children,
  onClick,
  chevron = false,
  className,
  ...props
}) => {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between px-6 py-4 text-left transition-all duration-150 active-ios-scale",
        onClick ? "hover:bg-surface-alt/50 cursor-pointer" : "",
        className
      )}
      {...props as any}
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {children}
      </div>
      {chevron && onClick && (
        <ChevronRight className="h-5 w-5 text-text-tertiary shrink-0 ml-2" aria-hidden="true" />
      )}
    </Component>
  );
};
