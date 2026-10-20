import React, { useState } from 'react';
import { useSystemConfig } from '../context/SystemConfigContext';

interface EditTitlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditTitlesModal: React.FC<EditTitlesModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const { config, updateConfig, resetConfig } = useSystemConfig();

  const [appName, setAppName] = useState(config.appName);
  const [appTagline, setAppTagline] = useState(config.appTagline);
  const [dashboardTitle, setDashboardTitle] = useState(config.dashboardTitle);
  const [dashboardSubtitle, setDashboardSubtitle] = useState(config.dashboardSubtitle);
  const [businessListTitle, setBusinessListTitle] = useState(config.businessListTitle);
  const [businessListSubtitle, setBusinessListSubtitle] = useState(config.businessListSubtitle);
  const [settingsTitle, setSettingsTitle] = useState(config.settingsTitle);
  const [settingsSubtitle, setSettingsSubtitle] = useState(config.settingsSubtitle);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfig({
      appName: appName.trim() || 'Mustang Directory',
      appTagline: appTagline.trim() || 'ระบบบริหารจัดการนิติบุคคลและทะเบียนกิจการ',
      dashboardTitle: dashboardTitle.trim() || 'ภาพรวมระบบ',
      dashboardSubtitle: dashboardSubtitle.trim() || 'ติดตามสถานะการดำเนินงาน',
      businessListTitle: businessListTitle.trim() || 'ทะเบียนกิจการทั้งหมด',
      businessListSubtitle: businessListSubtitle.trim() || 'รายชื่อนิติบุคคล',
      settingsTitle: settingsTitle.trim() || 'การตั้งค่าระบบ',
      settingsSubtitle: settingsSubtitle.trim() || 'ปรับแต่งรูปแบบการแสดงผล',
    });
    onShowToast('บันทึกการแก้ไขหัวข้อและชื่อระบบเรียบร้อยแล้ว', 'บันทึกสำเร็จ', 'success');
    onClose();
  };

  const handleReset = () => {
    if (window.confirm('ต้องการรีเซ็ตหัวข้อทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      resetConfig();
      onShowToast('รีเซ็ตหัวข้อกลับเป็นค่าเริ่มต้นเรียบร้อย', 'รีเซ็ตสำเร็จ', 'info');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Box */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150 font-body flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[22px]">edit_square</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-headline">
                เครื่องมือปากกาพิเศษ: แก้ไขหัวข้อและชื่อระบบ
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ปรับแต่งหัวข้อหลักและหัวข้อรองในแต่ละหน้าได้ทันทีอย่างอิสระ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
          
          {/* Section 1: Brand & Tagline */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-headline">
              1. ชื่อระบบและคำโปรยหลัก
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">ชื่อระบบ (App Name)</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">คำโปรย (Tagline)</label>
                <input
                  type="text"
                  value={appTagline}
                  onChange={(e) => setAppTagline(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dashboard Titles */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-headline">
              2. หน้าภาพรวม (Dashboard)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อหลัก</label>
                <input
                  type="text"
                  value={dashboardTitle}
                  onChange={(e) => setDashboardTitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อรอง (Subtitle)</label>
                <input
                  type="text"
                  value={dashboardSubtitle}
                  onChange={(e) => setDashboardSubtitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Directory Titles */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-headline">
              3. ทะเบียนกิจการ (Directory)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อหลัก</label>
                <input
                  type="text"
                  value={businessListTitle}
                  onChange={(e) => setBusinessListTitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อรอง (Subtitle)</label>
                <input
                  type="text"
                  value={businessListSubtitle}
                  onChange={(e) => setBusinessListSubtitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Settings Titles */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-headline">
              4. หน้าการตั้งค่า (Settings)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อหลัก</label>
                <input
                  type="text"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">หัวข้อรอง (Subtitle)</label>
                <input
                  type="text"
                  value={settingsSubtitle}
                  onChange={(e) => setSettingsSubtitle(e.target.value)}
                  className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-amber-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>คืนค่าเริ่มต้น</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>บันทึกหัวข้อทั้งหมด</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
