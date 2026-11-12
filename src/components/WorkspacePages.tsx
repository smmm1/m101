import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type Business = {
  id: string; sequenceNo?: string; companyName?: string; taxId?: string;
  type?: string; auditorDate?: string; password?: string; remark?: string;
  eFilingCode?: string; ssoCode?: string; status?: string; isVerifiedDbd?: boolean;
  topic?: string; sourceType?: string; sourceFileName?: string;
  createdAt?: string; updatedAt?: string;
};
type AnnualTask = {
  id: string; fiscalYear: string; businessId: string; businessName: string;
  taskCode: string; taskName: string; status: 'pending' | 'in_progress' | 'completed';
  dueDate: string; note: string; createdAt: string; updatedAt: string;
};
const statusText: Record<string, string> = { pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว' };
const typeText: Record<string, string> = { company: 'บริษัทจำกัด', partnership: 'ห้างหุ้นส่วน', individual: 'บุคคลธรรมดา' };
const makeId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `m101-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function apiJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `คำขอล้มเหลว (${response.status})`);
  return payload;
}

export function CommandCenter({ navigate, year = '69' }: { navigate: (page: 'businesses' | 'work') => void; year?: string }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tasks, setTasks] = useState<AnnualTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [directory, work] = await Promise.all([
        apiJson(`/api/directory?year=${encodeURIComponent(year)}`),
        apiJson(`/api/annual-tasks?year=${encodeURIComponent(year)}`),
      ]);
      setBusinesses(Array.isArray(directory.records) ? directory.records : []);
      setTasks(Array.isArray(work.tasks) ? work.tasks : []);
    } catch (e) { setError(e instanceof Error ? e.message : 'โหลดข้อมูลภาพรวมไม่สำเร็จ'); }
    finally { setLoading(false); }
  }, [year]);
  useEffect(() => { void load(); }, [load]);
  const done = tasks.filter(t => t.status === 'completed').length;
  const active = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.length - done - active;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate < today);
  const upcoming = tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate >= today).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0,5);
  const companyCount = businesses.filter(b => b.type === 'company').length;
  const partnershipCount = businesses.filter(b => b.type === 'partnership').length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  return <section className="m101-page m101-dashboard-page">
    <div className="m101-page-heading"><div><span className="m101-eyebrow">MUSTANG BUSINESS WORKSPACE</span><h1>ศูนย์บัญชาการ</h1><p>ภาพรวมกิจการและภาระงานที่ต้องติดตาม · ปี {year}</p></div><button className="m101-button m101-button-primary" onClick={() => navigate('businesses')}>ดูทะเบียนกิจการ <span>→</span></button></div>
    {error && <div className="m101-alert" role="alert">{error}<button onClick={() => void load()}>ลองอีกครั้ง</button></div>}
    <div className="m101-stat-grid">
      <article className="m101-stat"><span>กิจการทั้งหมด</span><strong>{loading ? '—' : businesses.length.toLocaleString('th-TH')}</strong><small>ข้อมูลในรอบปีที่เลือก</small></article>
      <article className="m101-stat"><span>บริษัทจำกัด</span><strong>{loading ? '—' : companyCount.toLocaleString('th-TH')}</strong><small>จากทะเบียนกิจการ</small></article>
      <article className="m101-stat"><span>ห้างหุ้นส่วน</span><strong>{loading ? '—' : partnershipCount.toLocaleString('th-TH')}</strong><small>จากทะเบียนกิจการ</small></article>
      <article className="m101-stat"><span>งานเกินกำหนด</span><strong className={overdue.length ? 'is-danger' : ''}>{loading ? '—' : overdue.length.toLocaleString('th-TH')}</strong><small>งานที่ยังไม่เสร็จและเลยกำหนด</small></article>
    </div>
    <div className="m101-dashboard-grid">
      <article className="m101-panel">
        <div className="m101-panel-heading"><div><span className="m101-eyebrow">ANNUAL OPERATIONS</span><h2>ความคืบหน้างานประจำปี</h2><p>คำนวณจากรายการงานที่บันทึกในระบบ</p></div><button className="m101-text-button" onClick={() => navigate('work')}>จัดการงาน →</button></div>
        {loading ? <div className="m101-empty-state">กำลังโหลดข้อมูล…</div> : tasks.length ? <><div className="m101-progress-summary"><strong>{percent}%</strong><span>เสร็จแล้ว {done.toLocaleString('th-TH')} จาก {tasks.length.toLocaleString('th-TH')} งาน</span></div><div className="m101-progress-track"><i style={{width: `${percent}%`}} /></div><div className="m101-status-legend"><span><i className="done-dot"/> เสร็จแล้ว <b>{done}</b></span><span><i className="active-dot"/> กำลังทำ <b>{active}</b></span><span><i className="pending-dot"/> รอดำเนินการ <b>{pending}</b></span></div></> : <div className="m101-empty-state"><b>ยังไม่มีข้อมูลงานประจำปี</b><span>เพิ่มงานให้กิจการเพื่อเริ่มติดตามความคืบหน้า</span><button onClick={() => navigate('work')}>ไปยังงานประจำปี</button></div>}
      </article>
      <article className="m101-panel">
        <div className="m101-panel-heading"><div><span className="m101-eyebrow">FOLLOW-UP</span><h2>รายการที่ต้องติดตาม</h2><p>กำหนดส่งที่ใกล้ถึงและงานค้าง</p></div><button className="m101-text-button" onClick={() => navigate('work')}>ดูทั้งหมด →</button></div>
        {loading ? <div className="m101-empty-state">กำลังโหลดข้อมูล…</div> : overdue.length || upcoming.length ? <div className="m101-follow-list">{overdue.slice(0,3).map(t => <div className="m101-follow-item" key={t.id}><i className="pending-dot"/><div><b>{t.taskName}</b><small>{t.businessName}</small></div><em className="is-danger">เกินกำหนด</em></div>)}{upcoming.slice(0,4).map(t => <div className="m101-follow-item" key={t.id}><i className="active-dot"/><div><b>{t.taskName}</b><small>{t.businessName}</small></div><em>{new Date(t.dueDate+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'})}</em></div>)}</div> : <div className="m101-empty-state"><b>ไม่มีรายการที่ต้องติดตาม</b><span>เมื่อมีงานและกำหนดส่ง จะแสดงรายการที่นี่</span></div>}
      </article>
    </div>
    <div className="m101-panel m101-portfolio-panel"><div className="m101-panel-heading"><div><span className="m101-eyebrow">PORTFOLIO</span><h2>กิจการล่าสุดในทะเบียน</h2><p>ข้อมูลจาก Cloudflare D1 ของพื้นที่ทำงาน</p></div><button className="m101-text-button" onClick={() => navigate('businesses')}>เปิดทะเบียน →</button></div>{loading ? <div className="m101-empty-state">กำลังโหลดข้อมูล…</div> : businesses.length ? <div className="m101-compact-list">{businesses.slice(0,6).map(b=><div className="m101-compact-row" key={b.id}><span className="m101-record-index">{b.sequenceNo || '—'}</span><div><b>{b.companyName || 'ไม่ระบุชื่อกิจการ'}</b><small>{b.taxId || 'ไม่มีเลขทะเบียน'} · {typeText[b.type || ''] || 'ไม่ระบุประเภท'}</small></div><span className={'m101-status-chip status-'+(b.status || 'pending')}>{statusText[b.status || 'pending'] || 'รอดำเนินการ'}</span></div>)}</div> : <div className="m101-empty-state"><b>ยังไม่มีข้อมูลกิจการ</b><span>เพิ่มกิจการเพื่อเริ่มใช้งานพื้นที่ทำงาน</span><button onClick={() => navigate('businesses')}>เพิ่มกิจการ</button></div>}</div>
  </section>;
}

const blankBusiness = (): Business => ({ id: makeId(), sequenceNo: '', companyName: '', taxId: '', type: 'company', auditorDate: '', password: '', remark: '', eFilingCode: '', ssoCode: '', status: 'pending', isVerifiedDbd: false });
export function BusinessRegistry({ year: initialYear = '69', globalSearch = '', onYearChange }: { year?: string; globalSearch?: string; onYearChange?: (year: string) => void }) {
  const [year,setYear] = useState(initialYear);
  useEffect(()=>{setYear(initialYear);},[initialYear]);
  const [years,setYears] = useState<string[]>([initialYear]);
  const [records,setRecords] = useState<Business[]>([]);
  const [revision,setRevision] = useState(1);
  const [query,setQuery] = useState('');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [editor,setEditor] = useState<Business|null>(null);
  const [showPassword,setShowPassword] = useState(false);
  const [newYear,setNewYear] = useState('');
  const search = (query || globalSearch).trim().toLocaleLowerCase('th-TH');
  const load = useCallback(async (targetYear=year) => {
    setLoading(true);setError('');
    try {
      const data=await apiJson('/api/directory?year='+encodeURIComponent(targetYear));
      setRecords(Array.isArray(data.records)?data.records:[]);
      setYears(Array.isArray(data.availableYears)&&data.availableYears.length?data.availableYears:[targetYear]);
      setRevision(Number(data.revision)||1);
    } catch(e){setError(e instanceof Error?e.message:'โหลดทะเบียนกิจการไม่สำเร็จ');}
    finally{setLoading(false);}
  },[year]);
  useEffect(()=>{void load(year);},[year,load]);
  const filtered=useMemo(()=>records.filter(r=>[r.companyName,r.taxId,r.sequenceNo,r.eFilingCode,r.ssoCode,r.remark,r.auditorDate,typeText[r.type||'']].join(' ').toLocaleLowerCase('th-TH').includes(search)),[records,search]);
  const save=async(next:Business[])=>{
    setSaving(true);setError('');
    try{
      const data=await apiJson('/api/directory',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:year,records:next,revision})});
      setRecords(next);setRevision(Number(data.revision)||revision+1);
      setEditor(null);setShowPassword(false);
    }catch(e){setError(e instanceof Error?e.message:'บันทึกทะเบียนไม่สำเร็จ');if(e instanceof Error&&e.message.includes('เปลี่ยนแปลง'))void load(year);}
    finally{setSaving(false);}
  };
  const exportCsv=()=>{
    const cols=['sequenceNo','companyName','type','taxId','eFilingCode','ssoCode','auditorDate','status','isVerifiedDbd','remark'];
    const csv=[cols.join(','),...filtered.map(r=>cols.map(k=>{const v=String((r as any)[k]??'');return '"'+v.replace(/"/g,'""')+'"';}).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`M101-businesses-${year}.csv`;a.click();URL.revokeObjectURL(url);
  };
  const startNewYear=async()=>{
    const value=newYear.trim();if(!/^\\d{2,4}$/.test(value)){setError('กรุณากรอกรอบปีบัญชีเป็นตัวเลข 2–4 หลัก');return;}
    if(years.includes(value)){setYear(value);onYearChange?.(value);setNewYear('');return;}
    const data=await apiJson('/api/directory',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:value,records:[],revision})});
    setRevision(Number(data.revision)||revision+1);setYears(prev=>[...prev,value].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));setYear(value);setNewYear('');
  };
  return <section className="m101-page m101-registry-page">
    <div className="m101-page-heading"><div><span className="m101-eyebrow">BUSINESS PORTFOLIO</span><h1>ทะเบียนกิจการ</h1><p>จัดเก็บและจัดการข้อมูลนิติบุคคลในพื้นที่ทำงาน</p></div><div className="m101-heading-actions"><button className="m101-button" onClick={exportCsv}>↓ ส่งออก CSV</button><button className="m101-button m101-button-primary" onClick={()=>setEditor(blankBusiness())}>＋ เพิ่มกิจการ</button></div></div>
    <div className="m101-registry-toolbar"><div className="m101-registry-count"><strong>{filtered.length.toLocaleString('th-TH')}</strong><span>จาก {records.length.toLocaleString('th-TH')} กิจการ</span></div><label className="m101-year-select">รอบปี <select value={year} onChange={e=>{setYear(e.target.value);onYearChange?.(e.target.value);}}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label><div className="m101-add-year"><input aria-label="รอบปีใหม่" value={newYear} onChange={e=>setNewYear(e.target.value)} placeholder="ปีใหม่"/><button onClick={()=>void startNewYear()}>เพิ่มปี</button></div><input className="m101-registry-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อ เลขทะเบียน หรือรหัส..."/></div>
    {error&&<div className="m101-alert" role="alert">{error}<button onClick={()=>void load(year)}>โหลดข้อมูลล่าสุด</button></div>}
    <div className="m101-table-wrap"><table className="m101-data-table"><thead><tr><th>ลำดับ</th><th>ชื่อกิจการ</th><th>ประเภท</th><th>เลขทะเบียน / ผู้เสียภาษี</th><th>e-Filing</th><th>ประกันสังคม</th><th>วันที่ผู้สอบบัญชี</th><th>สถานะ</th><th>ตรวจ DBD</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>
      {loading?<tr><td colSpan={11} className="m101-table-state">กำลังโหลดข้อมูลจาก D1…</td></tr>:filtered.length===0?<tr><td colSpan={11} className="m101-table-state">{records.length?'ไม่พบข้อมูลที่ตรงกับคำค้นหา':'ยังไม่มีข้อมูลกิจการในรอบปีนี้'}</td></tr>:filtered.map((r,i)=><tr key={r.id}><td className="m101-sequence">{r.sequenceNo||String(i+1).padStart(3,'0')}</td><td><b className="m101-business-name">{r.companyName||'ไม่ระบุชื่อกิจการ'}</b><small className="m101-business-sub">{r.topic||r.sourceFileName||'—'}</small></td><td>{typeText[r.type||'']||'ไม่ระบุ'}</td><td className="m101-mono">{r.taxId||'—'}</td><td className="m101-mono">{r.eFilingCode||'—'}</td><td className="m101-mono">{r.ssoCode||'—'}</td><td>{r.auditorDate||'—'}</td><td><span className={'m101-status-chip status-'+(r.status||'pending')}>{statusText[r.status||'pending']||'รอดำเนินการ'}</span></td><td>{r.isVerifiedDbd?'ยืนยันแล้ว':'รอตรวจสอบ'}</td><td className="m101-remark">{r.remark||'—'}</td><td><div className="m101-row-actions"><button onClick={()=>{setEditor({...r});setShowPassword(false);}}>แก้ไข</button><button className="danger" onClick={()=>{if(window.confirm('ยืนยันลบ '+(r.companyName||'กิจการนี้')+'?'))void save(records.filter(x=>x.id!==r.id));}}>ลบ</button></div></td></tr>)}
    </tbody></table></div>
    <p className="m101-table-footnote">ข้อมูลจัดเก็บใน Cloudflare D1 · รหัสผ่านไม่แสดงในตาราง · การบันทึกใช้เลขรุ่นป้องกันข้อมูลชนกัน</p>
    {editor&&<div className="m101-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)setEditor(null);}}><form className="m101-editor" onSubmit={e=>{e.preventDefault();const normalized={...editor,companyName:editor.companyName?.trim(),updatedAt:new Date().toISOString(),createdAt:editor.createdAt||new Date().toISOString()};const exists=records.some(r=>r.id===editor.id);void save(exists?records.map(r=>r.id===editor.id?normalized:r):[{...normalized,sequenceNo:normalized.sequenceNo||String(records.length+1)},...records]);}}><div className="m101-editor-head"><div><span className="m101-eyebrow">BUSINESS RECORD</span><h2>{records.some(r=>r.id===editor.id)?'แก้ไขข้อมูลกิจการ':'เพิ่มกิจการ'}</h2></div><button type="button" onClick={()=>setEditor(null)}>×</button></div><div className="m101-form-grid">
      <label>ชื่อกิจการ<input required value={editor.companyName||''} onChange={e=>setEditor({...editor,companyName:e.target.value})}/></label>
      <label>เลขทะเบียน / เลขผู้เสียภาษี<input value={editor.taxId||''} onChange={e=>setEditor({...editor,taxId:e.target.value})}/></label>
      <label>ประเภทกิจการ<select value={editor.type||'company'} onChange={e=>setEditor({...editor,type:e.target.value})}><option value="company">บริษัทจำกัด</option><option value="partnership">ห้างหุ้นส่วน</option><option value="individual">บุคคลธรรมดา</option></select></label>
      <label>ลำดับ<input value={editor.sequenceNo||''} onChange={e=>setEditor({...editor,sequenceNo:e.target.value})}/></label>
      <label>รหัส e-Filing<input value={editor.eFilingCode||''} onChange={e=>setEditor({...editor,eFilingCode:e.target.value})}/></label>
      <label>รหัสประกันสังคม<input value={editor.ssoCode||''} onChange={e=>setEditor({...editor,ssoCode:e.target.value})}/></label>
      <label>วันที่ผู้สอบบัญชี<input value={editor.auditorDate||''} onChange={e=>setEditor({...editor,auditorDate:e.target.value})}/></label>
      <label>สถานะ<select value={editor.status||'pending'} onChange={e=>setEditor({...editor,status:e.target.value})}><option value="pending">รอดำเนินการ</option><option value="in_progress">กำลังดำเนินการ</option><option value="completed">เสร็จแล้ว</option></select></label>
      <label className="m101-password-field">รหัสผ่าน<input type={showPassword?'text':'password'} autoComplete="off" value={editor.password||''} onChange={e=>setEditor({...editor,password:e.target.value})}/><button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'ซ่อน':'แสดง'}</button></label>
      <label>หมายเหตุ<textarea value={editor.remark||''} onChange={e=>setEditor({...editor,remark:e.target.value})}/></label>
      <label className="m101-check-field"><input type="checkbox" checked={Boolean(editor.isVerifiedDbd)} onChange={e=>setEditor({...editor,isVerifiedDbd:e.target.checked})}/> ตรวจสอบ DBD แล้ว</label>
    </div><div className="m101-editor-actions"><button type="button" className="m101-button" onClick={()=>setEditor(null)} disabled={saving}>ยกเลิก</button><button type="submit" className="m101-button m101-button-primary" disabled={saving}>{saving?'กำลังบันทึก…':'บันทึกข้อมูล'}</button></div></form></div>}
  </section>;
}

export function AnnualWork({ year = '69' }: { year?: string }) {
  const [businesses,setBusinesses]=useState<Business[]>([]);
  const [tasks,setTasks]=useState<AnnualTask[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [businessId,setBusinessId]=useState('');
  const [taskCode,setTaskCode]=useState('PND50');
  const [taskName,setTaskName]=useState('ภ.ง.ด.50');
  const [dueDate,setDueDate]=useState('');
  const [note,setNote]=useState('');
  const [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{const [d,t]=await Promise.all([apiJson('/api/directory?year='+encodeURIComponent(year)),apiJson('/api/annual-tasks?year='+encodeURIComponent(year))]);setBusinesses(d.records||[]);setTasks(t.tasks||[]);if(!businessId&&d.records?.[0])setBusinessId(d.records[0].id);}
    catch(e){setError(e instanceof Error?e.message:'โหลดข้อมูลงานไม่สำเร็จ');}
    finally{setLoading(false);}
  },[year]);
  useEffect(()=>{void load();},[load]);
  const add=async(e:React.FormEvent)=>{e.preventDefault();if(!businessId)return;setSaving(true);try{await apiJson('/api/annual-tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:year,businessId,taskCode,taskName,dueDate,note})});setTaskName('');setNote('');setDueDate('');await load();}catch(e){setError(e instanceof Error?e.message:'เพิ่มงานไม่สำเร็จ');}finally{setSaving(false);}};
  const update=async(task:AnnualTask,status:string)=>{try{await apiJson('/api/annual-tasks/'+task.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,dueDate:task.dueDate,note:task.note})});await load();}catch(e){setError(e instanceof Error?e.message:'อัปเดตงานไม่สำเร็จ');}};
  const remove=async(task:AnnualTask)=>{if(!window.confirm('ยืนยันลบงาน '+task.taskName+'?'))return;try{await apiJson('/api/annual-tasks/'+task.id,{method:'DELETE'});await load();}catch(e){setError(e instanceof Error?e.message:'ลบงานไม่สำเร็จ');}};
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">ANNUAL OPERATIONS</span><h1>งานและภาระประจำปี</h1><p>จัดการงานตามกิจการและรอบปีบัญชี {year}</p></div></div>{error&&<div className="m101-alert" role="alert">{error}<button onClick={()=>void load()}>ลองอีกครั้ง</button></div>}
    <form className="m101-panel m101-task-form" onSubmit={add}><div className="m101-panel-heading"><div><h2>เพิ่มรายการงาน</h2><p>กำหนดงานและวันส่งให้กิจการที่เลือก</p></div></div><div className="m101-task-fields"><label>กิจการ<select required value={businessId} onChange={e=>setBusinessId(e.target.value)}><option value="">เลือกกิจการ</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.companyName}</option>)}</select></label><label>ประเภทงาน<select value={taskCode} onChange={e=>{setTaskCode(e.target.value);setTaskName(e.target.selectedOptions[0]?.text||'');}}><option value="PND50">ภ.ง.ด.50</option><option value="PND51">ภ.ง.ด.51</option><option value="SBCH3">ส.บ.ช.3</option><option value="AUDIT">ตรวจสอบบัญชี</option><option value="CUSTOM">งานอื่น ๆ</option></select></label><label>ชื่องาน<input required value={taskName} onChange={e=>setTaskName(e.target.value)}/></label><label>กำหนดส่ง<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>หมายเหตุ<input value={note} onChange={e=>setNote(e.target.value)}/></label><button className="m101-button m101-button-primary" disabled={saving||!businesses.length}>{saving?'กำลังบันทึก…':'เพิ่มงาน'}</button></div></form>
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>รายการงานทั้งหมด</h2><p>{tasks.length.toLocaleString('th-TH')} รายการในรอบปีนี้</p></div></div>{loading?<div className="m101-empty-state">กำลังโหลด…</div>:tasks.length?<div className="m101-work-list">{tasks.map(t=><div className="m101-work-row" key={t.id}><div><b>{t.taskName}</b><small>{t.businessName} · {t.taskCode} {t.dueDate?'· กำหนด '+new Date(t.dueDate+'T00:00:00').toLocaleDateString('th-TH'):''}</small>{t.note&&<p>{t.note}</p>}</div><select aria-label={'สถานะ '+t.taskName} value={t.status} onChange={e=>void update(t,e.target.value)}><option value="pending">รอดำเนินการ</option><option value="in_progress">กำลังดำเนินการ</option><option value="completed">เสร็จแล้ว</option></select><button className="m101-row-delete" onClick={()=>void remove(t)}>ลบ</button></div>)}</div>:<div className="m101-empty-state"><b>ยังไม่มีรายการงานประจำปี</b><span>เพิ่มงานจากแบบฟอร์มด้านบนเพื่อเริ่มติดตาม</span></div>}</div>
  </section>;
}


type WorkspaceUser = { id: string; username: string; displayName: string; role: string; accountStatus: string; localPasswordSet: boolean; membershipType: string };
export function AdminSecurity() {
  const [users,setUsers]=useState<WorkspaceUser[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [username,setUsername]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [password,setPassword]=useState('');
  const [resetTarget,setResetTarget]=useState<WorkspaceUser|null>(null);
  const [resetPassword,setResetPassword]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await apiJson('/api/admin/users');setUsers(data.users||[]);}catch(e){setError(e instanceof Error?e.message:'โหลดข้อมูลสมาชิกไม่สำเร็จ');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const create=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{await apiJson('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,displayName,password})});setUsername('');setDisplayName('');setPassword('');await load();}catch(e){setError(e instanceof Error?e.message:'สร้างสมาชิกไม่สำเร็จ');}finally{setSaving(false);}};
  const update=async(user:WorkspaceUser,accountStatus:string)=>{setSaving(true);try{await apiJson('/api/admin/users/'+user.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:user.displayName,accountStatus})});await load();}catch(e){setError(e instanceof Error?e.message:'แก้ไขสมาชิกไม่สำเร็จ');}finally{setSaving(false);}};
  const reset=async(e:React.FormEvent)=>{e.preventDefault();if(!resetTarget)return;setSaving(true);try{await apiJson('/api/admin/users/'+resetTarget.id+'/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:resetPassword})});setResetTarget(null);setResetPassword('');setError('ตั้งรหัสผ่านใหม่แล้ว สมาชิกต้องเข้าสู่ระบบอีกครั้ง');}catch(e){setError(e instanceof Error?e.message:'ตั้งรหัสผ่านไม่สำเร็จ');}finally{setSaving(false);}};
  const changeOwnPassword=async(e:React.FormEvent)=>{e.preventDefault();if(newPassword!==confirmPassword){setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');return;}setSaving(true);try{await apiJson('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirmPassword('');setError('เปลี่ยนรหัสผ่านของคุณแล้ว');}catch(e){setError(e instanceof Error?e.message:'เปลี่ยนรหัสผ่านไม่สำเร็จ');}finally{setSaving(false);}};
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">WORKSPACE SECURITY</span><h1>ผู้ดูแลและความปลอดภัย</h1><p>Owner เป็นผู้ควบคุมบัญชีสมาชิกและสิทธิ์เข้าใช้งานทั้งหมด</p></div></div>{error&&<div className="m101-alert" role="status">{error}<button onClick={()=>void load()}>รีเฟรช</button></div>}
    <div className="m101-dashboard-grid">
      <form className="m101-panel m101-member-form" onSubmit={create}><div className="m101-panel-heading"><div><h2>เพิ่มบัญชีสมาชิก</h2><p>ไม่มีปุ่มสมัครสมาชิกสาธารณะ · Owner เป็นผู้สร้างบัญชี</p></div></div><label>ID สมาชิก<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={e=>setUsername(e.target.value)} placeholder="เช่น staff01"/></label><label>ชื่อที่แสดง<input required maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="ชื่อสมาชิก"/></label><label>รหัสผ่านเริ่มต้น<input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="อย่างน้อย 12 ตัวอักษร"/></label><button className="m101-button m101-button-primary" disabled={saving}>{saving?'กำลังบันทึก…':'สร้างบัญชีสมาชิก'}</button></form>
      <form className="m101-panel m101-member-form" onSubmit={changeOwnPassword}><div className="m101-panel-heading"><div><h2>เปลี่ยนรหัสผ่าน Owner</h2><p>เปลี่ยนรหัสผ่านบัญชีที่กำลังเข้าสู่ระบบ</p></div></div><label>รหัสผ่านปัจจุบัน<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>รหัสผ่านใหม่<input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>ยืนยันรหัสผ่านใหม่<input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><button className="m101-button" disabled={saving}>เปลี่ยนรหัสผ่าน</button></form>
    </div>
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>บัญชีในพื้นที่ทำงาน</h2><p>{users.length} บัญชี · จัดการสถานะและตั้งรหัสผ่านใหม่</p></div><button className="m101-text-button" onClick={()=>void load()}>รีเฟรชข้อมูล</button></div>{loading?<div className="m101-empty-state">กำลังโหลดบัญชี…</div>:<div className="m101-user-list">{users.map(u=><div className="m101-user-row" key={u.id}><div className="m101-user-avatar">{(u.displayName||u.username||'?').slice(0,1).toUpperCase()}</div><div className="m101-user-meta"><b>{u.displayName||u.username}</b><small>{u.username} · {u.membershipType==='owner'?'Owner':'Member'}</small></div><span className={'m101-status-chip '+(u.accountStatus==='active'?'status-completed':'status-pending')}>{u.accountStatus==='active'?'ใช้งานอยู่':'ระงับบัญชี'}</span>{u.membershipType==='owner'?<span className="m101-owner-label">เจ้าของระบบ</span>:<><button className="m101-row-actions-button" onClick={()=>{setResetTarget(u);setResetPassword('');}}>ตั้งรหัสผ่าน</button><button className="m101-row-actions-button" disabled={saving} onClick={()=>void update(u,u.accountStatus==='active'?'suspended':'active')}>{u.accountStatus==='active'?'ระงับ':'เปิดใช้งาน'}</button></>}</div>)}</div>}</div>
    {resetTarget&&<div className="m101-modal-backdrop"><form className="m101-editor m101-reset-form" onSubmit={reset}><div className="m101-editor-head"><div><span className="m101-eyebrow">RESET MEMBER PASSWORD</span><h2>ตั้งรหัสผ่านให้ {resetTarget.displayName}</h2></div><button type="button" onClick={()=>setResetTarget(null)}>×</button></div><label>รหัสผ่านใหม่<input required type="password" minLength={12} value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><div className="m101-editor-actions"><button type="button" className="m101-button" onClick={()=>setResetTarget(null)}>ยกเลิก</button><button className="m101-button m101-button-primary" disabled={saving}>ยืนยันตั้งรหัสผ่าน</button></div></form></div>}
  </section>;
}


const importFields: { key: keyof Business; label: string; hints: string[] }[] = [
  { key: 'sequenceNo', label: 'ลำดับ', hints: ['ลำดับ','sequence','no','ที่'] },
  { key: 'companyName', label: 'ชื่อกิจการ', hints: ['ชื่อกิจการ','ชื่อนิติบุคคล','บริษัท','company','name'] },
  { key: 'type', label: 'ประเภทกิจการ', hints: ['ประเภท','type','รูปแบบ'] },
  { key: 'taxId', label: 'เลขทะเบียน / เลขผู้เสียภาษี', hints: ['เลขทะเบียน','เลขประจำตัวผู้เสียภาษี','tax','registration','เลขผู้เสียภาษี'] },
  { key: 'eFilingCode', label: 'รหัส e-Filing', hints: ['efiling','e-filing','รหัสยื่น','รหัสกรม'] },
  { key: 'ssoCode', label: 'รหัสประกันสังคม', hints: ['ประกันสังคม','sso'] },
  { key: 'auditorDate', label: 'วันที่ผู้สอบบัญชี', hints: ['ผู้สอบบัญชี','วันที่','auditor','audit'] },
  { key: 'status', label: 'สถานะ', hints: ['สถานะ','status'] },
  { key: 'remark', label: 'หมายเหตุ', hints: ['หมายเหตุ','remark','note'] },
];
function parseCsvRows(source: string): string[][] {
  const rows: string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'&&quoted&&source[i+1]==='"'){cell+='"';i++;}else if(ch==='"'){quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=ch;}
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}

function splitExcelTables(matrix: string[][]): string[][][] {
  const blocks: string[][][] = []; let current: string[][] = [];
  for (const row of matrix) {
    if (row.every(value => !String(value ?? '').trim())) { if (current.length) { blocks.push(current); current = []; } }
    else current.push(row.map(value => String(value ?? '').trim()));
  }
  if (current.length) blocks.push(current);
  return blocks.filter(block => block.length >= 2 && block[0].some(Boolean));
}

export function ImportExport({ year = '69' }: { year?: string }) {
  const [records,setRecords]=useState<Business[]>([]);
  const [revision,setRevision]=useState(1);
  const [headers,setHeaders]=useState<string[]>([]);
  const [rows,setRows]=useState<string[][]>([]);
  const [mapping,setMapping]=useState<Record<string,string>>({});
  const [fileName,setFileName]=useState('');
  const [sheetNames,setSheetNames]=useState<string[]>([]);
  const [sheetData,setSheetData]=useState<Record<string,string[][]>>({});
  const [selectedSheet,setSelectedSheet]=useState('');
  const [tableBlocks,setTableBlocks]=useState<string[][][]>([]);
  const [selectedTable,setSelectedTable]=useState(0);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const load=useCallback(async()=>{setLoading(true);try{const data=await apiJson('/api/directory?year='+encodeURIComponent(year));setRecords(data.records||[]);setRevision(Number(data.revision)||1);}catch(e){setError(e instanceof Error?e.message:'โหลดทะเบียนไม่สำเร็จ');}finally{setLoading(false);}},[year]);
  useEffect(()=>{void load();},[load]);
  const applyTable=(table:string[][])=>{
    if(table.length<2){setError('ตารางที่เลือกไม่มีแถวข้อมูลเพียงพอ');setHeaders([]);setRows([]);return;}
    const cols=table[0].map(v=>String(v||'').trim());
    const auto:Record<string,string>={};
    for(const field of importFields){const found=cols.find(h=>field.hints.some(hint=>h.toLocaleLowerCase('th-TH')===hint.toLocaleLowerCase('th-TH')||h.toLocaleLowerCase('th-TH').includes(hint.toLocaleLowerCase('th-TH'))));if(found)auto[field.key]=found;}
    setHeaders(cols);setRows(table.slice(1));setMapping(auto);
  };
  const readFile=async(file:File)=>{
    setError('');setMessage('');setFileName(file.name);setHeaders([]);setRows([]);setMapping({});setSheetNames([]);setSheetData({});setSelectedSheet('');setTableBlocks([]);setSelectedTable(0);
    const extension=file.name.toLowerCase().split('.').pop();
    if(extension==='csv'){
      const parsed=parseCsvRows((await file.text()).replace(/^\\uFEFF/,''));
      if(parsed.length<2){setError('ไฟล์นี้ไม่มีแถวข้อมูลเพียงพอ');return;}
      setTableBlocks([parsed]);applyTable(parsed);return;
    }
    if(!['xlsx','xls','xlsm'].includes(extension||'')){setError('รองรับไฟล์ .xlsx, .xls, .xlsm และ .csv');return;}
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const parsedSheets:Record<string,string[][]>={};
      for(const name of workbook.SheetNames){const matrix=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name],{header:1,defval:'',raw:false}).map(row=>row.map(value=>String(value??'').trim()));parsedSheets[name]=matrix;}
      if(!workbook.SheetNames.length){setError('ไม่พบ Worksheet ในไฟล์นี้');return;}
      setSheetData(parsedSheets);setSheetNames(workbook.SheetNames);setSelectedSheet(workbook.SheetNames[0]);
      const blocks=splitExcelTables(parsedSheets[workbook.SheetNames[0]]);
      if(!blocks.length){setError('ไม่พบตารางข้อมูลในชีตนี้');return;}
      setTableBlocks(blocks);setSelectedTable(0);applyTable(blocks[0]);
    }catch(e){setError(e instanceof Error?'อ่านไฟล์ Excel ไม่สำเร็จ: '+e.message:'อ่านไฟล์ Excel ไม่สำเร็จ');}
  };
  const chooseSheet=(name:string)=>{setSelectedSheet(name);const blocks=splitExcelTables(sheetData[name]||[]);setTableBlocks(blocks);setSelectedTable(0);if(blocks.length)applyTable(blocks[0]);else{setHeaders([]);setRows([]);setError('ไม่พบตารางข้อมูลในชีตนี้');}};
  const chooseTable=(index:number)=>{setSelectedTable(index);applyTable(tableBlocks[index]||[]);};
  const mapped=rows.map(row=>{const value=(key:keyof Business)=>{const header=mapping[String(key)];const index=headers.indexOf(header);return index>=0?String(row[index]||'').trim():'';};const rawType=value('type').toLocaleLowerCase('th-TH');const rawStatus=value('status').toLocaleLowerCase('th-TH');return {sequenceNo:value('sequenceNo'),companyName:value('companyName'),taxId:value('taxId'),type:rawType.includes('ห้าง')||rawType.includes('partnership')?'partnership':rawType.includes('บุคคล')?'individual':'company',eFilingCode:value('eFilingCode'),ssoCode:value('ssoCode'),auditorDate:value('auditorDate'),status:rawStatus.includes('เสร็จ')||rawStatus.includes('complete')?'completed':rawStatus.includes('กำลัง')||rawStatus.includes('progress')?'in_progress':'pending',remark:value('remark')};}).filter(r=>r.companyName);
  const seenImportKeys=new Set(records.map(item=>item.taxId?.trim()? 'tax:'+item.taxId.trim() : 'name:'+(item.companyName||'').trim().toLocaleLowerCase('th-TH')));
  let duplicates=0;
  const uniqueMapped=mapped.filter(item=>{const key=item.taxId?.trim()?'tax:'+item.taxId.trim():'name:'+(item.companyName||'').trim().toLocaleLowerCase('th-TH');if(seenImportKeys.has(key)){duplicates++;return false;}seenImportKeys.add(key);return true;});
  const confirmImport=async()=>{
    const additions=uniqueMapped.map((item,index)=>({...item,id:makeId(),sequenceNo:item.sequenceNo||String(records.length+index+1),isVerifiedDbd:false}));
    setSaving(true);setError('');setMessage('');
    try{const data=await apiJson('/api/directory',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:year,records:[...records,...additions],revision})});setRecords(prev=>[...prev,...additions]);setRevision(Number(data.revision)||revision+1);setMessage(`นำเข้าแล้ว ${additions.length} รายการ · ข้ามรายการซ้ำ ${duplicates} รายการ`);setHeaders([]);setRows([]);setMapping({});setFileName('');}
    catch(e){setError(e instanceof Error?e.message:'นำเข้าข้อมูลไม่สำเร็จ');if(e instanceof Error&&e.message.includes('เปลี่ยนแปลง'))void load();}
    finally{setSaving(false);}
  };
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">DATA EXCHANGE</span><h1>นำเข้า / ส่งออกข้อมูล</h1><p>ตรวจสอบและจับคู่คอลัมน์ก่อนนำเข้าทะเบียนกิจการ · ปี {year}</p></div></div>{error&&<div className="m101-alert" role="alert">{error}<button onClick={()=>void load()}>โหลดข้อมูลใหม่</button></div>}{message&&<div className="m101-import-success" role="status">{message}</div>}
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>นำเข้าจาก Excel / CSV</h2><p>เลือกไฟล์ เลือกชีตและตาราง จับคู่คอลัมน์ แล้วตรวจสอบก่อนบันทึกลง D1</p></div></div><label className="m101-file-picker">เลือกไฟล์ Excel / CSV<input type="file" accept=".xlsx,.xls,.xlsm,.csv,text/csv" onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);e.currentTarget.value='';}}/></label>{fileName&&<p className="m101-import-file">ไฟล์ที่เลือก: <b>{fileName}</b> · {rows.length} แถวข้อมูล</p>}{sheetNames.length>0&&<div className="m101-workbook-selectors"><label>Worksheet<select value={selectedSheet} onChange={e=>chooseSheet(e.target.value)}>{sheetNames.map(name=><option key={name} value={name}>{name}</option>)}</select></label>{tableBlocks.length>1&&<label>ตารางที่พบ<select value={selectedTable} onChange={e=>chooseTable(Number(e.target.value))}>{tableBlocks.map((block,index)=><option key={index} value={index}>ตาราง {index+1} · {block.length-1} แถว</option>)}</select></label>}</div>}</div>
    {headers.length>0&&<><div className="m101-panel"><div className="m101-panel-heading"><div><h2>จับคู่คอลัมน์</h2><p>ตรวจสอบให้แต่ละฟิลด์ตรงกับคอลัมน์ในไฟล์ก่อนนำเข้า</p></div></div><div className="m101-mapping-grid">{importFields.map(field=><label key={String(field.key)}>{field.label}<select value={mapping[String(field.key)]||''} onChange={e=>setMapping(prev=>({...prev,[String(field.key)]:e.target.value}))}><option value="">ไม่ใช้คอลัมน์นี้</option>{headers.map(h=><option key={h} value={h}>{h}</option>)}</select></label>)}</div></div>
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>ตัวอย่างก่อนนำเข้า</h2><p>แสดงตัวอย่าง 5 รายการแรก · ตรวจพบรายการซ้ำ {duplicates} รายการ</p></div><span className="m101-status-chip status-completed">{uniqueMapped.length} พร้อมนำเข้า</span></div><div className="m101-table-wrap"><table className="m101-data-table"><thead><tr><th>ชื่อกิจการ</th><th>เลขทะเบียน</th><th>ประเภท</th><th>e-Filing</th><th>สถานะ</th></tr></thead><tbody>{mapped.slice(0,5).map((r,i)=><tr key={i}><td>{r.companyName}</td><td>{r.taxId||'—'}</td><td>{typeText[r.type]||'บริษัทจำกัด'}</td><td>{r.eFilingCode||'—'}</td><td>{statusText[r.status]||'รอดำเนินการ'}</td></tr>)}</tbody></table></div><div className="m101-editor-actions"><button className="m101-button" onClick={()=>{setHeaders([]);setRows([]);setMapping({});setFileName('');setSheetNames([]);setSheetData({});setSelectedSheet('');setTableBlocks([]);}}>ยกเลิก</button><button className="m101-button m101-button-primary" disabled={saving||loading||!uniqueMapped.length} onClick={()=>void confirmImport()}>{saving?'กำลังบันทึก…':`ยืนยันนำเข้า ${uniqueMapped.length} รายการ`}</button></div></div></>}
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>ส่งออกข้อมูล</h2><p>ดาวน์โหลดทะเบียนกิจการของรอบปีนี้เป็น CSV</p></div></div><button className="m101-button" onClick={()=>{const cols=['sequenceNo','companyName','type','taxId','eFilingCode','ssoCode','auditorDate','status','remark'];const csv=[cols.join(','),...records.map(r=>cols.map(k=>{const v=String((r as any)[k]??'');return '"'+v.replace(/"/g,'""')+'"';}).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`M101-${year}-export.csv`;a.click();URL.revokeObjectURL(url);}}>↓ ดาวน์โหลด CSV</button>{loading&&<span className="m101-import-file">กำลังอ่านทะเบียน…</span>}</div>
  </section>;
}
