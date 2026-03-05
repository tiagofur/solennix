import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  forceLight?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 32, showText = true, forceLight = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/favicon.svg"
        alt="EventosApp Logo"
        width={size}
        height={size}
        className="shrink-0 shadow-sm"
        style={{ width: size, height: size }}
      />
      {showText && (
        <span className={`text-2xl font-bold ${forceLight ? 'text-white' : 'text-primary'}`}>
          EventosApp
        </span>
      )}
    </div>
  );
};
