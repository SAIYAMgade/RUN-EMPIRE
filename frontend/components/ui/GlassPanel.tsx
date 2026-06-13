import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassPanel({ children, className = '', style }: GlassPanelProps) {
  return (
    <div 
      className={`backdrop-blur-lg bg-slate-950/75 border border-slate-800/80 shadow-2xl rounded-2xl ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
