import React, { useState, useEffect } from 'react';
import { AVATAR_USER } from '../data/initialData';
import { getThaiFormattedDate, getThaiFormattedTime } from '../utils/thaiDate';
import { ActiveScreen, OnlineUser, UserRole } from '../types';
import { OnlineUsersPod } from './OnlineUsersPod';

interface SidebarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  totalCompaniesCount: number;
  userName?: string;
  userRole?: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout: () => void;
  selectedTopic?: string;
  onSelectTopic?: (topic: string) => void;
  topics?: { name: string; count: number }[];
  onlineUsers?: OnlineUser[];
  mySessionId?: string;
  isPresenceConnected?: boolean;
  onKickMember?: (targetId: string, targetName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  totalCompaniesCount,
  userName = 'Mustang',
  userRole = 'admin',
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
  selectedTopic = 'all',
  onSelectTopic,
  topics = [],
  onlineUsers = [],
  mySessionId = '',
  isPresenceConnected = true,
  onKickMember,
}) => {
  const [time, setTime] = useState(getThaiFormattedTime());
  const [date, setDate] = useState(getThaiFormattedDate());
  const [confirmingKickUser, setConfirmingKickUser] = useState<OnlineUser | null>(null);

  const onlineMembers = onlineUsers.filter(
    (u) => u.role === 'member' && u.id !== mySessionId
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(getThaiFormattedTime(now));
      setDate(getThaiFormattedDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#fbfdfc] border-r border-[#d9e5df] flex flex-col justify-between shrink-0 shadow-sm transition-transform duration-300 select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
          {/* Brand & Portal Header */}
          <div className="p-4 pb-3 border-b border-[#e5eeea]">
            {/* Live Clock Pod */}
            <div className="bg-[#edf6f1] p-3 rounded-2xl border border-[#cde0d6] mb-3 shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-[#1e614d] uppercase font-mono tracking-wider">
                    LIVE CLOCK
                  </span>
                </div>
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  ONLINE
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div className="text-[20px] font-mono font-bold tracking-tight text-[#143c2f] leading-none">
                  {time}
                </div>
                <div className="text-[11px] font-medium text-[#4a7263]">
                  {date}
                </div>
              </div>
            </div>

            {/* Clean Light Profile Pod */}
            <div className={`p-2.5 rounded-2xl border flex items-center justify-between shadow-xs transition-all ${
              userRole === 'admin'
                ? 'bg-gradient-to-r from-amber-50/70 via-white to-amber-50/40 border-amber-200/80 shadow-[0_2px_8px_rgba(245,158,11,0.08)]'
                : 'bg-white border-[#dce8e1]'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    alt="user avatar"
                    className={`w-9 h-9 rounded-xl object-cover ring-2 shadow-xs ${
                      userRole === 'admin' ? 'ring-amber-400' : 'ring-emerald-300'
                    }`}
                    src={AVATAR_USER}
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                    userRole === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}></span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-[#183d31] truncate font-headline">
                      {userName}
                    </span>
                    {userRole === 'admin' ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold font-mono tracking-tight shadow-2xs flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">military_tech</span>
                        Admin
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-semibold font-mono border border-slate-200">
                        Member
                      </span>
                    )}
                  </div>
                  <span className={`text-[10.5px] truncate font-medium ${
                    userRole === 'admin' ? 'text-amber-800' : 'text-[#527568]'
                  }`}>
                    {userRole === 'admin' ? 'ผู้ดูแลระบบสูงสุด (อำนาจสูงสุด)' : 'สมาชิกทั่วไป (Member)'}
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                title="ออกจากระบบ"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px]">
                  logout
                </span>
              </button>
            </div>
          </div>

          {/* Realtime Active Online Users Pod */}
          <OnlineUsersPod
            onlineUsers={onlineUsers}
            mySessionId={mySessionId}
            isConnected={isPresenceConnected}
          />

          {/* Scope Indicator Pill Card */}
          <div className="px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => {
                onNavigate('business-list');
                onCloseMobile?.();
              }}
              className={`w-full rounded-2xl p-2.5 border flex items-center justify-between transition-all cursor-pointer text-left shadow-xs ${
                currentScreen === 'business-list'
                  ? 'bg-[#e3f3ec] border-[#c1e2d2] shadow-sm'
                  : 'border-[#d2e4db] bg-[#eef7f2] hover:bg-[#e4f3eb]'
              }`}
              title="ดูรายการกิจการทั้งหมด"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl border border-emerald-200 bg-emerald-100 text-[#1e614d] flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-[18px]">
                    domain
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-[#143d30] truncate font-headline">
                    ทะเบียนกิจการ
                  </span>
                  <span className="text-[10px] text-[#4d7264] truncate font-mono">
                    ปี 2569 (Active)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-[#cbe0d5] shadow-2xs shrink-0">
                <span className="text-xs font-bold text-emerald-800 font-mono">
                  {totalCompaniesCount}
                </span>
                <span className="text-[10px] text-[#55776c]">แห่ง</span>
              </div>
            </button>
          </div>

          {/* Navigation Tree */}
          <div className="px-3 flex-1 overflow-y-auto no-scrollbar py-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#6c8f82] px-3 mb-2 font-mono">
              เมนูการนำทาง
            </div>
            <nav className="flex flex-col gap-1">
              {/* Nav Item: หน้าแรก (Dashboard) */}
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                  currentScreen === 'dashboard'
                    ? 'bg-[#e3f3ec] text-[#134937] border border-[#c1e2d2] shadow-xs font-bold'
                    : 'text-[#3d6254] hover:text-[#134937] hover:bg-[#edf6f1]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`material-symbols-outlined text-[19px] ${
                      currentScreen === 'dashboard'
                        ? 'text-[#1b7a5a]'
                        : 'text-[#5e8878]'
                    }`}
                  >
                    space_dashboard
                  </span>
                  <span className="font-headline tracking-wide">หน้าแรก (Dashboard)</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-[#1e664e] group-hover:translate-x-0.5 transition-transform">
                  chevron_right
                </span>
              </button>
            </nav>



            <div className="text-[10px] uppercase font-bold tracking-wider text-[#6c8f82] px-3 mt-5 mb-2 font-mono">
              แพลตฟอร์ม
            </div>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => {
                  onNavigate('settings');
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  currentScreen === 'settings'
                    ? 'bg-[#e3f3ec] text-[#134937] font-semibold border border-[#c1e2d2]'
                    : 'text-[#3d6254] hover:text-[#134937] hover:bg-[#edf6f1]'
                }`}
              >
                <span className="material-symbols-outlined text-[19px] text-[#5e8878]">
                  tune
                </span>
                <span className="font-headline tracking-wide">Settings</span>
              </button>
            </nav>
          </div>

          {/* Admin-Only Kick Members Section at the bottom-left */}
          {userRole === 'admin' && (
            <div className="p-3 border-t border-rose-200/80 bg-rose-50/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-rose-800">
                  <span className="material-symbols-outlined text-[17px] text-rose-600">
                    person_remove
                  </span>
                  <span className="text-xs font-bold font-headline">
                    เตะ Member ออกจากระบบ
                  </span>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  {onlineMembers.length} ออนไลน์
                </span>
              </div>

              {onlineMembers.length === 0 ? (
                <div className="py-2 px-2.5 rounded-xl bg-white/90 border border-rose-100 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                  <span>ไม่มี Member ออนไลน์</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto no-scrollbar">
                  {onlineMembers.map((member) => (
                    <div
                      key={member.id}
                      className="p-2 rounded-xl bg-white border border-rose-200 shadow-2xs flex items-center justify-between gap-2 hover:border-rose-300 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-lg text-white font-bold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-2xs"
                          style={{ backgroundColor: member.color || '#10b981' }}
                        >
                          {member.userName ? member.userName.charAt(0) : 'M'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {member.userName}
                          </span>
                          <span className="text-[9.5px] text-slate-500 truncate">
                            {member.currentScreen === 'dashboard'
                              ? 'หน้าแรก'
                              : member.currentScreen === 'business-list'
                              ? 'ทะเบียนกิจการ'
                              : 'Settings'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmingKickUser(member)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
                        title={`เตะ ${member.userName} ออกจากระบบทันที`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          do_not_disturb_on
                        </span>
                        <span>เตะออก</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DBD Sync Status Capsule in Light Pastel Green */}
          <div className="p-3.5 border-t border-[#e2ede8] bg-[#f5faf7]">
            <div className="p-2.5 rounded-xl bg-white border border-[#cce3d7] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#144736]">
                    Thai DBD Sync
                  </span>
                  <span className="text-[9.5px] text-[#507a6d]">
                    Realtime API Link
                  </span>
                </div>
              </div>
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 tracking-wider uppercase border border-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Confirmation Modal for Kicking Member */}
      {confirmingKickUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-rose-200 p-6 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3.5 shadow-inner">
              <span className="material-symbols-outlined text-[32px]">gavel</span>
            </div>

            <h3 className="text-base font-bold text-center text-slate-900 font-headline">
              ยืนยันเตะสมาชิกออกจากระบบ
            </h3>

            <p className="text-xs text-center text-slate-600 mt-1.5 mb-5 leading-relaxed">
              คุณต้องการเตะคุณ <strong className="text-rose-700 font-bold">"{confirmingKickUser.userName}"</strong> ออกจากระบบทันทีหรือไม่?
              <br />
              <span className="text-[11px] text-slate-400">
                (ผู้ใช้จะถูกตัดการเชื่อมต่อและส่งกลับหน้า Login ทันที)
              </span>
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmingKickUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmingKickUser && onKickMember) {
                    onKickMember(confirmingKickUser.id, confirmingKickUser.userName);
                  }
                  setConfirmingKickUser(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">do_not_disturb_on</span>
                <span>ยืนยันเตะออก</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
