import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleButtonProps {
  variant?: 'header' | 'sidebar' | 'pill' | 'icon-only';
  onShowToast?: (message: string, title?: string) => void;
  className?: string;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  variant = 'header',
  onShowToast,
  className = '',
}) => {
  const { isDark, toggleTheme } = useTheme();

  const handleToggle = () => {
    toggleTheme();
    if (onShowToast) {
      if (!isDark) {
        onShowToast('เปิดใช้งานโหมดมืด (Dark Mode)', 'เปลี่ยนธีม');
      } else {
        onShowToast('เปิดใช้งานโหมดสว่าง (Light Mode)', 'เปลี่ยนธีม');
      }
    }
  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={isDark ? 'สลับเป็นโหมดสว่าง (Light)' : 'สลับเป็นโหมดมืด (Dark)'}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent hover:border-slate-200 dark:hover:border-zinc-700 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-amber-500">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
          <span className="font-medium">{isDark ? 'โหมดมืด (Dark)' : 'โหมดสว่าง (Light)'}</span>
        </div>
        <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 dark:bg-zinc-700 transition-colors p-0.5">
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
              isDark ? 'translate-x-4 bg-emerald-500' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={isDark ? 'สลับเป็นโหมดสว่าง (Light)' : 'สลับเป็นโหมดมืด (Dark)'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shadow-xs ${className}`}
      >
        <span className="material-symbols-outlined text-[16px] text-amber-500">
          {isDark ? 'light_mode' : 'dark_mode'}
        </span>
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    );
  }

  // Default: header icon button
  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isDark ? 'สลับเป็นโหมดสว่าง (Light)' : 'สลับเป็นโหมดมืด (Dark)'}
      className={`w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-zinc-700/70 cursor-pointer transition-all shadow-xs ${className}`}
    >
      <span className="material-symbols-outlined text-[18px] text-amber-500">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};
