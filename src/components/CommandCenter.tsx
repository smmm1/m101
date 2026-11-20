import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './CommandCenter.css';

type Business = { id: string; sequenceNo?: string; companyName?: string; taxId?: string; type?: string; status?: string };
type AnnualTask = { id: string; businessName: string; taskName: string; status: 'pending' | 'in_progress' | 'completed'; dueDate: string; note: string };
type Props = { navigate: (page: 'businesses' | 'work') => void; year?: string };

async function getJson(url: string) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `โหลดข้อมูลไม่สำเร็จ (${response.status})`);
  return payload;
}

const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const number = (value: number) => value.toLocaleString('th-TH');
const dateLabel = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
const statusLabel: Record<string, string> = { pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว' };
const typeLabel: Record<string, string> = { company: 'บริษัทจำกัด', partnership: 'ห้างหุ้นส่วน', individual: 'บุคคลธรรมดา' };

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 15.5 15 5M6 5h9v9" /></svg>;
}

export default function CommandCenter({ navigate, year = '69' }: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tasks, setTasks] = useState<AnnualTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const [directory, work] = await Promise.all([
        getJson(`/api/directory?year=${encodeURIComponent(year)}`),
        getJson(`/api/annual-tasks?year=${encodeURIComponent(year)}`),
      ]);
      if (version !== requestVersion.current) return;
      setBusinesses(Array.isArray(directory.records) ? directory.records : []);
      setTasks(Array.isArray(work.tasks) ? work.tasks : []);
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลภาพรวมไม่สำเร็จ');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  const metrics = useMemo(() => {
    const done = tasks.filter(task => task.status === 'completed').length;
    const active = tasks.filter(task => task.status === 'in_progress').length;
    const today = dateKey();
    const overdue = tasks
      .filter(task => task.status !== 'completed' && task.dueDate && task.dueDate < today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const upcoming = tasks
      .filter(task => task.status !== 'completed' && task.dueDate && task.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return {
      done, active, pending: tasks.length - done - active, overdue, upcoming,
      companies: businesses.filter(item => item.type === 'company').length,
      partnerships: businesses.filter(item => item.type === 'partnership').length,
      individuals: businesses.filter(item => item.type === 'individual').length,
      percent: tasks.length ? Math.round(done / tasks.length * 100) : 0,
    };
  }, [businesses, tasks]);

  const businessMix = [
    { label: 'บริษัทจำกัด', count: metrics.companies, color: 'company' },
    { label: 'ห้างหุ้นส่วน', count: metrics.partnerships, color: 'partnership' },
    { label: 'บุคคลธรรมดา', count: metrics.individuals, color: 'individual' },
  ];

  return <section className="m101-page m101-command-center">
    <header className="cc-heading">
      <div className="cc-heading-copy">
        <div className="cc-kicker"><span className="cc-kicker-dot" /> WORKSPACE OVERVIEW <span className="cc-kicker-divider">/</span> FY {year}</div>
        <h1>ภาพรวมกิจการ</h1>
        <p>ภาพรวมพอร์ตโฟลิโอและงานที่ต้องดูแลในรอบปีบัญชี</p>
      </div>
      <div className="cc-heading-actions">
        <button type="button" className="cc-secondary-action" onClick={() => navigate('work')}>งานประจำปี <ArrowIcon /></button>
        <button type="button" className="cc-primary-action" onClick={() => navigate('businesses')}>ทะเบียนกิจการ <ArrowIcon /></button>
      </div>
    </header>

    {error && <div className="cc-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()}>ลองอีกครั้ง</button></div>}

    <section className="cc-overview" aria-label="ตัวชี้วัดภาพรวม" aria-busy={loading}>
      <article className="cc-metric cc-metric-primary">
        <div className="cc-metric-top"><span>BUSINESS PORTFOLIO</span><span className="cc-metric-icon cc-icon-portfolio" aria-hidden="true">↗</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(businesses.length)}</div>
        <div className="cc-metric-bottom"><span>กิจการทั้งหมด</span><span className="cc-metric-note">ในทะเบียน</span></div>
      </article>
      <article className="cc-metric">
        <div className="cc-metric-top"><span>COMPLETED</span><span className="cc-metric-icon cc-icon-complete" aria-hidden="true">✓</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.done)}</div>
        <div className="cc-metric-bottom"><span>งานที่เสร็จแล้ว</span><span className="cc-metric-note">จาก {number(tasks.length)} งาน</span></div>
      </article>
      <article className="cc-metric">
        <div className="cc-metric-top"><span>IN PROGRESS</span><span className="cc-metric-icon cc-icon-active" aria-hidden="true">↗</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.active)}</div>
        <div className="cc-metric-bottom"><span>กำลังดำเนินการ</span><span className="cc-metric-note">งานที่เริ่มแล้ว</span></div>
      </article>
      <article className="cc-metric cc-metric-alert">
        <div className="cc-metric-top"><span>OVERDUE</span><span className="cc-metric-icon cc-icon-alert" aria-hidden="true">!</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.overdue.length)}</div>
        <div className="cc-metric-bottom"><span>งานเกินกำหนด</span><span className="cc-metric-note">ต้องติดตาม</span></div>
      </article>
    </section>

    <section className="cc-insights-grid">
      <article className="cc-panel cc-operations-panel">
        <div className="cc-panel-heading">
          <div><span className="cc-eyebrow">ANNUAL OPERATIONS</span><h2>ความคืบหน้างานประจำปี</h2><p>สถานะการดำเนินงานทั้งหมดในปีบัญชี {year}</p></div>
          <button type="button" className="cc-text-action" onClick={() => navigate('work')}>ดูงานทั้งหมด <ArrowIcon /></button>
        </div>
        {loading ? <div className="cc-state">กำลังรวบรวมข้อมูล…</div> : tasks.length ? <>
          <div className="cc-progress-overview">
            <div className="cc-progress-number"><strong>{metrics.percent}<small>%</small></strong><span>เสร็จสมบูรณ์</span></div>
            <div className="cc-progress-summary">
              <div className="cc-progress-summary-top"><b>{number(metrics.done)} <span>/ {number(tasks.length)} งาน</span></b><span>{metrics.percent}%</span></div>
              <div className="cc-progress-track" role="progressbar" aria-label="ความคืบหน้างานประจำปี" aria-valuenow={metrics.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: metrics.percent + '%' }} /></div>
              <p>{metrics.pending ? `ยังมีอีก ${number(metrics.pending)} งานที่รอดำเนินการ` : 'งานทั้งหมดได้รับการดำเนินการแล้ว'}</p>
            </div>
          </div>
          <div className="cc-status-breakdown">
            <div><span className="cc-status-key"><i className="cc-dot cc-dot-done" />เสร็จแล้ว</span><b>{number(metrics.done)}</b></div>
            <div><span className="cc-status-key"><i className="cc-dot cc-dot-active" />กำลังดำเนินการ</span><b>{number(metrics.active)}</b></div>
            <div><span className="cc-status-key"><i className="cc-dot cc-dot-pending" />รอดำเนินการ</span><b>{number(metrics.pending)}</b></div>
          </div>
        </> : <div className="cc-state cc-empty"><b>ยังไม่มีข้อมูลงานประจำปี</b><span>เพิ่มงานให้กิจการเพื่อเริ่มติดตามความคืบหน้า</span><button type="button" onClick={() => navigate('work')}>ไปยังงานประจำปี</button></div>}
      </article>

      <article className="cc-panel cc-mix-panel">
        <div className="cc-panel-heading">
          <div><span className="cc-eyebrow">PORTFOLIO COMPOSITION</span><h2>โครงสร้างพอร์ตโฟลิโอ</h2><p>สัดส่วนประเภทกิจการในทะเบียน</p></div>
          <button type="button" className="cc-text-action" onClick={() => navigate('businesses')}>ดูทะเบียน <ArrowIcon /></button>
        </div>
        {loading ? <div className="cc-state">กำลังโหลดข้อมูล…</div> : businesses.length ? <div className="cc-mix-content">
          <div className="cc-mix-total"><strong>{number(businesses.length)}</strong><span>กิจการทั้งหมด</span></div>
          <div className="cc-mix-bars">{businessMix.map(item => <div className="cc-mix-row" key={item.color}>
            <div className="cc-mix-label"><span><i className={'cc-mix-dot cc-mix-' + item.color} />{item.label}</span><b>{number(item.count)}</b></div>
            <div className="cc-mix-track"><span className={'cc-mix-fill cc-mix-fill-' + item.color} style={{ width: (item.count / businesses.length * 100) + '%' }} /></div>
          </div>)}</div>
        </div> : <div className="cc-state cc-empty"><b>ยังไม่มีข้อมูลกิจการ</b><span>เพิ่มกิจการเพื่อดูโครงสร้างพอร์ตโฟลิโอ</span></div>}
      </article>
    </section>

    <section className="cc-lower-grid">
      <article className="cc-panel cc-follow-panel">
        <div className="cc-panel-heading">
          <div><span className="cc-eyebrow">PRIORITY & FOLLOW-UP</span><h2>งานที่ต้องติดตาม</h2><p>กำหนดส่งที่ผ่านไปแล้วและกำลังจะมาถึง</p></div>
          <button type="button" className="cc-text-action" onClick={() => navigate('work')}>จัดการงาน <ArrowIcon /></button>
        </div>
        {loading ? <div className="cc-state">กำลังโหลดรายการ…</div> : metrics.overdue.length || metrics.upcoming.length ? <div className="cc-follow-list">
          {metrics.overdue.slice(0, 3).map(task => <div className="cc-follow-row" key={task.id}>
            <span className="cc-follow-date cc-follow-date-late"><b>{dateLabel(task.dueDate)}</b><small>เลยกำหนด</small></span>
            <span className="cc-follow-copy"><b>{task.taskName}</b><small>{task.businessName}</small></span>
            <span className="cc-follow-status cc-follow-status-late">เกินกำหนด</span>
          </div>)}
          {metrics.upcoming.slice(0, Math.max(0, 5 - Math.min(metrics.overdue.length, 3))).map(task => <div className="cc-follow-row" key={task.id}>
            <span className="cc-follow-date"><b>{dateLabel(task.dueDate)}</b><small>กำหนดส่ง</small></span>
            <span className="cc-follow-copy"><b>{task.taskName}</b><small>{task.businessName}</small></span>
            <span className="cc-follow-status">ตามกำหนด</span>
          </div>)}
        </div> : <div className="cc-state cc-empty"><b>ไม่มีรายการที่ต้องติดตาม</b><span>ขณะนี้ไม่มีงานค้างหรือกำหนดส่งที่กำลังจะมาถึง</span></div>}
      </article>

      <article className="cc-panel cc-portfolio-panel">
        <div className="cc-panel-heading">
          <div><span className="cc-eyebrow">BUSINESS DIRECTORY</span><h2>กิจการล่าสุด</h2><p>ข้อมูลจากทะเบียนในพื้นที่ทำงาน</p></div>
          <button type="button" className="cc-text-action" onClick={() => navigate('businesses')}>ดูทั้งหมด <ArrowIcon /></button>
        </div>
        {loading ? <div className="cc-state">กำลังโหลดทะเบียน…</div> : businesses.length ? <div className="cc-portfolio-table-wrap"><table className="cc-portfolio-table">
          <thead><tr><th>กิจการ</th><th>ประเภท</th><th>สถานะ</th></tr></thead>
          <tbody>{businesses.slice(0, 5).map((business, index) => <tr key={business.id}>
            <td><span className="cc-business-name">{business.companyName || 'ไม่ระบุชื่อกิจการ'}</span><small className="cc-business-meta">{business.taxId || business.sequenceNo || `รายการที่ ${index + 1}`}</small></td>
            <td>{typeLabel[business.type || ''] || 'ไม่ระบุประเภท'}</td>
            <td><span className={'cc-status cc-status-' + (business.status || 'pending')}>{statusLabel[business.status || 'pending'] || 'รอดำเนินการ'}</span></td>
          </tr>)}</tbody>
        </table></div> : <div className="cc-state cc-empty"><b>ยังไม่มีข้อมูลกิจการ</b><span>เพิ่มกิจการเพื่อเริ่มใช้งานพื้นที่ทำงาน</span><button type="button" onClick={() => navigate('businesses')}>เพิ่มกิจการ</button></div>}
      </article>
    </section>
  </section>;
}
