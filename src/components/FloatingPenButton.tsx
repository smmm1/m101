import React from 'react';

interface FloatingPenButtonProps {
  onOpenModal: () => void;
  isLoggedIn: boolean;
}

export const FloatingPenButton: React.FC<FloatingPenButtonProps> = ({ onOpenModal, isLoggedIn }) => {
  if (!isLoggedIn) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 group flex items-center">
      {/* Tooltip on hover */}
      <div className="absolute right-16 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 text-xs font-bold shadow-xl whitespace-nowrap transition-all duration-200 pointer-events-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0">
        แก้ไขหัวข้อและชื่อระบบ (ปากกาพิเศษ)
      </div>

      <button
        type="button"
        onClick={onOpenModal}
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl backdrop-blur-md border bg-amber-500 text-slate-900 border-amber-300 ring-4 ring-amber-400/40 hover:scale-110"
        title="ปากกาพิเศษแก้ไขหัวข้อ"
      >
        <span className="material-symbols-outlined text-[26px]">edit_square</span>
      </button>
    </div>
  );
};
