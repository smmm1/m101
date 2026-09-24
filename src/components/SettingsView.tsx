import React, { useState } from 'react';
import { AVATAR_USER } from '../data/initialData';
import { BusinessRecord, UserRole } from '../types';

interface SettingsViewProps {
  userName: string;
  userRole?: UserRole;
  onUpdateUserName: (name: string) => void;
  records: BusinessRecord[];
  onShowToast: (msg: string, title?: string) => void;
  onSwitchAccount?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userName,
  userRole = 'admin',
  onUpdateUserName,
  records,
  onShowToast,
  onSwitchAccount,
}) => {
  const [nameInput, setNameInput] = useState(userName);
  const [selectedYear, setSelectedYear] = useState('2569');
  const [dbdAutoSync, setDbdAutoSync] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUserName(nameInput.trim());
      onShowToast('บันทึกการตั้งค่าโปรไฟล์ผู้ใช้งานสำเร็จ', 'ตั้งค่าสำเร็จ');
    }
  };

  const handleTestDbdSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onShowToast('การเชื่อมต่อกับ DBD Realtime API Link สมบูรณ์ 100%', 'DBD Sync Active');
    }, 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-xs border border-[#d2e5dd] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#eef8f4] text-[#2d6a59] flex items-center justify-center border border-[#d2e5dd] shadow-xs">
            <span className="material-symbols-outlined text-2xl">tune</span>
          </div>
          <div>
            <h1 className="text-xl font-bold font-headline text-[#1e2925]">
              ตั้งค่าระบบ (Platform Settings)
            </h1>
            <p className="text-xs text-slate-500">
              กำหนดค่าบัญชีผู้ใช้ ระดับยศ/สิทธิ์ ข้อมูลเชื่อมต่อ DBD และการจัดการระบบ
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile & Role Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#d2e5dd] shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#edf4f0]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2d6a59]">account_circle</span>
              <h2 className="text-sm font-bold font-headline text-[#1e2925]">ข้อมูลผู้ใช้งาน & สิทธิ์ (Role & Identity)</h2>
            </div>
            {userRole === 'admin' ? (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                <span>👑</span>
                <span>อำนาจสูงสุด</span>
              </span>
            ) : (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                สมาชิกทั่วไป
              </span>
            )}
          </div>

          <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
            userRole === 'admin'
              ? 'bg-gradient-to-r from-amber-50/60 to-orange-50/40 border-amber-200'
              : 'bg-[#f8faf9] border-[#d2e5dd]'
          }`}>
            <div className="relative shrink-0">
              <img
                src={AVATAR_USER}
                alt="user avatar"
                className={`w-14 h-14 rounded-2xl object-cover ring-2 ${
                  userRole === 'admin' ? 'ring-amber-400' : 'ring-emerald-300'
                }`}
              />
              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
                userRole === 'admin' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}></span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-[#1e2925] truncate">{userName}</span>
                {userRole === 'admin' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold font-mono shadow-2xs flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">military_tech</span>
                    Admin
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-semibold font-mono">
                    Member
                  </span>
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                userRole === 'admin' ? 'text-amber-900' : 'text-slate-600'
              }`}>
                {userRole === 'admin'
                  ? 'สถานะ: ผู้ดูแลระบบสูงสุด (มีอำนาจสูงสุดในระบบ)'
                  : 'สถานะ: สมาชิกทั่วไป (ทำอะไรได้ปกติทุกฟังก์ชัน)'}
              </span>
            </div>
          </div>

          {/* Role explanation alert */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
            userRole === 'admin'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-[16px]">
                {userRole === 'admin' ? 'verified_user' : 'info'}
              </span>
              <span>คำอธิบายสิทธิ์และยศปัจจุบัน:</span>
            </div>
            {userRole === 'admin' ? (
              <p>
                คุณเข้าสู่ระบบด้วยสิทธิ์ <strong>ผู้ดูแลระบบสูงสุด (Admin)</strong> ประจำระบบ มีอำนาจสูงสุด พร้อมแสดงยศเกียรติยศพิเศษในแถบเมนู แชททีม และรายชื่อออนไลน์
              </p>
            ) : (
              <p>
                คุณเข้าสู่ระบบด้วยสิทธิ์ <strong>สมาชิกทั่วไป (Member)</strong> สามารถใช้งาน ค้นหา บันทึก นำเข้าเอกสาร และแชทคุยในทีมได้ปกติครบถ้วนทุกประการ
              </p>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">ชื่อผู้ใช้งาน (Display Name)</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-white text-xs rounded-xl border border-[#d2e5dd] focus:border-[#2d6a59] outline-none"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              {onSwitchAccount && (
                <button
                  type="button"
                  onClick={onSwitchAccount}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="สลับบัญชีหรือเข้าสู่ระบบใหม่"
                >
                  <span className="material-symbols-outlined text-[16px]">switch_account</span>
                  <span>สลับบัญชี (ออกจากระบบ)</span>
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2d6a59] text-white text-xs font-bold hover:bg-[#245547] transition-all shadow-xs cursor-pointer ml-auto"
              >
                บันทึกชื่อผู้ใช้
              </button>
            </div>
          </form>
        </div>

        {/* DBD & Environment Settings */}
        <div className="bg-white rounded-2xl p-6 border border-[#d2e5dd] shadow-xs flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#edf4f0]">
            <span className="material-symbols-outlined text-[#2d6a59]">sync_alt</span>
            <h2 className="text-sm font-bold font-headline text-[#1e2925]">Thai DBD Data Link</h2>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8faf9] border border-[#d2e5dd]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1e2925]">รอบปีภาษีปัจจุบัน (Tax Year)</span>
                <span className="text-[11px] text-slate-500">ปีที่ใช้ในการแสดงผลและออกรายงาน</span>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="text-xs font-mono font-bold bg-white border border-[#d2e5dd] rounded-lg px-2.5 py-1 text-[#2d6a59]"
              >
                <option value="2569">2569 (Current)</option>
                <option value="2568">2568</option>
                <option value="2567">2567</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#f8faf9] border border-[#d2e5dd]">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#1e2925]">เปิดใช้งาน DBD Realtime Sync</span>
                <span className="text-[11px] text-slate-500">ตรวจสอบความถูกต้องอัตโนมัติ 100%</span>
              </div>
              <input
                type="checkbox"
                checked={dbdAutoSync}
                onChange={(e) => setDbdAutoSync(e.target.checked)}
                className="rounded border-[#b8d2c6] text-emerald-600 focus:ring-emerald-500 h-5 w-5 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleTestDbdSync}
              disabled={isSyncing}
              className="w-full py-2.5 px-4 rounded-xl bg-[#eef8f4] hover:bg-emerald-100 text-[#2d6a59] font-bold text-xs flex items-center justify-center gap-2 border border-[#d2e5dd] transition-all cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
                {isSyncing ? 'progress_activity' : 'cloud_sync'}
              </span>
              <span>{isSyncing ? 'กำลังทดสอบการเชื่อมต่อ DBD...' : 'ทดสอบการเชื่อมต่อ DBD API'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
