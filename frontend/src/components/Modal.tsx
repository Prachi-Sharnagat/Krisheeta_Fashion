import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className={`relative w-[calc(100%-1.5rem)] sm:w-full ${maxWidth} rounded-2xl bg-white shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col my-auto`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 sm:px-6 py-3.5 shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
