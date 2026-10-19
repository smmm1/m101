import React from 'react';
import { ActiveScreen } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';

interface SidebarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  totalCompaniesCount: number;
  userName?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  onOpenYearModal?: () => void;
  selectedYear?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  totalCompaniesCount = 0,
  userName = 'Admin User',
  isMobileOpen = false,
  onCloseMobile,
  selectedYear = '69',
}) => {
  const { config } = useSystemConfig();
  const brandName = config.appName && config.appName !== 'Mustang Directory' ? config.appName : 'SchoolHub';

  const mainNavItems = [
    {
      id: 'dashboard' as ActiveScreen,
      label: 'ตารางแสดงข้อมูลและภาพรวม',
      sublabel: 'รายชื่อและสถิติกิจการ',
      icon: 'dashboard',
      badge: totalCompaniesCount,
    },
    {
      id: 'import-docs' as ActiveScreen,
      label: 'นำเข้าเอกสาร',
      sublabel: 'อัปโหลดไฟล์ข้อมูลกิจการ',
      icon: 'upload_file',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#111827] border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-transform duration-200 select-none shadow-[4px_0_24px_rgba(0,0,0,0.02)] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* SchoolHub Brand Header */}
          <div className="p-6 pb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-bold flex items-center justify-center shadow-lg shadow-indigo-600/25">
                <span className="material-symbols-outlined text-[24px]">school</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-900 dark:text-white font-headline tracking-tight truncate">
                    {brandName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/60 dark:border-indigo-800">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 dark:text-slate-400 truncate font-medium">
                  Management Admin Kit
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* SchoolHub Navigation Sections */}
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
            {/* Main Menu */}
            <div className="flex flex-col gap-1.5">
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono flex items-center justify-between">
                <span>MAIN MENU</span>
                <span className="text-[10px] font-normal lowercase text-slate-400 dark:text-slate-400">ปี {selectedYear}</span>
              </div>

              {mainNavItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25 ring-1 ring-indigo-500'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                      </div>
                      <div className="flex flex-col text-left min-w-0">
                        <span className="truncate leading-tight">{item.label}</span>
                        {item.sublabel && (
                          <span
                            className={`text-[10px] font-normal truncate mt-0.5 ${
                              isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-400'
                            }`}
                          >
                            {item.sublabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono shrink-0 ml-2 transition-colors ${
                          isActive
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Helper Banner (SchoolHub Education / Management Style) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-violet-50/60 to-purple-50/40 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300 font-headline">
                  ระบบบริหารทะเบียน 2569
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                นำเข้า ตรวจสอบ และติดตามสถานะนิติบุคคลผ่านระบบโครงสร้าง SchoolHub
              </p>
              <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                <span className="flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  รอบปี 2569 Active
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700">
                  {totalCompaniesCount} รายการ
                </span>
              </div>
            </div>
          </div>

          {/* Bottom SchoolHub User Profile Card */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50">
            <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                    {userName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {userName}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono truncate">
                    Administrator
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate('settings')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="ตั้งค่า"
                >
                  <span className="material-symbols-outlined text-[18px]">tune</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
