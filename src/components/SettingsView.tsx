import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';
import { INITIAL_BUSINESS_RECORDS } from '../data/initialData';
import { getSoundSettings, saveSoundSettings, playUISound } from '../utils/cuteAudio';
import { DSBadge, DSButton, DSInput, DSPageHeader } from '../design-system/components';

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
  const [soundSettings, setSoundSettings] = useState(getSoundSettings);

  const updateSoundSettings = (patch: Partial<typeof soundSettings>) => {
    setSoundSettings((current) => {
      const next = { ...current, ...patch };
      saveSoundSettings(next);
      return next;
    });
  };

  // System form state
  const [appName, setAppName] = useState(config.appName || 'ระบบทะเบียนกิจการ');
  const [appTagline, setAppTagline] = useState(config.appTagline || 'ระบบบริหารจัดการทะเบียนข้อมูลและสถานประกอบการ');

  const handleSaveConfig = () => {
    updateConfig({
      appName: appName.trim() || 'ระบบทะเบียนกิจการ',
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
      link.download = `BusinessRegistry_Backup_Year${selectedYear}_${new Date().toISOString().slice(0, 10)}.json`;
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
        วันที่ผู้สอบ: r.auditorDate,
        สถานะ: r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ',
        หมายเหตุ: r.remark || '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `รอบปี_${selectedYear}`);
      XLSX.writeFile(wb, `BusinessRegistry_Data_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast(`ส่งออก Excel จำนวน ${records.length} รายการเรียบร้อย`, 'ส่งออกสำเร็จ');
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการส่งออก Excel', 'ข้อผิดพลาด', 'error');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors m101-settings">
      {/* Header */}
      <DSPageHeader
        eyebrow="SYSTEM SETTINGS"
        title="การตั้งค่าระบบ"
        description="ข้อมูลระบบ รอบปีบัญชี และการจัดการสำรองข้อมูล"
        className="m101-settings-header"
        actions={<><DSBadge variant="info">รอบปีปัจจุบัน: {selectedYear}</DSBadge><DSBadge variant="neutral">{records.length} กิจการ</DSBadge></>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-6xl m101-settings-grid">
        {/* 1. System Information Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#1b1b1b] flex flex-col gap-5 shadow-xs m101-settings-card">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
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
              <DSInput
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="ระบบทะเบียนกิจการ"
                disabled={!isLoggedIn || !isAdmin}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                คำโปรยระบบ (Tagline)
              </label>
              <DSInput
                type="text"
                value={appTagline}
                onChange={(e) => setAppTagline(e.target.value)}
                placeholder="ระบบบริหารจัดการทะเบียนข้อมูลและสถานประกอบการ"
                disabled={!isLoggedIn}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
              />
            </div>

            {isLoggedIn && isAdmin && (
              <div className="pt-2">
                <DSButton
                  type="button"
                  onClick={handleSaveConfig}
                  variant="primary"
                  className="flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>บันทึกข้อมูลระบบ</span>
                </DSButton>
              </div>
            )}
          </div>
        </div>

        {/* Sound preferences */}
        <section className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#1b1b1b] flex flex-col gap-5 shadow-xs m101-settings-card" aria-labelledby="sound-settings-title">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">volume_down</span>
            </div>
            <div>
              <h3 id="sound-settings-title" className="text-sm font-bold text-slate-900 dark:text-white font-headline">เสียงประกอบ (Sound)</h3>
              <p className="text-[11px] text-slate-400">เสียงสั้น ๆ นุ่มและเบา สำหรับการใช้งานในระบบ</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">เปิดเสียง UI</p>
              <p className="text-[11px] text-slate-500 mt-0.5">ค่าเริ่มต้นปิดไว้ และจำค่าบนอุปกรณ์นี้</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundSettings.enabled}
              onClick={() => updateSoundSettings({ enabled: !soundSettings.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${soundSettings.enabled ? 'bg-slate-700 dark:bg-slate-300' : 'bg-slate-300 dark:bg-slate-700'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white dark:bg-slate-950 transition-transform ${soundSettings.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className={soundSettings.enabled ? 'opacity-100' : 'opacity-45'}>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="m101-sound-volume" className="text-xs font-semibold text-slate-700 dark:text-slate-300">ระดับเสียง</label>
              <span className="text-[11px] tabular-nums text-slate-500">{Math.round(soundSettings.volume * 100)}%</span>
            </div>
            <input
              id="m101-sound-volume"
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              value={soundSettings.volume}
              disabled={!soundSettings.enabled}
              onChange={(event) => updateSoundSettings({ volume: Number(event.target.value) })}
              className="w-full accent-slate-600 cursor-pointer disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">โทนเสียงเบา ไม่แหลม และไม่เล่นซ้ำถี่เกินไป</p>
            <DSButton
              type="button"
              onClick={() => playUISound('success', true)}
              data-sound="off"
              variant="secondary"
            >
              ทดลองเสียง
            </DSButton>
          </div>
        </section>

        {/* 2. Backup & Export Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#1b1b1b] flex flex-col gap-5 shadow-xs m101-settings-card m101-settings-backup">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
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
              <DSButton
                type="button"
                onClick={handleBackupDatabase}
                variant="secondary" className="w-full justify-between ds-settings-action"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-zinc-600 group-hover:scale-110 transition-transform">
                    download
                  </span>
                  <span>สำรองข้อมูล JSON (Backup)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">.json</span>
              </DSButton>
            )}

            {isLoggedIn && (
              <DSButton
                type="button"
                onClick={() => fileRestoreInputRef.current?.click()}
                className="w-full p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700 hover:border-zinc-400 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-zinc-50/50 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-zinc-600 group-hover:scale-110 transition-transform">
                    upload
                  </span>
                  <span>กู้คืนข้อมูล JSON (Restore)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">นำเข้าไฟล์</span>
              </DSButton>
            )}

            {isLoggedIn && (
              <DSButton
                type="button"
                onClick={handleExportExcel}
                variant="primary" className="w-full justify-between ds-settings-action"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-zinc-600 group-hover:scale-110 transition-transform">
                    table_chart
                  </span>
                  <span>ส่งออกไฟล์ Excel ทั้งหมด (.xlsx)</span>
                </div>
                <span className="text-[10px] text-zinc-600 font-mono font-bold">.xlsx</span>
              </DSButton>
            )}

            {isLoggedIn && (
              <p className="m101-settings-security-note">
                <span className="material-symbols-outlined" aria-hidden="true">shield</span>
                ไฟล์ Excel จะไม่ส่งออกรหัสผ่านหรือรหัส e-Filing เพื่อป้องกันข้อมูลลับรั่วไหล หากต้องการสำรองข้อมูลครบทุกช่อง ให้ใช้ JSON Backup และเก็บไฟล์ไว้ในที่ปลอดภัย
              </p>
            )}
          </div>
        </div>

        {/* 3. Dataset Management Card */}
        <div className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 bg-white dark:bg-[#1b1b1b] flex flex-col gap-5 shadow-xs lg:col-span-2 m101-settings-card m101-settings-dataset">
          <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
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
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between gap-3 m101-dataset-option">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    โหลดข้อมูลตัวอย่างเริ่มต้น (69 รายการ)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    เติมข้อมูลนิติบุคคลและสถานประกอบการชุดมาตรฐานลงในรอบปีปัจจุบัน
                  </p>
                </div>
                <DSButton
                  type="button"
                  onClick={() => {
                    if (onResetToDemoData) {
                      onResetToDemoData();
                    } else if (onRestoreRecords) {
                      onRestoreRecords(INITIAL_BUSINESS_RECORDS);
                      onShowToast('โหลดข้อมูลตัวอย่าง 69 รายการเรียบร้อยแล้ว', 'สำเร็จ');
                    }
                  }}
                  variant="secondary" className="w-fit"
                >
                  โหลดข้อมูลตัวอย่าง 69 รายการ
                </DSButton>
              </div>
            )}

            {isLoggedIn && (
              <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-900/50 bg-zinc-50/30 dark:bg-zinc-950/20 flex flex-col justify-between gap-3 m101-dataset-option m101-dataset-danger">
                <div>
                  <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-300">
                    ล้างข้อมูลรอบปีนี้
                  </h4>
                  <p className="text-[11px] text-zinc-600/80 dark:text-zinc-400 mt-1">
                    ลบรายการข้อมูลทั้งหมดเฉพาะรอบปี {selectedYear}
                  </p>
                </div>
                <DSButton
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  variant="danger" className="w-fit"
                >
                  ล้างข้อมูลรอบปี {selectedYear}
                </DSButton>
              </div>
            )}

            {/* Login / Auth Status Card */}
            <div className="p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-900/50 bg-zinc-50/40 dark:bg-zinc-950/20 flex flex-col justify-between gap-3 sm:col-span-2 m101-dataset-option m101-auth-status">
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-zinc-500">lock_person</span>
                  สถานะการเข้าสู่ระบบผู้ดูแล (Admin Login Mode)
                </h4>
                <p className="text-[11px] text-zinc-700 dark:text-zinc-400 mt-1">
                  {isLoggedIn
                    ? 'คุณกำลังเข้าสู่ระบบเป็นผู้ดูแลระบบ (เปิดใช้งานปากกาพิเศษแก้ไขหัวข้อและชื่อระบบ)'
                    : 'คุณอยู่ในสถานะผู้เยี่ยมชมทั่วไป (ซ่อนปากกาพิเศษ แสดงหน้าเว็บแบบมาตรฐานเดิม)'}
                </p>
              </div>
              <DSButton
                type="button"
                onClick={() => {
                  onToggleLogin();
                  onShowToast(
                    isLoggedIn ? 'ออกจากระบบผู้ดูแลแล้ว (ซ่อนปากกาพิเศษ)' : 'เข้าสู่ระบบผู้ดูแลแล้ว (แสดงปากกาพิเศษ)',
                    'สถานะผู้ใช้',
                    'success'
                  );
                }}
                variant={isLoggedIn ? "danger" : "primary"} className="w-fit flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isLoggedIn ? 'logout' : 'login'}
                </span>
                <span>{isLoggedIn ? 'ออกจากระบบ (Log Out)' : 'เข้าสู่ระบบ Admin (Log In)'}</span>
              </DSButton>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clear */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 m101-settings-confirm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-zinc-600">
              <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-center">
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
              <DSButton
                type="button"
                onClick={() => setShowClearConfirm(false)}
                variant="secondary"
              >
                ยกเลิก
              </DSButton>
              <DSButton
                type="button"
                onClick={() => {
                  if (onRestoreRecords) {
                    onRestoreRecords([]);
                  }
                  setShowClearConfirm(false);
                  onShowToast(`ล้างข้อมูลรอบปี ${selectedYear} เรียบร้อยแล้ว`, 'สำเร็จ');
                }}
                variant="danger"
              >
                ยืนยันล้างข้อมูล
              </DSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
