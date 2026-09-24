import React, { useState, useRef, useEffect } from 'react';
import { ActiveScreen, BusinessRecord, UserRole } from '../types';

interface HeaderProps {
  currentScreen: ActiveScreen;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigate: (screen: ActiveScreen) => void;
  onOpenMobileSidebar: () => void;
  onOpenHelp: () => void;
  unreadNotifications?: number;
  records?: BusinessRecord[];
  onEditRecord?: (record: BusinessRecord) => void;
  userName?: string;
  userRole?: UserRole;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenMobileSidebar,
  onOpenHelp,
  unreadNotifications = 1,
  records = [],
  onEditRecord,
  userName = 'Mustang',
  userRole = 'admin',
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter records in real-time for Header quick dropdown
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[-\s]/g, '');

    return records.filter((r) => {
      const cleanTax = r.taxId.replace(/[-\s]/g, '').toLowerCase();
      const cleanSeq = r.sequenceNo.replace(/^[0]+/, '').toLowerCase();
      const rawSeq = r.sequenceNo.toLowerCase();

      return (
        r.companyName.toLowerCase().includes(q) ||
        r.taxId.toLowerCase().includes(q) ||
        cleanTax.includes(cleanQ) ||
        rawSeq.includes(q) ||
        cleanSeq === q ||
        r.auditorDate.toLowerCase().includes(q) ||
        r.eFilingCode.toLowerCase().includes(q) ||
        r.ssoCode.toLowerCase().includes(q) ||
        r.remark.toLowerCase().includes(q) ||
        (r.type === 'company' && 'บริษัทจำกัด'.includes(q)) ||
        (r.type === 'partnership' && 'ห้างหุ้นส่วนจำกัด'.includes(q)) ||
        (r.type === 'individual' && 'บุคคลธรรมดา ร้านค้า'.includes(q)) ||
        (r.status === 'completed' && 'เสร็จแล้ว'.includes(q)) ||
        (r.status === 'in_progress' && 'กำลังทำ'.includes(q)) ||
        (r.status === 'pending' && 'ยังไม่ได้ทำ'.includes(q))
      );
    });
  }, [records, searchQuery]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setShowDropdown(false);
    if (currentScreen !== 'dashboard') {
      onNavigate('dashboard');
    }
  };

  const handleSelectResult = (record: BusinessRecord) => {
    setShowDropdown(false);
    if (currentScreen !== 'dashboard') {
      onNavigate('dashboard');
    }
    if (onEditRecord) {
      onEditRecord(record);
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-[#dfebe4] px-4 sm:px-8 flex items-center justify-between shrink-0 z-30">
      {/* Left side: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-1.5 rounded-lg text-slate-600 hover:bg-[#edf6f1] lg:hidden"
          title="เปิดเมนู"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#4a635a] font-medium overflow-hidden whitespace-nowrap">
          <button
            onClick={() => onNavigate('dashboard')}
            className="hover:text-emerald-800 transition-colors cursor-pointer flex items-center gap-1 text-[#436e5f]"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span className="hidden sm:inline">Portal</span>
          </button>
          <span className="text-[#b2c8be]">/</span>
          <button
            onClick={() => onNavigate('dashboard')}
            className="hover:text-emerald-800 transition-colors cursor-pointer text-[#4a635a]"
          >
            ทะเบียนกิจการ
          </button>
          <span className="text-[#b2c8be]">/</span>
          {currentScreen === 'settings' ? (
            <span className="text-emerald-900 font-bold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200">
              Settings
            </span>
          ) : currentScreen === 'business-list' ? (
            <span className="text-emerald-900 font-bold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200">
              รายชื่อทั้งหมด
            </span>
          ) : (
            <span className="text-emerald-900 font-bold px-2 py-0.5 rounded bg-emerald-100/70 border border-emerald-200">
              2569
            </span>
          )}
        </div>
      </div>

      {/* Right side: Command Palette Search & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Universal Search Container with Live Results Dropdown */}
        <div className="relative w-48 sm:w-80 md:w-96" ref={searchContainerRef}>
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 bg-[#f0f7f3] hover:bg-[#e7f2ec] transition-all px-3 py-1.5 rounded-xl border border-[#d3e3da] focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10"
          >
            <span className="material-symbols-outlined text-[18px] text-[#5d8376]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (searchQuery.trim()) setShowDropdown(true);
              }}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="ค้นหาทุกข้อมูล (ชื่อ, เลขภาษี, รหัส, ไฟล์ที่อัพ, ผู้สอบ)..."
              className="bg-transparent border-none outline-none text-xs text-[#192823] w-full focus:ring-0 placeholder:text-[#6a9083]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setShowDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                title="ล้างข้อความ"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
              </button>
            )}
            <button
              type="submit"
              className="hidden sm:flex items-center gap-1 bg-[#10b981] hover:bg-[#059669] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">search</span>
              <span>ค้นหา</span>
            </button>
          </form>

          {/* Real-time Search Dropdown across all manual & uploaded records */}
          {showDropdown && searchQuery.trim() && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#dce8e1] overflow-hidden z-50 animate-in fade-in zoom-in-95 max-h-80 flex flex-col">
              <div className="p-2.5 bg-[#f5faf7] border-b border-[#edf4f0] flex items-center justify-between text-xs font-bold text-[#143c2f]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">database</span>
                  ผลการค้นหาข้อมูล ({searchResults.length} รายการ)
                </span>
                <span className="text-[10px] text-[#557e70] font-normal">
                  ค้นหาทั้งข้อมูลไฟล์และกรอกเอง
                </span>
              </div>

              <div className="overflow-y-auto divide-y divide-[#edf5f0] no-scrollbar">
                {searchResults.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400">
                    <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">
                      search_off
                    </span>
                    ไม่พบข้อมูลที่ตรงกับ "{searchQuery}"
                  </div>
                ) : (
                  searchResults.slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectResult(r)}
                      className="w-full p-2.5 hover:bg-[#f2f8f5] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold bg-[#edf6f1] text-[#1e614d] px-2 py-0.5 rounded border border-[#cbe0d5] shrink-0">
                          {r.sequenceNo}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-[#193d31] truncate group-hover:text-emerald-700">
                            {r.companyName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 truncate">
                            {r.taxId} {r.remark ? `• ${r.remark}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold ${
                            r.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'in_progress'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {r.status === 'completed'
                            ? 'เสร็จแล้ว'
                            : r.status === 'in_progress'
                            ? 'กำลังทำ'
                            : 'ยังไม่ได้ทำ'}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-emerald-700">
                          edit
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="p-2 bg-[#f8fbf9] border-t border-[#edf4f0] text-center text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
                >
                  ดูทั้งหมดในตาราง ({searchResults.length} รายการ) →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-[#d8e6df] hidden sm:block"></div>

        {/* User Rank Pill in Header */}
        <div className="hidden md:flex items-center gap-1.5">
          {userRole === 'admin' ? (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs"
              title="สถานะ: ผู้มีอำนาจสูงสุด (Admin)"
            >
              <span className="material-symbols-outlined text-[15px] text-amber-600">
                military_tech
              </span>
              <span className="font-headline tracking-tight">Admin</span>
              <span className="text-[9.5px] font-medium text-amber-800 bg-amber-200/70 px-1.5 py-0.2 rounded-full">
                อำนาจสูงสุด
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs"
              title="สถานะ: สมาชิกทั่วไป (Member)"
            >
              <span className="material-symbols-outlined text-[15px] text-emerald-700">
                person
              </span>
              <span className="font-headline tracking-tight">Member</span>
              <span className="text-[9.5px] font-medium text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded-full">
                สมาชิก
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 relative">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 rounded-lg text-[#557e70] hover:text-[#11382b] hover:bg-[#eaf4ef] flex items-center justify-center transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">
                notifications
              </span>
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#dce8e1] p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-[#edf4f0] px-1">
                  <span className="text-xs font-headline font-bold text-[#143c2f]">
                    การแจ้งเตือนระบบ
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold">
                    DBD SYNC
                  </span>
                </div>
                <div className="py-2 flex flex-col gap-2">
                  <div className="p-2 rounded-xl bg-[#f5faf7] border border-[#e2ede8] text-xs flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#183d31]">
                        ข้อมูลตรงตามฐานข้อมูล DBD
                      </span>
                      <span className="text-[11px] text-[#527568] mt-0.5">
                        ระบบซิงค์ข้อมูลนิติบุคคลประจำปี 2569 สำเร็จ
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full text-center text-xs text-emerald-700 font-semibold pt-1 hover:underline"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onOpenHelp}
            className="w-8 h-8 rounded-lg text-[#557e70] hover:text-[#11382b] hover:bg-[#eaf4ef] flex items-center justify-center transition-colors cursor-pointer"
            title="คู่มือการใช้งาน"
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>
        </div>
      </div>
    </header>
  );
};
