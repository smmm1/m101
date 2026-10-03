import React, { useRef, useState } from 'react';
import { BusinessRecord } from '../types';
import { useCursor, CursorMode } from '../context/CursorContext';

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
  const { cursorMode, setCursorMode } = useCursor();

  const handleSelectCursor = (mode: CursorMode) => {
    setCursorMode(mode);
    const label =
      mode === 'classic'
        ? 'เมาส์ Windows XP คลาสสิก'
        : mode === 'modern'
        ? 'เมาส์โมเดิร์น แม่นยำ'
        : 'เมาส์ปกติของระบบ';
    onShowToast(`เปลี่ยนรูปแบบตัวชี้เมาส์เป็น "${label}" แล้ว`, 'เปลี่ยนเมาส์สำเร็จ');
  };

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

  const handleLogoutAction = onLogout || onSwitchAccount;

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#18181b] font-headline tracking-tight">
            การตั้งค่าระบบ
          </h1>
          <p className="text-xs text-[#71717a] mt-0.5">
            ปรับแต่งรูปแบบการแสดงผลและจัดการสำรองข้อมูลระบบ
          </p>
        </div>

        {handleLogoutAction && (
          <button
            type="button"
            onClick={handleLogoutAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs text-[#71717a] font-medium transition-colors cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>ออกจากระบบ</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4 max-w-4xl">
        {/* Mouse Pointer Style Card */}
        <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white flex flex-col gap-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-[#18181b]">
                รูปแบบตัวชี้เมาส์ (Mouse Pointer Style)
              </h2>
              <p className="text-[11.5px] text-[#71717a] mt-0.5">
                เลือกรูปแบบเคอร์เซอร์เมาส์ที่ต้องการให้แสดงผลบนหน้าเว็บไซต์
              </p>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
              {cursorMode === 'classic'
                ? '🖱️ เมาส์ XP คลาสสิก'
                : cursorMode === 'modern'
                ? '🎯 เมาส์โมเดิร์น'
                : '⚙️ เมาส์ระบบปกติ'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Windows XP Classic Cursor Button */}
            <button
              type="button"
              onClick={() => handleSelectCursor('classic')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 ${
                cursorMode === 'classic'
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 font-medium'
                  : 'border-[#e4e4e7] hover:border-neutral-400 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Classic XP Cursor Icon Preview */}
                  <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0 drop-shadow-xs">
                    <path
                      d="M2 2 L2 18.5 L6.5 14.5 L9.8 21.2 L12.5 19.8 L9.3 13.2 L14.5 13.2 Z"
                      fill="#ffffff"
                      stroke="#000000"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs font-bold text-[#18181b]">Windows XP คลาสสิก</span>
                </div>
                {cursorMode === 'classic' && (
                  <span className="material-symbols-outlined text-[16px] text-blue-600 font-bold">
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717a]">
                หัวลูกศรสีขาวขอบดำ สไตล์วินโดวส์คลาสสิก พร้อมมือชี้ปุ่มกดเรโทร
              </p>
            </button>

            {/* Modern Precision Cursor Button */}
            <button
              type="button"
              onClick={() => handleSelectCursor('modern')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 ${
                cursorMode === 'modern'
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 font-medium'
                  : 'border-[#e4e4e7] hover:border-neutral-400 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Modern Precision Cursor Preview */}
                  <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0 drop-shadow-xs">
                    <path
                      d="M3 2 L3 17 L7.5 13 L11.5 19 L13.5 17.8 L9.5 11.8 L15 11.8 Z"
                      fill="#0f172a"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs font-bold text-[#18181b]">โมเดิร์น แม่นยำ</span>
                </div>
                {cursorMode === 'modern' && (
                  <span className="material-symbols-outlined text-[16px] text-blue-600 font-bold">
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717a]">
                หัวลูกศรสีดำเข้มเฉียบคม ขอบขาว พร้อมจุดเล็งสีฟ้าเมื่อชี้ปุ่ม
              </p>
            </button>

            {/* Default System Cursor Button */}
            <button
              type="button"
              onClick={() => handleSelectCursor('default')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2.5 ${
                cursorMode === 'default'
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 font-medium'
                  : 'border-[#e4e4e7] hover:border-neutral-400 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#52525b]">
                    near_me
                  </span>
                  <span className="text-xs font-bold text-[#18181b]">เมาส์ปกติของระบบ</span>
                </div>
                {cursorMode === 'default' && (
                  <span className="material-symbols-outlined text-[16px] text-blue-600 font-bold">
                    check_circle
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717a]">
                ใช้รูปแบบตัวชี้เมาส์มาตรฐานตามการตั้งค่าของระบบปฏิบัติการของคุณ
              </p>
            </button>
          </div>
        </div>

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
