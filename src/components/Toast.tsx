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
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 bg-[#164235] text-white px-4 py-3.5 rounded-2xl shadow-2xl border border-emerald-600/40 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            {toast.type === 'error' ? (
              <span className="material-symbols-outlined text-[20px] text-rose-400">error</span>
            ) : (
              <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
            )}
          </div>
          <div className="flex flex-col leading-tight pr-2 min-w-0">
            {toast.title && (
              <span className="text-xs font-headline font-bold text-emerald-300 truncate">
                {toast.title}
              </span>
            )}
            <span className="text-[11.5px] text-slate-200 font-medium break-words">
              {toast.message}
            </span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-1 ml-auto cursor-pointer transition-colors"
            title="ปิด"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
};
