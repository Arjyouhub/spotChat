import React, { useState, useEffect } from 'react';

const Avatar = ({ src, name, isOnline, size = 'md', className = '' }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const dotSizes = {
    sm: 'w-2.5 h-2.5 bottom-0 right-0 border-1',
    md: 'w-3 h-3 bottom-0 right-0 border-2',
    lg: 'w-4 h-4 bottom-0.5 right-0.5 border-2',
    xl: 'w-5 h-5 bottom-1 right-1 border-2',
  };

  const initial = name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?';
  const hasValidSrc = src && !imgError;

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {hasValidSrc ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`${sizeClasses[size]} rounded-full object-cover bg-slate-800 ring-2 ring-slate-700/50`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold flex items-center justify-center ring-2 ring-slate-700/50 shadow-inner select-none`}
        >
          {initial}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={`absolute rounded-full border-slate-900 ${
            dotSizes[size]
          } ${isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

export default Avatar;
