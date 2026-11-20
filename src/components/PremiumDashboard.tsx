import React, { useMemo } from 'react';
import { ArrowRight, Building2, CheckCircle2, Clock3, FilePlus2, FileSpreadsheet, ListChecks } from 'lucide-react';
import { BusinessRecord } from '../types';

type Props = {
  records: BusinessRecord[];
  year: string;
  isLoggedIn: boolean;
  onNavigate: (tab: 'directory' | 'tasks' | 'import') => void;
  onAddBusiness: () => void;
  onOpenRecord: (record: BusinessRecord) => void;
};

const count = (value: number) => value.toLocaleString('th-TH');
const statusText = (status?: string) => status === 'completed' ? 'เสร็จสิ้น' : status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';

export const PremiumDashboard: React.FC<Props> = ({ records, year, isLoggedIn, onNavigate, onAddBusiness, onOpenRecord }) => {
  const stats = useMemo(() => {
    const completed = records.filter((record) => record.status === 'completed').length;
    const inProgress = records.filter((record) => record.status === 'in_progress').length;
    const pending = Math.max(0, records.length - completed - inProgress);
    const groups = [
      { key: 'company', label: 'บริษัทจำกัด' },
      { key: 'partnership', label: 'ห้างหุ้นส่วน' },
      { key: 'individual', label: 'บุคคลธรรมดา' },
    ].map((item) => ({ ...item, value: records.filter((record) => record.type === item.key).length }));
    return { completed, inProgress, pending, percent: records.length ? Math.round(completed / records.length * 100) : 0, groups };
  }, [records]);

  const recent = useMemo(() => [...records]
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    .slice(0, 6), [records]);

  return (
    <section className="m101-overview w-full max-w-[1500px] mx-auto flex flex-col gap-5" aria-labelledby="m101-dashboard-title">
      <header className="m101-overview-header flex justify-between">
        <div>
          <p className="m101-eyebrow">WORKSPACE OVERVIEW</p>
          <h1 id="m101-dashboard-title">ภาพรวมทะเบียนกิจการ</h1>
          <p>สรุปสถานะและข้อมูลสำคัญของกิจการในรอบปีบัญชี {year}</p>
        </div>
        <div className="m101-overview-actions flex items-center gap-2">
          <button type="button" onClick={() => onNavigate('directory')} className="m101-button-secondary"><Building2 size={15} /> ทะเบียนกิจการ <ArrowRight size={14} /></button>
          {isLoggedIn && <button type="button" onClick={onAddBusiness} className="m101-button-primary"><FilePlus2 size={15} /> เพิ่มกิจการ</button>}
        </div>
      </header>

      <div className="m101-overview-metrics grid grid-cols-4 gap-3" aria-label="สรุปจำนวนกิจการ">
        <article className="m101-metric-card m101-metric-total">
          <span className="m101-metric-label">กิจการทั้งหมด</span>
          <strong>{count(records.length)}</strong>
          <span className="m101-metric-foot">รายการในปีบัญชี {year}</span>
        </article>
        <article className="m101-metric-card">
          <span className="m101-metric-label">เสร็จสิ้น</span>
          <strong>{count(stats.completed)}</strong>
          <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-done" /> ดำเนินการเรียบร้อย</span>
        </article>
        <article className="m101-metric-card">
          <span className="m101-metric-label">กำลังดำเนินการ</span>
          <strong>{count(stats.inProgress)}</strong>
          <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-progress" /> อยู่ระหว่างจัดการ</span>
        </article>
        <article className="m101-metric-card">
          <span className="m101-metric-label">รอดำเนินการ</span>
          <strong>{count(stats.pending)}</strong>
          <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-pending" /> ยังไม่เริ่มดำเนินการ</span>
        </article>
      </div>

      <div className="m101-overview-grid grid grid-cols-2 gap-3">
        <section className="m101-overview-panel m101-status-panel">
          <div className="m101-panel-heading m101-status-heading">
            <div><p className="m101-eyebrow">ANNUAL WORK STATUS</p><h2>ความคืบหน้ารอบปีบัญชี</h2><p className="m101-panel-subtitle">ภาพรวมสถานะการจัดการทะเบียนกิจการ</p></div>
            <div className="m101-status-completion"><strong>{stats.percent}%</strong><span>เสร็จแล้ว</span></div>
          </div>
          <div className="m101-status-total-line"><span>รายการทั้งหมด</span><b>{count(records.length)} รายการ</b></div>
          <div className="m101-progress-stack m101-progress-stack-large" role="img" aria-label={`เสร็จสิ้น ${stats.completed} กำลังดำเนินการ ${stats.inProgress} รอดำเนินการ ${stats.pending}`}>
            <span className="m101-progress-done" style={{ width: `${records.length ? stats.completed / records.length * 100 : 0}%` }} />
            <span className="m101-progress-active" style={{ width: `${records.length ? stats.inProgress / records.length * 100 : 0}%` }} />
            <span className="m101-progress-waiting" style={{ width: `${records.length ? stats.pending / records.length * 100 : 0}%` }} />
          </div>
          <div className="m101-status-legend m101-status-legend-counts">
            <span><i className="m101-status-dot m101-dot-done" />เสร็จสิ้น <b>{count(stats.completed)} · {records.length ? Math.round(stats.completed / records.length * 100) : 0}%</b></span>
            <span><i className="m101-status-dot m101-dot-progress" />กำลังดำเนินการ <b>{count(stats.inProgress)} · {records.length ? Math.round(stats.inProgress / records.length * 100) : 0}%</b></span>
            <span><i className="m101-status-dot m101-dot-pending" />รอดำเนินการ <b>{count(stats.pending)} · {records.length ? Math.round(stats.pending / records.length * 100) : 0}%</b></span>
          </div>
          <p className="m101-dashboard-data-note">สถานะนี้สรุปจากข้อมูลทะเบียนกิจการ ไม่ใช่สถานะการยื่นแบบภาษี</p>
        </section>

        <section className="m101-overview-panel m101-category-panel">
          <div className="m101-panel-heading"><div><p className="m101-eyebrow">PORTFOLIO COMPOSITION</p><h2>สัดส่วนประเภทกิจการ</h2><p className="m101-panel-subtitle">จำแนกตามรูปแบบนิติบุคคลและผู้ประกอบการ</p></div></div>
          <div className="m101-category-breakdown">
            {stats.groups.map((group) => (
              <div className="m101-category-row" key={group.key}>
                <div className="m101-category-row-head"><b>{group.label}</b><span>{count(group.value)} / {count(records.length)} รายการ <strong>{records.length ? Math.round(group.value / records.length * 100) : 0}%</strong></span></div>
                <div className="m101-category-bar" role="img" aria-label={`${group.label} ${group.value} จาก ${records.length} รายการ`}>
                  <span className="m101-category-done" style={{ width: `${records.length ? group.value / records.length * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="m101-dashboard-data-note">รวม {count(records.length)} กิจการในทะเบียนปีบัญชี {year}</div>
        </section>
      </div>

      <section className="m101-overview-panel m101-recent-panel">
        <div className="m101-panel-heading">
          <div><p className="m101-eyebrow">RECENT RECORDS</p><h2>รายการกิจการล่าสุด</h2><p className="m101-panel-subtitle">เลือกกิจการเพื่อเปิดดูรายละเอียด</p></div>
          <button type="button" className="m101-text-action" onClick={() => onNavigate('directory')}>ดูทะเบียนทั้งหมด <ArrowRight size={14} /></button>
        </div>
        {recent.length ? (
          <div className="m101-dashboard-table-wrap">
            <table className="m101-dashboard-table">
              <thead><tr><th>ลำดับ</th><th>ชื่อกิจการ</th><th>ประเภท</th><th>สถานะ</th><th><span className="sr-only">เปิดรายการ</span></th></tr></thead>
              <tbody>{recent.map((record) => (
                <tr key={record.id}>
                  <td className="m101-dashboard-sequence">{record.sequenceNo || '—'}</td>
                  <td><button type="button" className="m101-dashboard-record-link" onClick={() => onOpenRecord(record)}>{record.companyName || 'ไม่ระบุชื่อกิจการ'}</button><small>{record.taxId || 'ไม่มีเลขประจำตัวผู้เสียภาษี'}</small></td>
                  <td>{record.type === 'partnership' ? 'ห้างหุ้นส่วน' : record.type === 'individual' ? 'บุคคลธรรมดา' : 'บริษัทจำกัด'}</td>
                  <td><span className={`m101-dashboard-status status-${record.status || 'pending'}`}>{statusText(record.status)}</span></td>
                  <td className="m101-dashboard-open"><button type="button" onClick={() => onOpenRecord(record)} aria-label={`เปิดข้อมูล ${record.companyName}`}><ArrowRight size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="m101-overview-empty"><ListChecks size={22} /><b>ยังไม่มีรายการกิจการ</b><p>เพิ่มข้อมูลใหม่หรือนำเข้าไฟล์เพื่อเริ่มใช้งานทะเบียน</p>{isLoggedIn && <button type="button" className="m101-button-primary" onClick={onAddBusiness}>เพิ่มกิจการแรก</button>}</div>
        )}
      </section>
    </section>
  );
};
