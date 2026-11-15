import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { PackageOpen } from 'lucide-react';

export const Placeholder = ({ title }: { title: string }) => {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader 
        title={title} 
        description={`Manage and track your ${title.toLowerCase()} from this central hub.`}
      />
      <Card className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-slate-50 p-6 mb-4">
          <PackageOpen className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">Module Under Construction</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          The {title} module is currently being built. Check back soon for updates.
        </p>
      </Card>
    </div>
  );
};
