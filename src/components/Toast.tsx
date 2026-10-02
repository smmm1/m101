import React from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5 max-w-[280px] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-2 bg-zinc-900/90 dark:bg-zinc-900/95 backdrop-blur-xs text-zinc-100 px-3 py-2 rounded-lg shadow-lg border border-zinc-700/60 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Subtle neutral monochrome icon */}
          <span className="material-symbols-outlined text-[15px] text-zinc-400 shrink-0 select-none">
            {toast.type === 'error' ? 'info' : 'check'}
          </span>

          <div className="flex flex-col min-w-0 pr-1 leading-tight">
            {toast.title && (
              <span className="text-[11px] font-semibold text-zinc-200 truncate">
                {toast.title}
              </span>
            )}
            <span className="text-[10.5px] text-zinc-400 font-normal leading-snug break-words">
              {toast.message}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="text-zinc-500 hover:text-zinc-200 p-0.5 ml-auto cursor-pointer transition-colors shrink-0"
            title="ปิด"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
