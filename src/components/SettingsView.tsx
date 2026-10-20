import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';
import { INITIAL_BUSINESS_RECORDS } from '../data/initialData';

interface SettingsViewProps {
  records: BusinessRecord[];
  selectedYear: string;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
  onRestoreRecords?: (newRecords: BusinessRecord[]) => void;
  onResetToDemoData?: () => void;
  isLoggedIn: boolean;
  isAdmin: boolean;
  onToggleLogin: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  records,
  selectedYear,
  onShowToast,
  onRestoreRecords,
  onResetToDemoData,
  isLoggedIn,
  isAdmin,
  onToggleLogin,
}) => {
  const fileRestoreInputRef = useRef<HTMLInputElement>(null);
  const { config, updateConfig } = useSystemConfig();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // System form state
  const [appName, setAppName] = useState(config.appName || 'SchoolHub');
  const [appTagline, setAppTagline] = useState(config.appTagline || 'ระบบบริหารจัดการทะเบียนข้อมูลและสถานประกอบการ');

  const handleSaveConfig = () => {
    updateConfig({
      appName: appName.trim() || 'SchoolHub',
      appTagline: appTagline.trim() || 'ระบบบริหารจัดการทะเบียนข้อมูลและสถานประกอบการ',
    });
    onShowToast('บันทึกการตั้งค่าเรียบร้อยแล้ว', 'บันทึกสำเร็จ');
  };

  // Export JSON Backup
  const handleBackupDatabase = () => {
    try {
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SchoolHub_Backup_Year${selectedYear}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onShowToast(`สำรองข้อมูลปี ${selectedYear} จำนวน ${records.length} รายการแล้ว`, 'สำรองข้อมูลสำเร็จ');
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการสำรองข้อมูล', 'ข้อผิดพลาด', 'error');
    }
  };

  // Restore JSON Backup
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      onShowToast('ไฟล์สำรองใหญ่เกินไป (จำกัด 10 MB)', 'ไฟล์ใหญ่เกินไป', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((item) =>
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            typeof item.companyName === 'string' &&
            item.companyName.trim().length > 0
          )
        ) {
          if (onRestoreRecords) {
            onRestoreRecords(parsed);
            onShowToast(`กู้คืนข้อมูล ${parsed.length} รายการสำเร็จ`, 'กู้คืนสำเร็จ');
          }
        } else {
          onShowToast('ไฟล์สำรองไม่ถูกต้อง หรือไม่มีรายการข้อมูล', 'ข้อผิดพลาด', 'error');
        }
      } catch {
        onShowToast('เกิดข้อผิดพลาดในการอ่านไฟล์สำรอง', 'ข้อผิดพลาด', 'error');
      }
    };
    reader.onerror = () => {
      onShowToast('อ่านไฟล์สำรองไม่สำเร็จ กรุณาลองใหม่', 'ข้อผิดพลาด', 'error');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export all to Excel
  const handleExportExcel = () => {
    try {
      if (records.length === 0) {
        onShowToast('ไม่มีข้อมูลสำหรับส่งออก', 'แจ้งเตือน', 'info');
        return;
      }
      const rows = records.map((r, idx) => ({
        ลำดับ: r.sequenceNo || idx + 1,
        ชื่อกิจการ: r.companyName,
        ประเภท: r.type === 'company' ? 'บริษัทจำกัด' : r.type === 'partnership' ? 'ห้างหุ้นส่วน' : 'บุคคลธรรมดา',
        เลขประจำตัวผู้เสียภาษี: r.taxId,
        รหัสผ่าน: r.password,
        'e-Filing': r.eFilingCode,
        วันที่ผู้สอบ: r.auditorDate,
        สถานะ: r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ',
        หมายเหตุ: r.remark || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `รอบปี_${selectedYear}`);
      XLSX.writeFile(wb, `SchoolHub_Data_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast(`ส่งออก Excel จำนวน ${records.length} รายการเรียบร้อย`, 'ส่งออกสำเร็จ');
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการส่งออก Excel', 'ข้อผิดพลาด', 'error');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-headline tracking-tight">
            การตั้งค่าระบบ (Settings)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ข้อมูลระบบ รอบปีบัญชี และการจัดการสำรองข้อมูล
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-xs font-bold font-mono">
            รอบปีปัจจุบัน: {selectedYear}
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono border border-slate-200/80 dark:border-slate-700">
            {records.length} กิจการ
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* 1. System Information Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#131B2E] flex flex-col gap-5 shadow-xs">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">tune</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-headline">
                ข้อมูลระบบ (System Info)
              </h3>
              <p className="text-[11px] text-slate-400">ชื่อระบบและคำอธิบายหลัก</p>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                ชื่อระบบ (Application Name)
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="SchoolHub"
                disabled={!isLoggedIn || !isAdmin}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                คำโปรยระบบ (Tagline)
              </label>
              <input
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="ระบบบริหารจัดการทะเบียนข้อมูลและสถานประกอบการ"
                disabled={!isLoggedIn}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            {isLoggedIn && isAdmin && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>บันทึกข้อมูลระบบ</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Backup & Export Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#131B2E] flex flex-col gap-5 shadow-xs">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">backup</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-headline">
                สำรองและส่งออกข้อมูล (Backup & Export)
              </h3>
              <p className="text-[11px] text-slate-400">ดาวน์โหลดและกู้คืนไฟล์ข้อมูลรอบปี</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <input
              ref={fileRestoreInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleRestoreDatabase}
            />

            {isLoggedIn && (
              <button
                type="button"
                onClick={handleBackupDatabase}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-indigo-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-indigo-600 group-hover:scale-110 transition-transform">
                    download
                  </span>
                  <span>สำรองข้อมูล JSON (Backup)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">.json</span>
              </button>
            )}

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => fileRestoreInputRef.current?.click()}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-indigo-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-indigo-600 group-hover:scale-110 transition-transform">
                    upload
                  </span>
                  <span>กู้คืนข้อมูล JSON (Restore)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">นำเข้าไฟล์</span>
              </button>
            )}

            {isLoggedIn && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-emerald-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600 group-hover:scale-110 transition-transform">
                    table_chart
                  </span>
                  <span>ส่งออกไฟล์ Excel ทั้งหมด (.xlsx)</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-mono font-bold">.xlsx</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Dataset Management Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#131B2E] flex flex-col gap-5 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">dataset</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-headline">
                จัดการชุดข้อมูล (Dataset Management)
              </h3>
              <p className="text-[11px] text-slate-400">
                รีเซ็ตข้อมูลเริ่มต้น หรือล้างข้อมูลรอบปี
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoggedIn && (
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    โหลดข้อมูลตัวอย่างเริ่มต้น (69 รายการ)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    เติมข้อมูลนิติบุคคลและสถานประกอบการชุดมาตรฐานลงในรอบปีปัจจุบัน
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onResetToDemoData) {
                      onResetToDemoData();
                    } else if (onRestoreRecords) {
                      onRestoreRecords(INITIAL_BUSINESS_RECORDS);
                      onShowToast('โหลดข้อมูลตัวอย่าง 69 รายการเรียบร้อยแล้ว', 'สำเร็จ');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors w-fit"
                >
                  โหลดข้อมูลตัวอย่าง 69 รายการ
                </button>
              </div>
            )}

            {isLoggedIn && (
              <div className="p-4 rounded-2xl border border-rose-200/70 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    ล้างข้อมูลรอบปีนี้
                  </h4>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400 mt-1">
                    ลบรายการข้อมูลทั้งหมดเฉพาะรอบปี {selectedYear}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors w-fit"
                >
                  ล้างข้อมูลรอบปี {selectedYear}
                </button>
              </div>
            )}

            {/* Login / Auth Status Card */}
            <div className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between gap-3 sm:col-span-2">
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">lock_person</span>
                  สถานะการเข้าสู่ระบบผู้ดูแล (Admin Login Mode)
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                  {isLoggedIn
                    ? 'คุณกำลังเข้าสู่ระบบเป็นผู้ดูแลระบบ (เปิดใช้งานปากกาพิเศษแก้ไขหัวข้อและชื่อระบบ)'
                    : 'คุณอยู่ในสถานะผู้เยี่ยมชมทั่วไป (ซ่อนปากกาพิเศษ แสดงหน้าเว็บแบบมาตรฐานเดิม)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onToggleLogin();
                  onShowToast(
                    isLoggedIn ? 'ออกจากระบบผู้ดูแลแล้ว (ซ่อนปากกาพิเศษ)' : 'เข้าสู่ระบบผู้ดูแลแล้ว (แสดงปากกาพิเศษ)',
                    'สถานะผู้ใช้',
                    'success'
                  );
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors w-fit flex items-center gap-1.5 ${
                  isLoggedIn
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isLoggedIn ? 'logout' : 'login'}
                </span>
                <span>{isLoggedIn ? 'ออกจากระบบ (Log Out)' : 'เข้าสู่ระบบ Admin (Log In)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">ยืนยันการล้างข้อมูล</h4>
                <p className="text-xs text-slate-500">ข้อมูลรอบปี {selectedYear} จะถูกลบ</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมดในรอบปี <strong>{selectedYear}</strong>? รายการทั้งหมด {records.length} รายการจะถูกล้างออกจากระบบ
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onRestoreRecords) {
                    onRestoreRecords([]);
                  }
                  setShowClearConfirm(false);
                  onShowToast(`ล้างข้อมูลรอบปี ${selectedYear} เรียบร้อยแล้ว`, 'สำเร็จ');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md cursor-pointer"
              >
                ยืนยันล้างข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
