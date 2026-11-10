import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { DSButton } from '../design-system/components';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
interface AnnualTask {
  id: string;
  fiscalYear: string;
  businessId: string;
  businessName: string;
  taskCode: string;
  taskName: string;
  status: TaskStatus;
  dueDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
interface ExecutiveAnnualDashboardProps {
  selectedYear: string;
  onOpenTasks: () => void;
}
const TASK_CATEGORIES = [
  { code: 'PND51', label: 'ภ.ง.ด.51', description: 'ภาษีเงินได้นิติบุคคลครึ่งปี' },
  { code: 'AGM', label: 'ประชุมใหญ่', description: 'ประชุมสามัญผู้ถือหุ้นประจำปี' },
  { code: 'SBCH3', label: 'บอจ.5', description: 'บัญชีรายชื่อผู้ถือหุ้น' },
  { code: 'PND50', label: 'ภ.ง.ด.50', description: 'ภาษีเงินได้นิติบุคคลประจำปี' },
  { code: 'DBD_FS', label: 'ส.บช.3', description: 'นำส่งงบการเงินต่อกรมพัฒนาธุรกิจการค้า' },
] as const;
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const isOverdue = (task: AnnualTask, today: string) => task.status !== 'completed' && Boolean(task.dueDate) && task.dueDate < today;
const formatDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ไม่กำหนด';

export const ExecutiveAnnualDashboard: React.FC<ExecutiveAnnualDashboardProps> = ({ selectedYear, onOpenTasks }) => {
  const [tasks, setTasks] = useState<AnnualTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      setTasks([]);
      try {
        const response = await fetch(`/api/annual-tasks?year=${encodeURIComponent(selectedYear)}`, { credentials: 'same-origin' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'โหลดข้อมูลงานประจำปีไม่สำเร็จ');
        if (active) setTasks(Array.isArray(payload.tasks) ? payload.tasks as AnnualTask[] : []);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'โหลดข้อมูลงานประจำปีไม่สำเร็จ');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [selectedYear, reloadKey]);

  const displayYear = selectedYear.length === 2 ? `25${selectedYear}` : selectedYear;
  const today = todayISO();
  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const overdue = tasks.filter((task) => isOverdue(task, today)).length;
    const outstanding = tasks.filter((task) => task.status !== 'completed' && !isOverdue(task, today)).length;
    const dueSoon = tasks.filter((task) => {
      if (task.status === 'completed' || !task.dueDate || isOverdue(task, today)) return false;
      const days = (new Date(`${task.dueDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000;
      return days <= 30;
    }).length;
    return { total: tasks.length, completed, outstanding, overdue, dueSoon, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
  }, [tasks, today]);

  const categories = useMemo(() => TASK_CATEGORIES.map((category) => {
    const rows = tasks.filter((task) => task.taskCode === category.code);
    const completed = rows.filter((task) => task.status === 'completed').length;
    const overdue = rows.filter((task) => isOverdue(task, today)).length;
    return { ...category, total: rows.length, completed, overdue, pending: rows.length - completed - overdue, percent: rows.length ? Math.round(completed / rows.length * 100) : 0 };
  }), [tasks, today]);

  const monthly = useMemo(() => {
    const counts = Array.from({ length: 12 }, (_, month) => ({ month, total: 0, completed: 0, overdue: 0 }));
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const date = new Date(`${task.dueDate}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const row = counts[date.getMonth()];
      row.total += 1;
      if (task.status === 'completed') row.completed += 1;
      else if (isOverdue(task, today)) row.overdue += 1;
    });
    return counts;
  }, [tasks, today]);

  const alerts = useMemo(() => tasks
    .filter((task) => task.status !== 'completed' && task.dueDate && (isOverdue(task, today) || task.dueDate <= new Date(new Date(`${today}T00:00:00`).getTime() + 30 * 86400000).toISOString().slice(0, 10)))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 8), [tasks, today]);

  const maxMonthly = Math.max(1, ...monthly.map((item) => item.total));

  return (
    <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#526985]">EXECUTIVE WORKSPACE</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#142B4D]">สรุปผู้บริหาร · งานประจำปี</h1>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">ติดตาม ภ.ง.ด.51 · ประชุมใหญ่ · บอจ.5 · ภ.ง.ด.50 · ส.บช.3 · ปีบัญชี {displayYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-[#D9E1EC] bg-white px-3 py-2 text-xs font-medium text-[#314967]">ปีบัญชี {displayYear}</span>
          <DSButton type="button" variant="secondary" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}><RefreshCw size={14} aria-hidden="true" /> รีเฟรช</DSButton>
          <DSButton type="button" variant="primary" onClick={onOpenTasks}>จัดการงาน <span aria-hidden="true">→</span></DSButton>
        </div>
      </header>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" className="font-semibold underline" onClick={() => setReloadKey((value) => value + 1)}>ลองอีกครั้ง</button></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>งานที่บันทึกในระบบ</span><CalendarDays size={17} className="text-[#315F8C]" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-[#142B4D]">{loading ? '—' : stats.total.toLocaleString('th-TH')}</div>
          <p className="mt-1 text-[11px] text-slate-400">นับจากรายการงานที่สร้างไว้ในปีนี้</p>
        </article>
        <article className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>ทำเสร็จแล้ว</span><CheckCircle2 size={17} className="text-emerald-700" /></div>
          <div className="mt-3 flex items-baseline gap-2"><strong className="text-3xl font-semibold tabular-nums text-emerald-700">{loading ? '—' : stats.completed.toLocaleString('th-TH')}</strong><span className="text-xs text-slate-500">{loading ? '' : `${stats.percent}%`}</span></div>
          <p className="mt-1 text-[11px] text-slate-400">สถานะเสร็จสิ้น</p>
        </article>
        <article className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>ค้างดำเนินการ · ยังไม่เลยกำหนด</span><Clock3 size={17} className="text-amber-700" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-amber-700">{loading ? '—' : stats.outstanding.toLocaleString('th-TH')}</div>
          <p className="mt-1 text-[11px] text-slate-400">{loading ? 'กำลังคำนวณ' : `ครบกำหนดใน 30 วัน ${stats.dueSoon} งาน`}</p>
        </article>
        <article className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500"><span>เลยกำหนดแล้ว</span><AlertTriangle size={17} className="text-rose-700" /></div>
          <div className="mt-3 text-3xl font-semibold tabular-nums text-rose-700">{loading ? '—' : stats.overdue.toLocaleString('th-TH')}</div>
          <p className="mt-1 text-[11px] text-slate-400">คำนวณจากกำหนดส่งและสถานะล่าสุด</p>
        </article>
      </div>

      <section className="rounded-lg border border-[#D9E1EC] bg-white p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-sm font-semibold text-[#142B4D]">ความคืบหน้าแยกตามประเภทงาน</h2><p className="mt-1 text-xs text-slate-500">นับจากรายการงานที่มีอยู่จริงในระบบ ไม่สร้างจำนวนงานที่ยังไม่ได้บันทึก</p></div><span className="text-xs text-slate-400">{loading ? 'กำลังโหลด…' : `${stats.total.toLocaleString('th-TH')} งานทั้งหมด`}</span></div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {categories.map((category) => (
            <article key={category.code} className="flex min-h-[188px] flex-col rounded-md border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2"><strong className="text-sm text-[#1B3558]">{category.label}</strong><span className="text-sm font-semibold tabular-nums text-[#315F8C]">{loading ? '—' : `${category.percent}%`}</span></div>
              <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-500">{category.description}</p>
              <p className="mt-2 text-xs font-medium text-slate-700">{loading ? 'กำลังโหลด' : `เสร็จ ${category.completed} จาก ${category.total} งาน`}</p>
              <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`เสร็จ ${category.completed} จาก ${category.total}`}>
                <span className="bg-emerald-600" style={{ width: `${category.total ? category.completed / category.total * 100 : 0}%` }} />
                <span className="bg-rose-500" style={{ width: `${category.total ? category.overdue / category.total * 100 : 0}%` }} />
                <span className="bg-[#9AAAC0]" style={{ width: `${category.total ? category.pending / category.total * 100 : 0}%` }} />
              </div>
              <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                <div className="flex justify-between"><span>ยื่น/เสร็จแล้ว</span><b className="text-emerald-700">{category.completed}</b></div>
                <div className="flex justify-between"><span>ยังไม่เสร็จ</span><b>{category.pending}</b></div>
                <div className="flex justify-between"><span>เลยกำหนด</span><b className="text-rose-700">{category.overdue}</b></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <section className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div><h2 className="text-sm font-semibold text-[#142B4D]">ภาระงานที่ครบกำหนดรายเดือน</h2><p className="mt-1 text-xs text-slate-500">จำนวนงานตามวันที่ครบกำหนดที่ระบุไว้ในระบบ</p></div>
          <div className="mt-5 grid h-48 grid-cols-12 items-end gap-1 border-b border-slate-100 pb-2 sm:gap-2">
            {monthly.map((item) => <div key={item.month} className="flex h-full min-w-0 flex-col items-center justify-end gap-1">
              <span className="text-[10px] tabular-nums text-slate-500">{loading || item.total === 0 ? '' : item.total}</span>
              <div className="flex w-full items-end overflow-hidden rounded-t-sm bg-slate-100" style={{ height: '130px' }} title={`${MONTHS[item.month]}: ${item.total} งาน`}>
                <div className="flex w-full flex-col justify-end" style={{ height: `${item.total / maxMonthly * 100}%` }}>
                  <span className="block bg-emerald-600" style={{ height: `${item.total ? item.completed / item.total * 100 : 0}%` }} />
                  <span className="block bg-rose-500" style={{ height: `${item.total ? item.overdue / item.total * 100 : 0}%` }} />
                  <span className="block flex-1 bg-[#9AAAC0]" />
                </div>
              </div>
              <span className="text-[9px] text-slate-400 sm:text-[10px]">{MONTHS[item.month]}</span>
            </div>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-600" />เสร็จแล้ว</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-500" />เลยกำหนด</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#9AAAC0]" />งานอื่น</span></div>
        </section>

        <section className="rounded-lg border border-[#D9E1EC] bg-white p-4">
          <div className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-semibold text-[#142B4D]">งานที่ต้องติดตาม</h2><p className="mt-1 text-xs text-slate-500">งานเลยกำหนดและงานที่ครบกำหนดใน 30 วัน</p></div><span className="rounded-md bg-[#EEF2F7] px-2 py-1 text-xs font-semibold text-[#314967]">{loading ? '—' : alerts.length}</span></div>
          {loading ? <p className="py-8 text-center text-xs text-slate-400">กำลังโหลดรายการ…</p> : alerts.length ? <ul className="mt-3 divide-y divide-slate-100">{alerts.map((task) => <li key={task.id} className="py-3 first:pt-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{task.taskName}</p><p className="mt-1 truncate text-[11px] text-slate-500">{task.businessName}</p></div><span className={`shrink-0 text-[10px] font-semibold ${isOverdue(task, today) ? 'text-rose-700' : 'text-amber-700'}`}>{isOverdue(task, today) ? 'เกินกำหนด' : 'ใกล้ครบกำหนด'}</span></div><p className="mt-1 text-[10px] text-slate-400">{formatDate(task.dueDate)}</p></li>)}</ul> : <p className="py-8 text-center text-xs text-slate-400">ไม่มีงานเร่งด่วนในขณะนี้</p>}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-[#CBD5E1] bg-[#F7F9FC] px-4 py-3 text-xs text-slate-500">
        <span>หมายเหตุ: ข้อมูลผู้รับผิดชอบและสถานะ “ไม่ต้องยื่น” ยังไม่อยู่ในโครงสร้างงานปัจจุบัน จึงยังไม่แสดงกราฟภาระงานรายบุคคลหรือยอดยกเว้น</span>
        <button type="button" onClick={onOpenTasks} className="font-semibold text-[#24466F] hover:underline">เปิดทะเบียนงานประจำปี →</button>
      </div>
    </section>
  );
};
