import React from 'react';

type AdminTab = 'directory' | 'dashboard' | 'tasks' | 'import' | 'settings';

interface AdminControlCenterProps {
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  onPreviewAfk: () => void;
}

const destinations: Array<{ id: AdminTab; title: string; detail: string; icon: string }> = [
  { id: 'directory', title: 'ทะเบียนกิจการ', detail: 'รายการ ข้อมูล และหน้ารายละเอียด', icon: '▤' },
  { id: 'dashboard', title: 'ภาพรวมระบบ', detail: 'สถิติและสถานะข้อมูล', icon: '▦' },
  { id: 'tasks', title: 'งานประจำปี', detail: 'รายการงานและการติดตาม', icon: '✓' },
  { id: 'import', title: 'นำเข้าเอกสาร', detail: 'นำเข้า Excel / CSV และจับคู่คอลัมน์', icon: '⇧' },
  { id: 'settings', title: 'ตั้งค่าระบบ', detail: 'การตั้งค่า เสียง และสำรองข้อมูล', icon: '⚙' },
];

export function AdminControlCenter({ onClose, onNavigate, onPreviewAfk }: AdminControlCenterProps) {
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="m101-admin-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-[#f8faf9] shadow-2xl dark:border-slate-700 dark:bg-[#111b18]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-7">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold tracking-[.14em] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">OWNER ACCESS · M101</div>
            <h2 id="m101-admin-title" className="text-xl font-bold text-slate-900 dark:text-white">ศูนย์ควบคุมลับ</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">ทางลัดสำหรับเจ้าของระบบ เพื่อเปิดดูหน้าตาและฟีเจอร์ที่มีอยู่</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิดศูนย์ควบคุม" className="rounded-full px-3 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800">✕</button>
        </header>
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
          {destinations.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className="group flex min-h-[88px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-emerald-700">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl text-slate-700 dark:bg-slate-800 dark:text-slate-200">{item.icon}</span>
              <span><span className="block text-sm font-bold text-slate-900 dark:text-white">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">{item.detail}</span></span>
              <span className="ml-auto text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">→</span>
            </button>
          ))}
          <button type="button" onClick={onPreviewAfk} className="group flex min-h-[88px] items-center gap-4 rounded-2xl border border-dashed border-slate-400 bg-slate-100/80 p-4 text-left transition hover:border-slate-700 hover:bg-white hover:shadow-md dark:border-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-800">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-200 text-xl text-slate-800 dark:bg-slate-700 dark:text-white">☼</span>
            <span><span className="block text-sm font-bold text-slate-900 dark:text-white">ทดสอบภาพ AFK</span><span className="mt-1 block text-[11px] leading-5 text-slate-500 dark:text-slate-400">เปิดหน้าพักหน้าจอทันที ไม่ต้องรอ 3 นาที</span></span>
            <span className="ml-auto text-slate-400 transition group-hover:translate-x-1">↗</span>
          </button>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-700 sm:px-7">
          <span>ซ่อนอยู่จากเมนูปกติ · จำกัดเฉพาะบัญชีผู้ดูแลระบบ</span>
          <span>กด Esc เพื่อปิด</span>
        </footer>
      </section>
    </div>
  );
}
