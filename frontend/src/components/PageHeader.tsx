import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, action }) => {
  const actionContent = actions || action;
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">{title}</h1>
        {description && <p className="mt-1 text-xs sm:text-sm text-slate-500 line-clamp-2">{description}</p>}
      </div>
      {actionContent && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0 w-full sm:w-auto">
          {actionContent}
        </div>
      )}
    </div>
  );
};
