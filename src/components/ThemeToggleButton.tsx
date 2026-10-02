import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { XpSunIcon, XpMoonIcon } from './ClassicIcons';

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
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer text-[#52525b] hover:text-[#18181b] hover:bg-[#f2f1ee] border border-transparent hover:border-[#e4e4e7] ${className}`}
      >
        <div className="flex items-center gap-2">
          {isDark ? <XpSunIcon size={16} /> : <XpMoonIcon size={16} />}
          <span>{isDark ? 'โหมดมืด (เปิดอยู่)' : 'โหมดสว่าง (เปิดอยู่)'}</span>
        </div>
        <div className="relative inline-flex h-4.5 w-8 items-center rounded-full bg-neutral-200 dark:bg-neutral-700 transition-colors p-0.5">
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
              isDark ? 'translate-x-3.5 bg-amber-400' : 'translate-x-0'
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] text-xs font-medium text-[#18181b] transition-colors cursor-pointer shadow-2xs ${className}`}
      >
        {isDark ? (
          <>
            <XpSunIcon size={16} />
            <span>โหมดมืด</span>
          </>
        ) : (
          <>
            <XpMoonIcon size={16} />
            <span>โหมดสว่าง</span>
          </>
        )}
      </button>
    );
  }

  // Default 'header' button
  return (
    <button
      type="button"
      onClick={handleToggle}
      title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง (Light Mode)' : 'เปลี่ยนเป็นโหมดมืด (Dark Mode)'}
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#d4d4d8] bg-white hover:bg-[#f4f4f5] text-[#18181b] text-xs font-medium transition-all duration-150 cursor-pointer shadow-2xs active:scale-95 ${className}`}
      aria-label="สลับโหมดมืด/สว่าง"
    >
      <div className="transition-transform duration-300 transform hover:rotate-12">
        {isDark ? <XpSunIcon size={16} /> : <XpMoonIcon size={16} />}
      </div>
      <span className="hidden sm:inline font-mono text-[11.5px]">
        {isDark ? 'โหมดมืด' : 'โหมดสว่าง'}
      </span>
    </button>
  );
};
