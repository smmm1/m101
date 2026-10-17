import React, { useRef, useState, useEffect } from 'react';
import { ActiveScreen } from '../types';
import { XpCalendarIcon, XpAddDocIcon } from './ClassicIcons';
import { ThemeToggleButton } from './ThemeToggleButton';
import { useSystemConfig } from '../context/SystemConfigContext';

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
  const { config } = useSystemConfig();

  const screenTitles: Record<ActiveScreen, string> = {
    dashboard: config.dashboardTitle || 'ภาพรวม',
    'business-list': config.businessListTitle || 'ทะเบียนกิจการ',
    settings: config.settingsTitle || 'การตั้งค่า',
    'add-business': 'เพิ่มกิจการ',
    login: 'เข้าสู่ระบบ',
    'backend-admin': config.adminTitle || 'ระบบหลังบ้าน (Admin Console)',
  };

  const title = screenTitles[currentScreen] || config.appName;

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
    <header className="h-14 bg-white/85 dark:bg-[#0c0d14]/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none transition-colors">
      {/* Left side: Hamburger + Breadcrumb/Title + Year Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden cursor-pointer transition-colors"
          title="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            Directory
          </span>
          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 font-headline tracking-tight truncate">
            {title}
          </h1>
        </div>

        {/* Year Selector Dropdown Pill */}
        <div className="relative shrink-0" ref={yearDropdownRef}>
          <button
            type="button"
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 text-xs font-medium transition-all cursor-pointer shadow-2xs"
            title="สลับรอบปีบัญชี"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold">ปี {selectedYear}</span>
            <span className="material-symbols-outlined text-[15px] text-zinc-400 dark:text-zinc-500 transition-transform">
              {showYearDropdown ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showYearDropdown && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                เลือกรอบปี (Fiscal Year)
              </div>
              <div className="py-1 max-h-52 overflow-y-auto no-scrollbar">
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
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-transparent'}`} />
                        <span>รอบปี <span className="font-mono">{yr}</span></span>
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums ${isSelected ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'}`}>
                        {count} รายการ
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearDropdown(false);
                    onOpenYearModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-zinc-500">settings</span>
                  <span>จัดการ / เพิ่มรอบปี</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {config.systemNotice && <span className="hidden max-w-64 truncate rounded-lg border px-2 py-1 text-[10px] sm:inline" style={{ borderColor: 'var(--site-border)', color: 'var(--site-muted-text)' }} title={config.systemNotice}>{config.systemNotice}</span>}
        {currentScreen === 'business-list' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={onFileSelect}
              className="hidden"
            />

            {/* นำเข้าไฟล์ button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="button-24"
              title={`นำเข้าไฟล์ Excel เข้าสู่รอบปี ${selectedYear}`}
            >
              <span className="material-symbols-outlined text-[16px]">
                upload_file
              </span>
              <span>{config.buttonImportText || 'นำเข้าไฟล์'}</span>
            </button>

            {/* เพิ่มกิจการ button */}
            {onOpenAddModal && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="button-24"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>{config.buttonAddText || 'เพิ่มกิจการ'}</span>
              </button>
            )}
          </>
        )}

        <ThemeToggleButton />
      </div>
    </header>
  );
};
