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
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  totalCompaniesCount = 0,
  userName = 'Mustang',
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
  const { config } = useSystemConfig();
  const brandName = config.appName || 'Mustang Directory';
  const brandInitial = config.appInitial || 'M';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-56 bg-white dark:bg-[#0c0d14] border-r border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between shrink-0 transition-transform duration-200 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Reference Modern SaaS Brand Header (Using user's app name & branding) */}
          <div className="p-6 pb-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold flex items-center justify-center text-xs shadow-xs tracking-tight">
                {brandInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-headline tracking-tight truncate leading-tight">
                  {brandName}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">
                  SaaS Dashboard
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items (Reference Layout) */}
          <div className="p-3 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-6">
            {/* Main Navigation Section */}
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Reports & Data
              </div>

              <button
                type="button"
                onClick={() => {
                  onNavigate('dashboard');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  currentScreen === 'dashboard'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">monitoring</span>
                  <span>{config.menuDashboard || 'Reports (ภาพรวม)'}</span>
                </div>
                {totalCompaniesCount > 0 && (
                  <span
                    className={`text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full ${
                      currentScreen === 'dashboard'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {totalCompaniesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('business-list');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  currentScreen === 'business-list'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">folder_managed</span>
                <span>{config.menuBusinessList || 'Library (ทะเบียนกิจการ)'}</span>
              </button>
            </div>

            {/* Support Section */}
            <div className="flex flex-col gap-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Support & Setup
              </div>

              <button
                type="button"
                onClick={() => {
                  onNavigate('settings');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  currentScreen === 'settings'
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                <span>{config.menuSettings || 'Settings (การตั้งค่า)'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Profile Footer & Backend Tool Button */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-zinc-800 to-black text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                    {userName}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate leading-tight">
                    Admin User
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Admin Backend Tool Icon (Bottom-Left explicit access) */}
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('backend-admin');
                    onCloseMobile?.();
                  }}
                  title="ระบบหลังบ้าน (Admin Console)"
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    currentScreen === 'backend-admin'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px] leading-none">
                    build
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[17px] leading-none">
                    logout
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
