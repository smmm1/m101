import React, { useRef, useState, useEffect } from 'react';
import { ActiveScreen } from '../types';
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
  onNavigate,
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
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const { config } = useSystemConfig();

  const screenTitles: Record<ActiveScreen, string> = {
    dashboard: config.dashboardTitle || 'ภาพรวมระบบ (Dashboard)',
    'business-list': config.businessListTitle || 'ทะเบียนกิจการ (Directory)',
    'import-docs': 'นำเข้าเอกสาร (Import Documents)',
    settings: config.settingsTitle || 'การตั้งค่า (Settings)',
    'add-business': 'เพิ่มกิจการใหม่',
  };

  const title = screenTitles[currentScreen] || config.appName;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotificationPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCount = (recordsByYear[selectedYear] || []).length;

  return (
    <header className="h-18 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none transition-colors">
      {/* Hidden File Input for document import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json"
        className="hidden"
        onChange={(e) => {
          if (onFileSelect) {
            onFileSelect(e);
          }
          if (e.target) {
            e.target.value = '';
          }
        }}
      />

      {/* Left side: Mobile Menu + Breadcrumbs Title + Period Badge */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer transition-colors"
          title="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hidden sm:flex items-center justify-center font-bold text-xs border border-indigo-100 dark:border-indigo-900/60">
            <span className="material-symbols-outlined text-[18px]">
              {currentScreen === 'dashboard' ? 'grid_view' : currentScreen === 'business-list' ? 'format_list_bulleted' : 'tune'}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 hidden sm:inline font-mono">
                SchoolHub
              </span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-headline tracking-tight truncate">
                {title}
              </h1>
            </div>
          </div>
        </div>

        {/* SchoolHub Fiscal Period Selector */}
        <div className="relative shrink-0 ml-2" ref={yearDropdownRef}>
          <button
            type="button"
            onClick={() => setShowYearDropdown(!showYearDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 hover:bg-indigo-50/70 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs group"
            title="สลับรอบปีบัญชี"
          >
            <span className="material-symbols-outlined text-[17px] text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              calendar_month
            </span>
            <span>
              รอบปี <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{selectedYear}</span>
            </span>
            <span className="material-symbols-outlined text-[16px] text-slate-400 transition-transform">
              {showYearDropdown ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showYearDropdown && (
            <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-40 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 font-mono flex items-center justify-between">
                <span>เลือกรอบปี (Fiscal Year)</span>
                <span className="text-[9px] text-indigo-600 dark:text-indigo-400">active</span>
              </div>
              <div className="py-1 max-h-56 overflow-y-auto no-scrollbar">
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
                      className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'bg-transparent'}`} />
                        <span>รอบปี <span className="font-mono">{yr}</span></span>
                      </span>
                      <span className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {count} รายการ
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 px-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowYearDropdown(false);
                    onOpenYearModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2 font-semibold cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">settings</span>
                  <span>จัดการและเพิ่มรอบปีใหม่</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: SchoolHub Quick Actions + Dark mode + Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick Import Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          title="นำเข้าไฟล์ Excel (.xlsx, .xls) หรือ JSON"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>นำเข้าเอกสาร</span>
        </button>

        {/* Quick Add Button */}
        {onOpenAddModal && (
          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
            title="เพิ่มกิจการใหม่"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span className="hidden sm:inline">เพิ่มกิจการ</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1" />

        {/* Notification Bell with Badge */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            onClick={() => setShowNotificationPopup(!showNotificationPopup)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 relative cursor-pointer transition-colors"
            title="การแจ้งเตือน"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
          </button>

          {showNotificationPopup && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-40 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white font-headline">
                  การแจ้งเตือน (Notifications)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 font-bold">
                  2 รายการ
                </span>
              </div>
              <div className="py-2 flex flex-col gap-2">
                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-slate-800/80 border border-indigo-100/80 dark:border-slate-700 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0 mt-0.5">school</span>
                  <div className="text-[11px] min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">พร้อมใช้งานธีม SchoolHub</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">ระบบปรับปรุงโครงสร้างตามแบบ SchoolHub เรียบร้อยแล้ว</p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0 mt-0.5">verified</span>
                  <div className="text-[11px] min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white">รอบปี {selectedYear} โหลดข้อมูลสำเร็จ</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px]">พบ {currentCount} รายการพร้อมแสดงผล</p>
                  </div>
                </div>
              </div>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowNotificationPopup(false)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggleButton />

        {/* Profile Avatar Chip */}
        <div
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 pl-1 cursor-pointer group"
          title="ข้อมูลผู้ใช้และตั้งค่า"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xs shadow-xs group-hover:ring-2 ring-indigo-400 transition-all">
            AD
          </div>
        </div>
      </div>
    </header>
  );
};
