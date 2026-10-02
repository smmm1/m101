import React, { useRef, useState, useEffect } from 'react';
import { ActiveScreen } from '../types';
import { XpCalendarIcon, XpAddDocIcon } from './ClassicIcons';
import { ThemeToggleButton } from './ThemeToggleButton';

interface HeaderProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  onOpenMobileSidebar: () => void;
  onOpenAddModal?: () => void;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedYear: string;
  availableYears: string[];
  recordsByYear: Record<string, any[]>;
  onSelectYear: (year: string) => void;
  onOpenYearModal: () => void;
  onShowToast?: (message: string, title?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onOpenMobileSidebar,
  onOpenAddModal,
  onFileSelect,
  selectedYear,
  availableYears,
  recordsByYear,
  onSelectYear,
  onOpenYearModal,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  const screenTitles: Record<ActiveScreen, string> = {
    dashboard: 'ภาพรวม',
    'business-list': 'ทะเบียนกิจการ',
    settings: 'การตั้งค่า',
    'add-business': 'เพิ่มกิจการ',
    login: 'เข้าสู่ระบบ',
  };

  const title = screenTitles[currentScreen] || 'Mustang Directory';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-13 bg-white border-b border-[#ececec] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Left side: Hamburger + Title + Year Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1 rounded-md text-neutral-600 hover:bg-neutral-100 lg:hidden cursor-pointer"
          title="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <span className="text-sm font-bold text-[#18181b] font-headline tracking-tight">
          {title}
        </span>

        {/* Year Selector Dropdown Pill */}
        <div className="relative" ref={yearDropdownRef}>
          <button
            type="button"
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f4f4f5] hover:bg-[#ebe8e3] text-[#18181b] border border-[#e4e4e7] text-xs font-semibold font-mono transition-colors cursor-pointer shadow-2xs"
            title="สลับรอบปีบัญชี"
          >
            <XpCalendarIcon size={15} />
            <span>ปี {selectedYear}</span>
            <span className="material-symbols-outlined text-[14px] text-[#71717a]">
              expand_more
            </span>
          </button>

          {showYearDropdown && (
            <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-[#e4e4e7] py-1 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10.5px] font-semibold text-[#a1a1aa] uppercase tracking-wider border-b border-[#f4f4f5]">
                เลือกรอบปี (Year)
              </div>
              <div className="py-1 max-h-48 overflow-y-auto">
                {availableYears.map((yr) => {
                  const isSelected = yr === selectedYear;
                  const count = (recordsByYear[yr] || []).length;

                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        onSelectYear(yr);
                        setShowYearDropdown(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#18181b] text-white font-medium'
                          : 'text-[#18181b] hover:bg-[#f4f4f5]'
                      }`}
                    >
                      <span className="font-mono flex items-center gap-1.5">
                        <XpCalendarIcon size={14} />
                        <span>ปี {yr}</span>
                      </span>
                      <span className={`text-[10.5px] font-mono ${isSelected ? 'text-neutral-300' : 'text-[#71717a]'}`}>
                        {count} รายการ
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-[#f4f4f5] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearDropdown(false);
                    onOpenYearModal();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-[#18181b] hover:bg-[#f4f4f5] flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-neutral-700">add_circle</span>
                  <span>จัดการ / เพิ่มรอบปีใหม่</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Action Buttons */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={onFileSelect}
          className="hidden"
        />

        {/* ปุ่มสลับโทนมืด/สว่าง */}
        <ThemeToggleButton onShowToast={onShowToast} />

        {/* นำเข้าไฟล์ button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#d4d4d8] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          title={`นำเข้าไฟล์ Excel เข้าสู่รอบปี ${selectedYear}`}
        >
          <span className="material-symbols-outlined text-[15px] text-[#52525b]">
            upload
          </span>
          <span className="hidden sm:inline">นำเข้าไฟล์</span>
        </button>

        {/* เพิ่มกิจการ button */}
        {onOpenAddModal && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <XpAddDocIcon size={15} />
            <span className="hidden sm:inline">เพิ่มกิจการ</span>
          </button>
        )}
      </div>
    </header>
  );
};
