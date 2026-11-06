import React, { useEffect, useMemo, useState } from 'react';
import { DSBadge, DSButton, DSInput, DSSelect, DSPageHeader, DSTextarea } from '../design-system/components';
import { BusinessRecord } from '../types';

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
interface AnnualTasksViewProps {
  records: BusinessRecord[];
  selectedYear: string;
  isLoggedIn: boolean;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
  onOpenTasks?: () => void;
  mode?: 'full' | 'summary';
}
const TASK_TYPES = [
  { code: 'PND50', name: 'ภ.ง.ด.50', description: 'แบบแสดงรายการภาษีเงินได้นิติบุคคลประจำปี' },
  { code: 'SBCH3', name: 'ส.บ.ช.3', description: 'นำส่งบัญชีรายชื่อผู้ถือหุ้น' },
  { code: 'PND51', name: 'ภ.ง.ด.51', description: 'แบบแสดงรายการภาษีเงินได้นิติบุคคลครึ่งปี' },
  { code: 'DBD_FS', name: 'นำส่งงบการเงินต่อ DBD', description: 'งานนำส่งงบการเงินประจำปี' },
  { code: 'AGM', name: 'ประชุมสามัญผู้ถือหุ้น', description: 'งานประชุมสามัญผู้ถือหุ้นประจำปี' },
];
const customTaskCode = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `CUSTOM_${(hash >>> 0).toString(36).toUpperCase()}`;
};
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const isOverdue = (task: AnnualTask) => task.status !== 'completed' && Boolean(task.dueDate) && task.dueDate < todayISO();
const statusLabel = (task: AnnualTask) => isOverdue(task) ? 'เกินกำหนด' : task.status === 'completed' ? 'เสร็จแล้ว' : task.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
const statusColor = (task: AnnualTask) => isOverdue(task) ? '#dc5555' : task.status === 'completed' ? '#16865b' : task.status === 'in_progress' ? '#e6a23c' : '#aeb7b1';

export const AnnualTasksView: React.FC<AnnualTasksViewProps> = ({
  records, selectedYear, isLoggedIn, onShowToast, onOpenTasks, mode = 'full',
}) => {
  const [tasks, setTasks] = useState<AnnualTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AnnualTask | null>(null);
  const [businessId, setBusinessId] = useState('');
  const [typeCode, setTypeCode] = useState('PND50');
  const [customName, setCustomName] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [contextTask, setContextTask] = useState<{ task: AnnualTask; x: number; y: number } | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (!celebrate) return;
    const timer = window.setTimeout(() => setCelebrate(false), 900);
    return () => window.clearTimeout(timer);
  }, [celebrate]);
  useEffect(() => {
    if (!contextTask) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setContextTask(null); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [contextTask]);

  const loadTasks = async () => {
    if (!isLoggedIn) { setTasks([]); setLoading(false); return; }
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/annual-tasks?year=${encodeURIComponent(selectedYear)}`, { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดรายการงานไม่สำเร็จ');
      setTasks(Array.isArray(payload.tasks) ? payload.tasks as AnnualTask[] : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'โหลดรายการงานไม่สำเร็จ');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadTasks(); }, [selectedYear, isLoggedIn]);

  const counts = useMemo(() => {
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const inProgress = tasks.filter((task) => task.status === 'in_progress' && !isOverdue(task)).length;
    const overdue = tasks.filter(isOverdue).length;
    const pending = tasks.length - completed - inProgress - overdue;
    return { total: tasks.length, completed, inProgress, overdue, pending, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
  }, [tasks]);

  const typeBreakdown = useMemo(() => {
    const grouped = new Map<string, { name: string; done: number; total: number }>();
    tasks.forEach((task) => {
      const group = grouped.get(task.taskCode) || { name: task.taskName, done: 0, total: 0 };
      group.total += 1;
      if (task.status === 'completed') group.done += 1;
      grouped.set(task.taskCode, group);
    });
    return [...grouped.entries()].map(([code, value]) => ({ code, ...value }));
  }, [tasks]);

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const matchesSearch = !search || `${task.businessName} ${task.taskName} ${task.note}`.toLowerCase().includes(search.toLowerCase());
    const effectiveStatus = isOverdue(task) ? 'overdue' : task.status;
    return matchesSearch && (statusFilter === 'all' || statusFilter === effectiveStatus);
  }), [tasks, search, statusFilter]);

  const resetForm = () => {
    setEditing(null); setBusinessId(records[0]?.id || ''); setTypeCode('PND50');
    setCustomName(''); setStatus('pending'); setDueDate(''); setNote(''); setShowForm(false);
  };
  const openCreate = () => {
    setEditing(null); setBusinessId(records[0]?.id || ''); setTypeCode('PND50');
    setCustomName(''); setStatus('pending'); setDueDate(''); setNote(''); setShowForm(true);
  };
  const openEdit = (task: AnnualTask) => {
    setEditing(task); setBusinessId(task.businessId);
    setTypeCode(TASK_TYPES.some((item) => item.code === task.taskCode) ? task.taskCode : 'CUSTOM');
    setCustomName(TASK_TYPES.some((item) => item.code === task.taskCode) ? '' : task.taskName);
    setStatus(task.status); setDueDate(task.dueDate || ''); setNote(task.note || ''); setShowForm(true);
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const business = records.find((record) => record.id === businessId);
    const preset = TASK_TYPES.find((item) => item.code === typeCode);
    const taskName = typeCode === 'CUSTOM' ? customName.trim() : (preset?.name || '');
    const taskCode = typeCode === 'CUSTOM'
      ? (editing?.taskCode.startsWith('CUSTOM_') ? editing.taskCode : customTaskCode(taskName))
      : typeCode;
    if (!business || !taskName) { onShowToast('กรุณาเลือกกิจการและระบุประเภทงาน', 'ข้อมูลไม่ครบ', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        fiscalYear: selectedYear, businessId: business.id, businessName: business.companyName,
        taskCode, taskName, status, dueDate, note,
      };
      const response = await fetch(editing ? `/api/annual-tasks/${encodeURIComponent(editing.id)}` : '/api/annual-tasks', {
        method: editing ? 'PUT' : 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'บันทึกงานไม่สำเร็จ');
      onShowToast(editing ? 'อัปเดตงานเรียบร้อย' : 'เพิ่มงานประจำปีเรียบร้อย', 'บันทึกสำเร็จ', 'success');
      setCelebrate(true);
      resetForm();
      await loadTasks();
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'บันทึกงานไม่สำเร็จ', 'บันทึกไม่สำเร็จ', 'error');
    } finally { setSaving(false); }
  };

  const deleteTask = async (task: AnnualTask) => {
    if (!window.confirm(`ยืนยันลบงาน "${task.taskName}" ของ ${task.businessName}?`)) return;
    try {
      const response = await fetch(`/api/annual-tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'ลบงานไม่สำเร็จ');
      setTasks((current) => current.filter((item) => item.id !== task.id));
      onShowToast('ลบรายการงานเรียบร้อย', 'ลบสำเร็จ', 'success');
    } catch (error) { onShowToast(error instanceof Error ? error.message : 'ลบงานไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error'); }
  };

  if (mode === 'summary') {
    return (
      <section className="m101-overview-panel m101-annual-summary">
        <div className="m101-panel-heading m101-status-heading">
          <div><p className="m101-eyebrow">ANNUAL TASK TRACKER</p><h2>ติดตามงานประจำปี</h2><p className="m101-panel-subtitle">สถานะงานตามกิจการ · รอบปี {selectedYear}</p></div>
          <div className="m101-status-completion"><strong>{counts.percent}%</strong><span>เสร็จแล้ว</span></div>
        </div>
        <div className="m101-status-total-line"><span>งานทั้งหมด</span><b>{counts.total.toLocaleString('th-TH')} งาน</b></div>
        <div className="m101-progress-stack m101-progress-stack-large" role="img" aria-label={`เสร็จ ${counts.completed}, กำลังทำ ${counts.inProgress}, รอ ${counts.pending}, เกินกำหนด ${counts.overdue}`}>
          <span className="m101-progress-done" style={{ width: `${counts.total ? counts.completed / counts.total * 100 : 0}%` }} />
          <span className="m101-progress-active" style={{ width: `${counts.total ? counts.inProgress / counts.total * 100 : 0}%` }} />
          <span className="m101-task-overdue-segment" style={{ width: `${counts.total ? counts.overdue / counts.total * 100 : 0}%` }} />
          <span className="m101-progress-waiting" style={{ width: `${counts.total ? counts.pending / counts.total * 100 : 0}%` }} />
        </div>
        <div className="m101-status-legend m101-status-legend-counts">
          <span><i className="m101-status-dot m101-dot-done" />เสร็จ <b>{counts.completed}</b></span>
          <span><i className="m101-status-dot m101-dot-progress" />กำลังทำ <b>{counts.inProgress}</b></span>
          <span><i className="m101-task-dot-overdue" />เกินกำหนด <b>{counts.overdue}</b></span>
          <span><i className="m101-status-dot m101-dot-pending" />รอ <b>{counts.pending}</b></span>
        </div>
        {typeBreakdown.length > 0 ? <div className="m101-category-breakdown">
          <div className="m101-category-heading"><div><p className="m101-eyebrow">BY TASK TYPE</p><h3>งานเสร็จแล้วเทียบกับยังไม่เสร็จ</h3></div></div>
          {typeBreakdown.slice(0, 5).map((group) => <div className="m101-category-row" key={group.code}>
            <div className="m101-category-row-head"><b>{group.name}</b><span>{group.done}/{group.total} งาน <strong>{group.total ? Math.round(group.done / group.total * 100) : 0}%</strong></span></div>
            <div className="m101-category-bar"><span className="m101-category-done" style={{ width: `${group.total ? group.done / group.total * 100 : 0}%` }} /><span className="m101-category-notdone" style={{ width: `${group.total ? (group.total - group.done) / group.total * 100 : 0}%` }} /></div>
          </div>)}
        </div> : <p className="m101-empty-hint">ยังไม่มีงานประจำปี เพิ่มประเภทงานเพื่อเริ่มติดตามความคืบหน้า</p>}
        <DSButton type="button" variant="secondary" className="m101-task-open-button" onClick={onOpenTasks}>จัดการงานประจำปี <span aria-hidden="true">→</span></DSButton>
        {loadError && <p className="m101-empty-hint">{loadError}</p>}
      </section>
    );
  }

  return (
    <section className={`m101-overview w-full max-w-[1500px] mx-auto flex flex-col gap-5 ${celebrate ? 'm101-success-burst' : ''}`}>
      <DSPageHeader
        eyebrow="ANNUAL TASK MANAGEMENT"
        title="งานประจำปี"
        description={`ติดตามงานภาษี บัญชี และงานตามรอบปี แยกตามกิจการ · ปี ${selectedYear}`}
        className="m101-overview-header"
        actions={<DSButton type="button" variant="primary" onClick={openCreate} disabled={!records.length}>＋ เพิ่มงาน</DSButton>}
      />
      <div className="m101-task-metric-grid">
        <article><span>งานทั้งหมด</span><strong>{counts.total}</strong></article>
        <article><span>เสร็จแล้ว</span><strong className="is-done">{counts.completed}</strong></article>
        <article><span>กำลังดำเนินการ</span><strong className="is-progress">{counts.inProgress}</strong></article>
        <article><span>เกินกำหนด</span><strong className="is-overdue">{counts.overdue}</strong></article>
      </div>
      <section className="m101-overview-panel m101-task-list-panel">
        <div className="m101-panel-heading"><div><p className="m101-eyebrow">TASK REGISTER</p><h2>รายการงานทั้งหมด</h2><p className="m101-panel-subtitle">สถานะเกินกำหนดคำนวณจากวันที่ปัจจุบันและกำหนดส่งที่บันทึกไว้</p></div><span className="m101-panel-total">{visibleTasks.length} รายการ</span></div>
        <div className="m101-task-toolbar">
          <DSInput type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อกิจการหรือประเภทงาน…" aria-label="ค้นหางาน" />
          <DSSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="กรองสถานะ">
            <option value="all">ทุกสถานะ</option><option value="completed">เสร็จแล้ว</option><option value="in_progress">กำลังดำเนินการ</option><option value="pending">รอดำเนินการ</option><option value="overdue">เกินกำหนด</option>
          </DSSelect>
        </div>
        {loading ? <div className="m101-task-empty">กำลังโหลดรายการงาน…</div> : loadError ? <div className="m101-task-empty is-error">{loadError}<DSButton type="button" variant="secondary" onClick={() => void loadTasks()}>ลองอีกครั้ง</DSButton></div> : visibleTasks.length ? (
          <div className="m101-task-table">
            {visibleTasks.map((task) => <article className="m101-task-row" key={task.id}
              onContextMenu={(event) => { event.preventDefault(); setContextTask({ task, x: Math.min(event.clientX, window.innerWidth - 180), y: Math.min(event.clientY, window.innerHeight - 110) }); }}
              onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`); event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`); }}>
              <div className="m101-task-row-main"><div className="m101-task-row-title"><strong>{task.taskName}</strong><DSBadge variant={isOverdue(task) ? 'danger' : task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'info' : 'neutral'}>{statusLabel(task)}</DSBadge></div><span>{task.businessName}</span>{task.note && <small>{task.note}</small>}</div>
              <div className="m101-task-row-due"><span>กำหนดส่ง</span><strong className={isOverdue(task) ? 'is-overdue' : ''}>{task.dueDate ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ยังไม่กำหนด'}</strong></div>
              <div className="m101-task-row-actions"><DSButton type="button" variant="ghost" onClick={() => openEdit(task)}>แก้ไข</DSButton><DSButton type="button" variant="danger" className="is-delete" onClick={() => void deleteTask(task)}>ลบ</DSButton></div>
            </article>)}
          </div>
        ) : <div className="m101-task-empty">{tasks.length ? 'ไม่พบงานที่ตรงกับตัวกรอง' : 'ยังไม่มีงานในรอบปีนี้ เพิ่มงานแรกเพื่อเริ่มติดตามสถานะ'}</div>}
      </section>
      {contextTask && <>
        <button type="button" className="m101-task-context-backdrop" aria-label="ปิดเมนู" onClick={() => setContextTask(null)} />
        <div className="m101-task-context-menu" role="menu" style={{ left: contextTask.x, top: contextTask.y }}>
          <DSButton type="button" variant="ghost" role="menuitem" onClick={() => { openEdit(contextTask.task); setContextTask(null); }}><span className="material-symbols-outlined text-[16px]">edit</span>แก้ไขงานนี้</DSButton>
          <DSButton type="button" variant="danger" role="menuitem" className="is-delete" onClick={() => { const taskToDelete = contextTask.task; setContextTask(null); void deleteTask(taskToDelete); }}><span className="material-symbols-outlined text-[16px]">delete</span>ลบงานนี้</DSButton>
        </div>
      </>}
      {showForm && <div className="m101-task-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) resetForm(); }}>
        <form className="m101-task-form" onSubmit={saveTask}>
          <div className="m101-task-form-header"><div><p className="m101-eyebrow">{editing ? 'EDIT ANNUAL TASK' : 'NEW ANNUAL TASK'}</p><h2>{editing ? 'แก้ไขงานประจำปี' : 'เพิ่มงานประจำปี'}</h2></div><DSButton type="button" variant="ghost" onClick={resetForm} aria-label="ปิด">×</DSButton></div>
          <label>กิจการ<DSSelect value={businessId} onChange={(event) => setBusinessId(event.target.value)} required disabled={Boolean(editing)}><option value="">เลือกกิจการ</option>{records.map((record) => <option key={record.id} value={record.id}>{record.companyName}</option>)}</DSSelect></label>
          <label>ประเภทงาน<DSSelect value={typeCode} onChange={(event) => setTypeCode(event.target.value)}>{TASK_TYPES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}<option value="CUSTOM">ประเภทงานอื่น ๆ (กำหนดเอง)</option></DSSelect></label>
          {typeCode === 'CUSTOM' && <label>ชื่อประเภทงาน<DSInput value={customName} onChange={(event) => setCustomName(event.target.value)} maxLength={120} placeholder="ระบุชื่องาน" required /></label>}
          <div className="m101-task-form-grid"><label>สถานะ<DSSelect value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}><option value="pending">รอดำเนินการ</option><option value="in_progress">กำลังดำเนินการ</option><option value="completed">เสร็จแล้ว</option></DSSelect></label><label>กำหนดส่ง<DSInput type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div>
          <label>หมายเหตุ<DSTextarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" /></label>
          <p className="m101-task-form-note">กำหนดส่งเป็นวันที่ที่ผู้ใช้ระบุเอง ระบบจะไม่ตั้งวันครบกำหนดทางกฎหมายให้อัตโนมัติ</p>
          <div className="m101-task-form-actions"><DSButton type="button" variant="secondary" onClick={resetForm}>ยกเลิก</DSButton><DSButton type="submit" variant="primary" loading={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกงาน'}</DSButton></div>
        </form>
      </div>}
    </section>
  );
};
