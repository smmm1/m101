import React, { useMemo } from 'react';
import { ArrowUpRight, Building2, CheckCircle2, Clock3, CircleAlert, FilePlus2, ListChecks } from 'lucide-react';
import { BusinessRecord } from '../types';
import './PremiumDashboard.css';

type Props = {
  records: BusinessRecord[];
  year: string;
  isLoggedIn: boolean;
  onNavigate: (tab: 'directory' | 'tasks' | 'import') => void;
  onAddBusiness: () => void;
  onOpenRecord: (record: BusinessRecord) => void;
};

const number = (value: number) => value.toLocaleString('th-TH');

export const PremiumDashboard: React.FC<Props> = ({
  records, year, isLoggedIn, onNavigate, onAddBusiness, onOpenRecord,
}) => {
  const stats = useMemo(() => {
    const completed = records.filter((record) => record.status === 'completed').length;
    const inProgress = records.filter((record) => record.status === 'in_progress').length;
    const pending = records.length - completed - inProgress;
    const company = records.filter((record) => record.type === 'company').length;
    const partnership = records.filter((record) => record.type === 'partnership').length;
    const individual = records.filter((record) => record.type === 'individual').length;
    return {
      completed, inProgress, pending, company, partnership, individual,
      completion: records.length ? Math.round(completed / records.length * 100) : 0,
    };
  }, [records]);

  const mix = [
    { label: 'บริษัทจำกัด', value: stats.company, className: 'pd-company' },
    { label: 'ห้างหุ้นส่วน', value: stats.partnership, className: 'pd-partnership' },
    { label: 'บุคคลธรรมดา', value: stats.individual, className: 'pd-individual' },
  ];
  const recent = [...records]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .slice(0, 6);

  return (
    <section className="pd-page" aria-labelledby="pd-title">
      <header className="pd-heading">
        <div>
          <div className="pd-eyebrow"><span /> BUSINESS WORKSPACE <i>/</i> FY {year}</div>
          <h1 id="pd-title">ภาพรวมกิจการ</h1>
          <p>ภาพรวมพอร์ตโฟลิโอและสถานะการดูแลกิจการในรอบปีบัญชี</p>
        </div>
        <div className="pd-actions">
          <button type="button" className="pd-button pd-button-secondary" onClick={() => onNavigate('directory')}><Building2 size={16} /> ทะเบียนกิจการ <ArrowUpRight size={14} /></button>
          {isLoggedIn && <button type="button" className="pd-button pd-button-primary" onClick={onAddBusiness}><FilePlus2 size={16} /> เพิ่มกิจการ</button>}
        </div>
      </header>

      <div className="pd-metrics" aria-label="ตัวชี้วัดภาพรวม">
        <article className="pd-metric pd-metric-primary"><span>กิจการทั้งหมด</span><strong>{number(records.length)}</strong><small>รายการในปีบัญชี {year}</small><Building2 className="pd-metric-icon" size={19} /></article>
        <article className="pd-metric"><span>เสร็จสิ้น</span><strong>{number(stats.completed)}</strong><small><CheckCircle2 size={13} /> ดำเนินการเรียบร้อย</small></article>
        <article className="pd-metric"><span>กำลังดำเนินการ</span><strong>{number(stats.inProgress)}</strong><small><Clock3 size={13} /> อยู่ระหว่างจัดการ</small></article>
        <article className="pd-metric"><span>รอดำเนินการ</span><strong>{number(stats.pending)}</strong><small><CircleAlert size={13} /> ยังไม่เริ่มดำเนินการ</small></article>
      </div>

      <div className="pd-main-grid">
        <section className="pd-panel pd-progress-panel">
          <div className="pd-panel-heading"><div><span className="pd-section-label">ANNUAL OVERVIEW</span><h2>ความคืบหน้าการดูแลกิจการ</h2></div><span className="pd-period">FY {year}</span></div>
          <div className="pd-progress-summary"><div className="pd-progress-value"><strong>{stats.completion}<small>%</small></strong><span>เสร็จสิ้นแล้ว</span></div><div className="pd-progress-detail"><div className="pd-progress-track" role="img" aria-label={`เสร็จสิ้น ${stats.completed} จาก ${records.length} รายการ`}><span style={{ width: `${stats.completion}%` }} /></div><div className="pd-progress-caption"><b>{number(stats.completed)} จาก {number(records.length)} รายการ</b><span>อ้างอิงสถานะทะเบียนกิจการ</span></div></div></div>
          <div className="pd-status-legend"><span><i className="pd-dot pd-dot-done" />เสร็จสิ้น <b>{number(stats.completed)}</b></span><span><i className="pd-dot pd-dot-active" />กำลังดำเนินการ <b>{number(stats.inProgress)}</b></span><span><i className="pd-dot pd-dot-pending" />รอดำเนินการ <b>{number(stats.pending)}</b></span></div>
        </section>

        <section className="pd-panel pd-mix-panel">
          <div className="pd-panel-heading"><div><span className="pd-section-label">PORTFOLIO MIX</span><h2>สัดส่วนประเภทกิจการ</h2></div><span className="pd-mix-total">{number(records.length)} <small>รายการ</small></span></div>
          <div className="pd-mix-list">{mix.map((item) => <div className="pd-mix-row" key={item.className}><div className="pd-mix-label"><span>{item.label}</span><b>{number(item.value)}</b></div><div className="pd-mix-track"><span className={item.className} style={{ width: `${records.length ? item.value / records.length * 100 : 0}%` }} /></div></div>)}</div>
        </section>
      </div>

      <section className="pd-panel pd-recent-panel">
        <div className="pd-panel-heading"><div><span className="pd-section-label">RECENT ACTIVITY</span><h2>กิจการที่อัปเดตล่าสุด</h2><p>รายการล่าสุดจากทะเบียนกิจการ</p></div><button type="button" className="pd-link-button" onClick={() => onNavigate('directory')}>ดูทะเบียนทั้งหมด <ArrowUpRight size={14} /></button></div>
        {recent.length ? <div className="pd-table-wrap"><table className="pd-table"><thead><tr><th>ลำดับ</th><th>กิจการ</th><th>ประเภท</th><th>สถานะ</th><th><span className="sr-only">เปิดรายการ</span></th></tr></thead><tbody>{recent.map((record) => <tr key={record.id}><td className="pd-sequence">{record.sequenceNo || '—'}</td><td><button type="button" className="pd-record-link" onClick={() => onOpenRecord(record)}>{record.companyName || 'ไม่ระบุชื่อกิจการ'}</button><small className="pd-tax-id">{record.taxId || 'ไม่มีเลขประจำตัวผู้เสียภาษี'}</small></td><td>{record.type === 'partnership' ? 'ห้างหุ้นส่วน' : record.type === 'individual' ? 'บุคคลธรรมดา' : 'บริษัทจำกัด'}</td><td><span className={`pd-status pd-status-${record.status || 'pending'}`}>{record.status === 'completed' ? 'เสร็จสิ้น' : record.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}</span></td><td className="pd-open-cell"><button type="button" onClick={() => onOpenRecord(record)} aria-label={`เปิดข้อมูล ${record.companyName}`}><ArrowUpRight size={16} /></button></td></tr>)}</tbody></table></div> : <div className="pd-empty"><ListChecks size={22} /><b>ยังไม่มีข้อมูลกิจการ</b><span>เพิ่มกิจการหรือนำเข้าข้อมูลเพื่อเริ่มต้นใช้งาน</span>{isLoggedIn && <button type="button" onClick={onAddBusiness}>เพิ่มกิจการแรก</button>}</div>}
      </section>
    </section>
  );
};
