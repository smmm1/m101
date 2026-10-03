import React from 'react';
import { ActiveScreen } from '../types';
import { XpComputerIcon, XpFolderIcon, XpSettingsIcon, XpLogoffIcon } from './ClassicIcons';
import { ThemeToggleButton } from './ThemeToggleButton';

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
  userName = 'Mustang',
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
}) => {
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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-48 bg-[#fbfbfb] border-r border-zinc-200/80 flex flex-col justify-between shrink-0 transition-transform duration-200 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Header */}
          <div className="p-3 border-b border-zinc-200/60">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                M
              </div>
              <span className="text-xs font-bold text-zinc-900 font-headline tracking-tight">
                Mustang
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="p-2.5 flex-1 overflow-y-auto no-scrollbar">
            <nav className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onNavigate('dashboard');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  currentScreen === 'dashboard'
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 font-medium'
                }`}
              >
                <XpComputerIcon size={16} />
                <span>ภาพรวม</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('business-list');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  currentScreen === 'business-list'
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 font-medium'
                }`}
              >
                <XpFolderIcon size={16} />
                <span>ทะเบียนกิจการ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onNavigate('settings');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                  currentScreen === 'settings'
                    ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 font-medium'
                }`}
              >
                <XpSettingsIcon size={16} />
                <span>การตั้งค่า</span>
              </button>


            </nav>
          </div>

          {/* Bottom Profile Footer */}
          <div className="p-3 border-t border-[#f0f0f0]">
            <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#f2f1ee] transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-slate-700 to-slate-950 text-white font-semibold text-[11px] flex items-center justify-center shrink-0 border border-slate-500/30">
                  {userName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-[#18181b] truncate">
                  {userName}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                title="ออกจากระบบ"
                className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <XpLogoffIcon size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
