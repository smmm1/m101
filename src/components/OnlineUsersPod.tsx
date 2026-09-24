import React, { useState } from 'react';
import { OnlineUser } from '../types';

interface OnlineUsersPodProps {
  onlineUsers: OnlineUser[];
  mySessionId: string;
  isConnected: boolean;
}

export const OnlineUsersPod: React.FC<OnlineUsersPodProps> = ({
  onlineUsers,
  mySessionId,
  isConnected,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getScreenLabel = (screen: string) => {
    switch (screen) {
      case 'business-list':
        return 'ทะเบียนกิจการ';
      case 'settings':
        return 'หน้าตั้งค่า';
      case 'dashboard':
      default:
        return 'หน้าแรก';
    }
  };

  // Safe fallback if onlineUsers is empty: show at least 1 (the connected client)
  const displayUsers = onlineUsers.length > 0 ? onlineUsers : [];

  return (
    <div className="mx-3.5 mb-2.5">
      <div className="bg-white rounded-2xl border border-[#dce8e1] p-3 shadow-xs transition-all hover:border-[#c3ddd0]">
        {/* Header of the Small Box */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
              )}
            </span>
            <span className="text-xs font-bold text-[#143c2f] font-headline">
              กำลังออนไลน์
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {displayUsers.length} คน
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
              title={isExpanded ? 'ย่อลง' : 'ขยายออก'}
            >
              <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                expand_more
              </span>
            </button>
          </div>
        </div>

        {/* User List Content: Online Status Only */}
        {isExpanded && (
          <div className="mt-2.5 flex flex-col gap-1.5 pt-2 border-t border-[#edf4f0] max-h-44 overflow-y-auto no-scrollbar">
            {displayUsers.length === 0 ? (
              <div className="text-[11px] text-slate-400 py-1 text-center italic">
                กำลังเชื่อมต่อข้อมูลผู้ใช้งาน...
              </div>
            ) : (
              displayUsers.map((u) => {
                const isMe = u.id === mySessionId;
                const initial = (u.userName || 'U').charAt(0).toUpperCase();

                return (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-1.5 rounded-xl transition-colors ${
                      isMe ? 'bg-[#f0f8f4] border border-[#d6ebe0]' : 'hover:bg-[#f8fbf9]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono text-white shrink-0 shadow-2xs"
                        style={{ backgroundColor: u.color || '#10b981' }}
                      >
                        {initial}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-xs font-bold text-[#183d31] truncate">
                            {u.userName || 'ผู้ใช้งาน'}
                          </span>
                          {u.role === 'admin' ? (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-0.5">
                              <span>👑</span>
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-medium px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              Member
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 shrink-0">
                              คุณ
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#557e70] truncate flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                          {getScreenLabel(u.currentScreen)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center shrink-0 ml-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
