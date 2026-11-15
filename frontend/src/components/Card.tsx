import React from 'react';

export const Card = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => {
  return (
    <div className={`card p-6 ${className}`}>
      {title && (
        <h3 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">{title}</h3>
      )}
      {children}
    </div>
  );
};

