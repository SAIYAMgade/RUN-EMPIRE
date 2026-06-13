import React from 'react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({ name, avatarUrl, color, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-10 h-10 border-2',
    lg: 'w-14 h-14 border-[3px]',
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div 
      className={`relative rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-lg`}
      style={{ 
        borderColor: color,
        boxShadow: `0 0 10px ${color}55`
      }}
    >
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-slate-800`}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={avatarUrl} 
            alt={name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to initial
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-white font-bold text-sm select-none">{initial}</span>
        )}
      </div>
    </div>
  );
}
