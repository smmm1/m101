import React from 'react';
import { DSButton, DSBadge } from '../design-system/components';

type AdminTab = 'directory' | 'dashboard' | 'tasks' | 'import' | 'settings';

interface AdminControlCenterProps {
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  onPreviewAfk: () => void;
  onManageUsers: () => void;
}

const destinations: Array<{ id: AdminTab; title: string; detail: string; icon: string }> = [
  { id: 'directory', title: 'ทะเบียนกิจการ', detail: 'รายการ ข้อมูล และหน้ารายละเอียด', icon: 'business' },
  { id: 'dashboard', title: 'ภาพรวมระบบ', detail: 'สถิติและสถานะข้อมูล', icon: 'dashboard' },
  { id: 'tasks', title: 'งานประจำปี', detail: 'รายการงานและการติดตาม', icon: 'task_alt' },
  { id: 'import', title: 'นำเข้าเอกสาร', detail: 'นำเข้า Excel / CSV และจับคู่คอลัมน์', icon: 'upload_file' },
  { id: 'settings', title: 'ตั้งค่าระบบ', detail: 'การตั้งค่า เสียง และสำรองข้อมูล', icon: 'settings' },
];

export function AdminControlCenter({ onClose, onNavigate, onPreviewAfk }: AdminControlCenterProps) {
  return (
    <div className="m101-dialog-overlay fixed inset-0 z-[260] flex items-center justify-center p-3" role="dialog" aria-modal="true" aria-labelledby="m101-admin-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ds-admin-dialog m101-dialog-panel w-full max-w-2xl overflow-hidden">
        <header className="ds-admin-header flex items-start justify-between gap-4 px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2"><DSBadge variant="info">OWNER ACCESS</DSBadge></div>
            <h2 id="m101-admin-title" className="ds-admin-heading">ศูนย์ควบคุมผู้ดูแล</h2>
            <p className="ds-admin-subtitle">ทางลัดสำหรับเจ้าของระบบ เพื่อเปิดดูหน้าตาและฟีเจอร์ที่มีอยู่</p>
          </div>
          <DSButton type="button" onClick={onClose} aria-label="ปิดศูนย์ควบคุม" variant="ghost" className="ds-admin-close"><span className="material-symbols-outlined" aria-hidden="true">close</span></DSButton>
        </header>
        <div className="ds-admin-destinations grid gap-2 p-4 sm:grid-cols-2 sm:p-6">
          {destinations.map((item) => (
            <DSButton key={item.id} type="button" onClick={() => onNavigate(item.id)} variant="ghost" className="ds-admin-destination">
              <span className="ds-admin-icon material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              <span><span className="ds-admin-title">{item.title}</span><span className="ds-admin-description">{item.detail}</span></span>
              <span className="ds-admin-arrow">→</span>
            </DSButton>
          ))}
          <DSButton type="button" onClick={onManageUsers} variant="ghost" className="ds-admin-destination">
            <span className="ds-admin-icon material-symbols-outlined" aria-hidden="true">manage_accounts</span>
            <span><span className="ds-admin-title">จัดการบัญชีผู้ใช้</span><span className="ds-admin-description">สร้าง ID ตั้งรหัสผ่าน และระงับบัญชีสมาชิก</span></span>
            <span className="ds-admin-arrow">→</span>
          </DSButton>
          <DSButton type="button" onClick={onPreviewAfk} variant="secondary" className="ds-admin-destination ds-admin-preview">
            <span className="ds-admin-icon material-symbols-outlined" aria-hidden="true">visibility</span>
            <span><span className="block text-sm font-bold text-slate-900 dark:text-white">ทดสอบภาพ AFK</span><span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">เปิดหน้าพักหน้าจอทันที ไม่ต้องรอ 3 นาที</span></span>
            <span className="ds-admin-arrow">↗</span>
          </DSButton>
        </div>
        <footer className="ds-admin-footer flex flex-wrap items-center justify-between gap-2 px-5 py-3 sm:px-7">
          <span>ซ่อนอยู่จากเมนูปกติ · จำกัดเฉพาะบัญชีผู้ดูแลระบบ</span>
          <span>กด Esc เพื่อปิด</span>
        </footer>
      </section>
    </div>
  );
}
