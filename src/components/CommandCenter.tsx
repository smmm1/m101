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
const statusLabel: Record<string, string> = { pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว' };
const typeLabel: Record<string, string> = { company: 'บริษัทจำกัด', partnership: 'ห้างหุ้นส่วน', individual: 'บุคคลธรรมดา' };

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
    const overdue = tasks.filter(task => task.status !== 'completed' && task.dueDate && task.dueDate < today);
    const upcoming = tasks
      .filter(task => task.status !== 'completed' && task.dueDate && task.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 5);
    return {
      done, active, pending: tasks.length - done - active, overdue, upcoming,
      companies: businesses.filter(item => item.type === 'company').length,
      partnerships: businesses.filter(item => item.type === 'partnership').length,
      percent: tasks.length ? Math.round(done / tasks.length * 100) : 0,
    };
  }, [businesses, tasks]);

  return <section className="m101-page m101-command-center">
    <header className="cc-heading">
      <div>
        <div className="cc-kicker">MUSTANG BUSINESS WORKSPACE <span /> FY {year}</div>
        <h1>ศูนย์บัญชาการ</h1>
        <p>ภาพรวมกิจการและงานสำคัญที่ต้องติดตามในพื้นที่ทำงาน</p>
      </div>
      <button type="button" className="cc-primary-action" onClick={() => navigate('businesses')}>เปิดทะเบียนกิจการ <span aria-hidden="true">↗</span></button>
    </header>

    {error && <div className="cc-error" role="alert"><span>{error}</span><button onClick={() => void load()}>ลองโหลดอีกครั้ง</button></div>}

    <section className="cc-overview" aria-label="ตัวชี้วัดภาพรวม" aria-busy={loading}>
      <article className="cc-lead-metric">
        <div className="cc-metric-top"><span>PORTFOLIO SIZE</span><span className="cc-metric-mark">01</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(businesses.length)}</div>
        <div className="cc-metric-label">กิจการในทะเบียน</div>
        <div className="cc-metric-foot">จำนวนกิจการทั้งหมดในรอบปีที่เลือก</div>
      </article>
      <article className="cc-metric">
        <div className="cc-metric-top"><span>LIMITED COMPANY</span><span className="cc-metric-mark">02</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.companies)}</div>
        <div className="cc-metric-label">บริษัทจำกัด</div>
        <div className="cc-metric-foot">ข้อมูลจากทะเบียนกิจการ</div>
      </article>
      <article className="cc-metric">
        <div className="cc-metric-top"><span>PARTNERSHIP</span><span className="cc-metric-mark">03</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.partnerships)}</div>
        <div className="cc-metric-label">ห้างหุ้นส่วน</div>
        <div className="cc-metric-foot">ข้อมูลจากทะเบียนกิจการ</div>
      </article>
      <article className="cc-metric cc-alert-metric">
        <div className="cc-metric-top"><span>NEEDS ATTENTION</span><span className="cc-metric-mark">04</span></div>
        <div className="cc-metric-value">{loading ? '—' : number(metrics.overdue.length)}</div>
        <div className="cc-metric-label">งานเกินกำหนด</div>
        <div className="cc-metric-foot">งานที่ยังไม่เสร็จและเลยกำหนด</div>
      </article>
    </section>

    <section className="cc-workspace-grid">
      <article className="cc-section cc-progress-section">
        <div className="cc-section-head">
          <div><span className="cc-section-kicker">ANNUAL OPERATIONS</span><h2>ความคืบหน้างานประจำปี</h2><p>สถานะงานทั้งหมดในรอบปีบัญชีนี้</p></div>
          <button className="cc-link-action" onClick={() => navigate('work')}>จัดการงาน <span>↗</span></button>
        </div>
        {loading ? <div className="cc-state">กำลังรวบรวมข้อมูล…</div> : tasks.length ? <>
          <div className="cc-progress-main"><strong>{metrics.percent}<small>%</small></strong><div><b>ดำเนินการเสร็จแล้ว</b><span>{number(metrics.done)} จาก {number(tasks.length)} รายการ</span></div></div>
          <div className="cc-progress-track" role="progressbar" aria-label="ความคืบหน้างานประจำปี" aria-valuenow={metrics.percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: metrics.percent + '%' }} /></div>
          <div className="cc-progress-breakdown">
            <div><i className="cc-dot cc-dot-done" /><span>เสร็จแล้ว</span><b>{number(metrics.done)}</b></div>
            <div><i className="cc-dot cc-dot-active" /><span>กำลังดำเนินการ</span><b>{number(metrics.active)}</b></div>
            <div><i className="cc-dot cc-dot-pending" /><span>รอดำเนินการ</span><b>{number(metrics.pending)}</b></div>
          </div>
        </> : <div className="cc-state cc-empty"><b>ยังไม่มีข้อมูลงานประจำปี</b><span>เพิ่มงานให้กิจการเพื่อเริ่มติดตามความคืบหน้า</span><button onClick={() => navigate('work')}>ไปยังงานประจำปี</button></div>}
      </article>

      <article className="cc-section cc-follow-section">
        <div className="cc-section-head">
          <div><span className="cc-section-kicker">FOLLOW-UP</span><h2>รายการที่ต้องติดตาม</h2><p>งานค้างและกำหนดส่งที่ใกล้ถึง</p></div>
          <button className="cc-link-action" onClick={() => navigate('work')}>ดูทั้งหมด <span>↗</span></button>
        </div>
        {loading ? <div className="cc-state">กำลังโหลดรายการ…</div> : metrics.overdue.length || metrics.upcoming.length ? <div className="cc-follow-list">
          {metrics.overdue.slice(0, 3).map(task => <div className="cc-follow-row" key={task.id}><i className="cc-follow-indicator cc-follow-late" /><div className="cc-follow-copy"><b>{task.taskName}</b><span>{task.businessName}</span></div><em className="cc-late-label">เกินกำหนด</em></div>)}
          {metrics.upcoming.slice(0, 4).map(task => <div className="cc-follow-row" key={task.id}><i className="cc-follow-indicator cc-follow-next" /><div className="cc-follow-copy"><b>{task.taskName}</b><span>{task.businessName}</span></div><time>{new Date(task.dueDate + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</time></div>)}
        </div> : <div className="cc-state cc-empty"><b>ไม่มีรายการที่ต้องติดตาม</b><span>เมื่อมีงานและกำหนดส่ง จะแสดงรายการที่นี่</span></div>}
      </article>
    </section>

    <section className="cc-section cc-portfolio-section">
      <div className="cc-section-head cc-portfolio-head">
        <div><span className="cc-section-kicker">BUSINESS PORTFOLIO</span><h2>กิจการในทะเบียน</h2><p>รายการล่าสุดจากข้อมูล Cloudflare D1 ของพื้นที่ทำงาน</p></div>
        <button className="cc-link-action" onClick={() => navigate('businesses')}>ดูทะเบียนทั้งหมด <span>↗</span></button>
      </div>
      {loading ? <div className="cc-state">กำลังโหลดทะเบียน…</div> : businesses.length ? <div className="cc-portfolio-table-wrap"><table className="cc-portfolio-table">
        <thead><tr><th>ลำดับ</th><th>ชื่อกิจการ</th><th>เลขทะเบียน</th><th>ประเภทกิจการ</th><th>สถานะ</th></tr></thead>
        <tbody>{businesses.slice(0, 6).map((business, index) => <tr key={business.id}>
          <td className="cc-sequence">{business.sequenceNo || String(index + 1).padStart(3, '0')}</td>
          <td className="cc-business-name">{business.companyName || 'ไม่ระบุชื่อกิจการ'}</td>
          <td className="cc-tax-id">{business.taxId || '—'}</td>
          <td>{typeLabel[business.type || ''] || 'ไม่ระบุประเภท'}</td>
          <td><span className={'cc-status cc-status-' + (business.status || 'pending')}>{statusLabel[business.status || 'pending'] || 'รอดำเนินการ'}</span></td>
        </tr>)}</tbody>
      </table></div> : <div className="cc-state cc-empty"><b>ยังไม่มีข้อมูลกิจการ</b><span>เพิ่มกิจการเพื่อเริ่มใช้งานพื้นที่ทำงาน</span><button onClick={() => navigate('businesses')}>เพิ่มกิจการ</button></div>}
    </section>
  </section>;
}
