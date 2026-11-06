import React from 'react';
import { DSButton, DSBadge } from '../design-system/components';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title?: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss, onUndo, canUndo = false }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="m101-toast-stack fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-[320px] pointer-events-none" role="region" aria-label="การแจ้งเตือน" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="m101-toast ds-toast pointer-events-auto flex items-center gap-2 px-3 py-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Subtle neutral monochrome icon */}
          <span className="material-symbols-outlined ds-toast-icon text-[15px] shrink-0 select-none">
            {toast.type === 'error' ? 'info' : 'check'}
          </span>

          <div className="flex flex-col min-w-0 pr-1 leading-tight">
            {toast.title && (
              <span className="ds-toast-title text-[11px] font-semibold truncate">
                {toast.title}
              </span>
            )}
            <span className="ds-toast-message text-[10.5px] font-normal leading-snug break-words">
              {toast.message}
            </span>
          </div>

          {canUndo && onUndo && toast.type !== 'error' && <DSButton type="button" variant="secondary" onClick={() => { onUndo(); onDismiss(toast.id); }} className="ds-toast-undo ml-auto shrink-0">ย้อนกลับ</DSButton>}
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            variant="ghost" className="ds-toast-close shrink-0"
            title="ปิด"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </DSButton>
          <span className="m101-toast-progress" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
};
