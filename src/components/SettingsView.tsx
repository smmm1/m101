import React, { useRef } from 'react';
import { BusinessRecord } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';

interface SettingsViewProps {
  records: BusinessRecord[];
  onShowToast: (msg: string, title?: string) => void;
  onLogout?: () => void;
  onRestoreRecords?: (newRecords: BusinessRecord[]) => void;
  // Optional backwards compatibility
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  onSwitchAccount?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  records,
  onShowToast,
  onLogout,
  onRestoreRecords,
  onSwitchAccount,
}) => {
  const fileRestoreInputRef = useRef<HTMLInputElement>(null);

  // Export JSON Backup
  const handleBackupDatabase = () => {
    try {
      const dataStr = JSON.stringify(records, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mustang_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast(`สำรองฐานข้อมูล ${records.length} รายการเรียบร้อย`, 'สำรองข้อมูล');
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการสำรองข้อมูล', 'ข้อผิดพลาด');
    }
  };

  // Restore JSON Backup
  const handleRestoreDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (onRestoreRecords) {
            onRestoreRecords(parsed);
            onShowToast(`กู้คืนฐานข้อมูล ${parsed.length} รายการสำเร็จ`, 'กู้คืนข้อมูล');
          }
        } else {
          onShowToast('รูปแบบไฟล์ไม่ถูกต้อง', 'ข้อผิดพลาด');
        }
      } catch {
        onShowToast('เกิดข้อผิดพลาดในการอ่านไฟล์', 'ข้อผิดพลาด');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const { config } = useSystemConfig();
  const handleLogoutAction = onLogout || onSwitchAccount;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8f9fc] dark:bg-[#090a0f] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#18181b] font-headline tracking-tight">
            {config.settingsTitle || 'การตั้งค่าระบบ'}
          </h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            {config.settingsSubtitle || 'ปรับแต่งรูปแบบการแสดงผลและจัดการสำรองข้อมูลระบบ'}
          </p>
        </div>

        {handleLogoutAction && (
          <button
            type="button"
            onClick={handleLogoutAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs text-[#71717a] font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>{config.buttonLogoutText || 'ออกจากระบบ'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 max-w-4xl">


        {/* Database & Backup */}
        <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white flex flex-col gap-4 shadow-2xs">
          <div>
            <h2 className="text-xs font-bold text-[#18181b]">
              สำรองและกู้คืนข้อมูล (Database & Backup)
            </h2>
            <p className="text-[11.5px] text-[#71717a] mt-0.5">
              ดาวน์โหลดไฟล์สำรองข้อมูลทั้งระบบเพื่อความปลอดภัย หรือกู้คืนข้อมูลจากไฟล์เดิม
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#fafafa] border border-[#e4e4e7] text-xs">
            <span className="text-[#71717a]">ข้อมูลทั้งหมดในระบบปัจจุบัน</span>
            <span className="font-mono font-bold text-[#18181b]">
              {records.length.toLocaleString()} รายการ
            </span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleBackupDatabase}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>สำรองข้อมูล (JSON Backup)</span>
            </button>

            <button
              type="button"
              onClick={() => fileRestoreInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              <span>กู้คืนข้อมูลจากไฟล์</span>
            </button>

            <input
              ref={fileRestoreInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreDatabase}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
