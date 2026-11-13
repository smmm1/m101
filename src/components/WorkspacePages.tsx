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
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
  const today = localDateKey();
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
export function BusinessRegistry({ year: initialYear = '69', globalSearch = '', onYearChange, onOpenImport, canManage = true }: { year?: string; globalSearch?: string; onYearChange?: (year: string) => void; onOpenImport?: () => void; canManage?: boolean }) {
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
  const [pendingLegacyImport,setPendingLegacyImport] = useState<{fileName:string;incoming:Business[]}|null>(null);
  const [legacyMode,setLegacyMode] = useState<'update_existing'|'skip_duplicates'|'import_all'>('update_existing');
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
  const save=async(next:Business[]):Promise<boolean>=>{
    setSaving(true);setError('');
    try{
      const data=await apiJson('/api/directory',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:year,records:next,revision})});
      setRecords(next);setRevision(Number(data.revision)||revision+1);
      setEditor(null);setShowPassword(false);return true;
    }catch(e){setError(e instanceof Error?e.message:'บันทึกทะเบียนไม่สำเร็จ');if(e instanceof Error&&e.message.includes('เปลี่ยนแปลง'))void load(year);return false;}
    finally{setSaving(false);}
  };
  const readLegacyImport=async(file:File)=>{
    setError('');
    try{
      const extension=file.name.toLowerCase().split('.').pop();
      let matrix:string[][]=[];
      if(extension==='csv')matrix=parseCsvRows((await file.text()).replace(/^\uFEFF/,''));
      else if(['xlsx','xls','xlsm'].includes(extension||'')){
        const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
        const sheetName=workbook.SheetNames[0];
        if(!sheetName)throw new Error('ไม่พบ Sheet ในไฟล์');
        matrix=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName],{header:1,defval:'',raw:false}).map(row=>row.map(value=>value instanceof Date?localDateKey(value):String(value??'').trim()));
      }else throw new Error('รองรับไฟล์ Excel และ CSV เท่านั้น');
      let headerIndex=-1,bestScore=0;
      for(let rowIndex=0;rowIndex<Math.min(30,matrix.length);rowIndex++){
        const score=importFields.filter(field=>matrix[rowIndex].some(header=>field.hints.some(hint=>String(header).toLocaleLowerCase('th-TH').includes(hint.toLocaleLowerCase('th-TH'))))).length;
        if(score>bestScore){bestScore=score;headerIndex=rowIndex;}
      }
      if(headerIndex<0)throw new Error('ไม่พบแถวหัวตารางที่ระบบรู้จักในไฟล์นี้');
      const headers=matrix[headerIndex].map(value=>String(value||'').trim());
      const mapping:Record<string,number>={};
      for(const field of importFields){const index=headers.findIndex(header=>field.hints.some(hint=>header.toLocaleLowerCase('th-TH')===hint.toLocaleLowerCase('th-TH')||header.toLocaleLowerCase('th-TH').includes(hint.toLocaleLowerCase('th-TH'))));if(index>=0)mapping[String(field.key)]=index;}
      if(mapping.companyName===undefined)throw new Error('ไม่พบคอลัมน์ชื่อกิจการ กรุณาใช้ปุ่มจับคู่ไฟล์สำหรับกำหนดคอลัมน์เอง');
      const incoming=matrix.slice(headerIndex+1).map((row,index)=>{
        const value=(key:keyof Business)=>{const column=mapping[String(key)];return column===undefined?'':String(row[column]??'').trim();};
        const rawType=value('type').toLocaleLowerCase('th-TH');
        const rawStatus=value('status').toLocaleLowerCase('th-TH');
        const companyName=value('companyName');
        if(!companyName)return null;
        const mappedType=rawType?(rawType.includes('ห้าง')||rawType.includes('partnership')?'partnership':rawType.includes('บุคคล')?'individual':'company'):undefined;
        const mappedStatus=rawStatus?(rawStatus.includes('เสร็จ')||rawStatus.includes('complete')?'completed':rawStatus.includes('กำลัง')||rawStatus.includes('progress')?'in_progress':'pending'):undefined;
        return {id:makeId(),sequenceNo:value('sequenceNo')||String(records.length+index+1),companyName,taxId:normalizeThaiTaxId(value('taxId')),type:mappedType,auditorDate:value('auditorDate'),password:value('password'),remark:value('remark'),eFilingCode:value('eFilingCode'),ssoCode:value('ssoCode'),status:mappedStatus,sourceType:'legacy-import',sourceFileName:file.name} as Business;
      }).filter((item):item is Business=>Boolean(item));
      if(!incoming.length)throw new Error('ไม่พบแถวข้อมูลกิจการในไฟล์');
      setPendingLegacyImport({fileName:file.name,incoming});
      setLegacyMode('update_existing');
    }catch(e){setError(e instanceof Error?e.message:'อ่านไฟล์นำเข้าไม่สำเร็จ');}
  };
  const legacyDuplicateIndex=(incoming:Business,target:Business[])=>target.findIndex(existing=>(normalizeThaiTaxId(incoming.taxId||'')&&normalizeThaiTaxId(existing.taxId||'')===normalizeThaiTaxId(incoming.taxId||''))||((incoming.companyName||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH')===(existing.companyName||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH')));
  const confirmLegacyImport=async()=>{
    if(!pendingLegacyImport)return;
    const next=[...records];let added=0,updated=0,skipped=0;
    for(const incoming of pendingLegacyImport.incoming){
      const existingIndex=legacyDuplicateIndex(incoming,next);
      if(existingIndex>=0&&legacyMode==='skip_duplicates'){skipped++;continue;}
      if(existingIndex>=0&&legacyMode==='update_existing'){
        const patch=Object.fromEntries(Object.entries(incoming).filter(([key,value])=>key!=='id'&&key!=='createdAt'&&key!=='updatedAt'&&value!==''&&value!==undefined));
        next[existingIndex]={...next[existingIndex],...patch,id:next[existingIndex].id};updated++;continue;
      }
      next.push({...incoming,id:makeId(),type:incoming.type||'company',status:incoming.status||'pending',sequenceNo:incoming.sequenceNo||String(next.length+1)});added++;
    }
    const success=await save(next);
    if(success){setPendingLegacyImport(null);setError('นำเข้าเดิมสำเร็จ · เพิ่ม '+added+' · อัปเดต '+updated+' · ข้าม '+skipped+' รายการ');}
  };
  const exportCsv=()=>{
    const cols=['sequenceNo','companyName','type','taxId','eFilingCode','ssoCode','auditorDate','status','isVerifiedDbd','remark'];
    const csv=[cols.join(','),...filtered.map(r=>cols.map(k=>csvCell((r as any)[k])).join(','))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`M101-businesses-${year}.csv`;a.click();URL.revokeObjectURL(url);
  };
  const startNewYear=async()=>{
    const value=newYear.trim();if(!/^\d{2,4}$/.test(value)){setError('กรุณากรอกรอบปีบัญชีเป็นตัวเลข 2–4 หลัก');return;}
    if(years.includes(value)){setYear(value);onYearChange?.(value);setNewYear('');return;}
    const data=await apiJson('/api/directory',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fiscalYear:value,records:[],revision})});
    setRevision(Number(data.revision)||revision+1);setYears(prev=>[...prev,value].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})));setYear(value);setNewYear('');
  };
  return <section className="m101-page m101-registry-page">
    <div className="m101-page-heading"><div><span className="m101-eyebrow">BUSINESS PORTFOLIO</span><h1>ทะเบียนกิจการ</h1><p>จัดเก็บและจัดการข้อมูลนิติบุคคลในพื้นที่ทำงาน</p></div><div className="m101-heading-actions"><button className="m101-button" onClick={exportCsv}>↓ ส่งออก CSV</button>{canManage&&<><label className="m101-button m101-legacy-import">↑ นำเข้าเดิม<input type="file" accept=".xlsx,.xls,.xlsm,.csv,text/csv" onChange={e=>{const file=e.target.files?.[0];if(file)void readLegacyImport(file);e.currentTarget.value='';}}/></label><button className="m101-button" onClick={onOpenImport}>⇅ จับคู่ไฟล์</button><button className="m101-button m101-button-primary" onClick={()=>setEditor(blankBusiness())}>＋ เพิ่มกิจการ</button></>}</div></div>
    <div className="m101-registry-toolbar"><div className="m101-registry-count"><strong>{filtered.length.toLocaleString('th-TH')}</strong><span>จาก {records.length.toLocaleString('th-TH')} กิจการ</span></div><label className="m101-year-select">รอบปี <select value={year} onChange={e=>{setYear(e.target.value);onYearChange?.(e.target.value);}}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label>{canManage&&<div className="m101-add-year"><input aria-label="รอบปีใหม่" value={newYear} onChange={e=>setNewYear(e.target.value)} placeholder="ปีใหม่"/><button onClick={()=>void startNewYear()}>เพิ่มปี</button></div>}<input className="m101-registry-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="ค้นหาชื่อ เลขทะเบียน หรือรหัส..."/></div>
    {error&&<div className="m101-alert" role="alert">{error}<button onClick={()=>void load(year)}>โหลดข้อมูลล่าสุด</button></div>}
    <div className="m101-table-wrap"><table className="m101-data-table"><thead><tr><th>ลำดับ</th><th>ชื่อกิจการ</th><th>ประเภท</th><th>เลขทะเบียน / ผู้เสียภาษี</th><th>e-Filing</th><th>ประกันสังคม</th><th>วันที่ผู้สอบบัญชี</th><th>สถานะ</th><th>ตรวจ DBD</th><th>หมายเหตุ</th>{canManage&&<th>จัดการ</th>}</tr></thead><tbody>
      {loading?<tr><td colSpan={canManage?11:10} className="m101-table-state">กำลังโหลดข้อมูลจาก D1…</td></tr>:filtered.length===0?<tr><td colSpan={11} className="m101-table-state">{records.length?'ไม่พบข้อมูลที่ตรงกับคำค้นหา':'ยังไม่มีข้อมูลกิจการในรอบปีนี้'}</td></tr>:filtered.map((r,i)=><tr key={r.id}><td className="m101-sequence">{r.sequenceNo||String(i+1).padStart(3,'0')}</td><td><b className="m101-business-name">{r.companyName||'ไม่ระบุชื่อกิจการ'}</b><small className="m101-business-sub">{r.topic||r.sourceFileName||'—'}</small></td><td>{typeText[r.type||'']||'ไม่ระบุ'}</td><td className="m101-mono">{r.taxId||'—'}</td><td className="m101-mono">{r.eFilingCode||'—'}</td><td className="m101-mono">{r.ssoCode||'—'}</td><td>{r.auditorDate||'—'}</td><td><span className={'m101-status-chip status-'+(r.status||'pending')}>{statusText[r.status||'pending']||'รอดำเนินการ'}</span></td><td>{r.isVerifiedDbd?'ยืนยันแล้ว':'รอตรวจสอบ'}</td><td className="m101-remark">{r.remark||'—'}</td>{canManage&&<td><div className="m101-row-actions"><button onClick={()=>{setEditor({...r});setShowPassword(false);}}>แก้ไข</button><button className="danger" onClick={()=>{if(window.confirm('ยืนยันลบ '+(r.companyName||'กิจการนี้')+'?'))void save(records.filter(x=>x.id!==r.id));}}>ลบ</button></div></td>}</tr>)}
    </tbody></table></div>
    <p className="m101-table-footnote">ข้อมูลจัดเก็บใน Cloudflare D1 · {canManage?'การบันทึกใช้เลขรุ่นป้องกันข้อมูลชนกัน':'แสดงเฉพาะกิจการที่ Owner มอบหมายให้'}</p>
    {pendingLegacyImport&&<div className="m101-modal-backdrop"><section className="m101-editor m101-legacy-import-modal"><div className="m101-editor-head"><div><span className="m101-eyebrow">LEGACY FILE IMPORT</span><h2>นำเข้าไฟล์แบบเดิม</h2><p>{pendingLegacyImport.fileName} · {pendingLegacyImport.incoming.length} รายการ</p></div><button type="button" onClick={()=>setPendingLegacyImport(null)}>×</button></div><div className="m101-legacy-import-stats"><span>รายการใหม่ <b>{pendingLegacyImport.incoming.filter(item=>legacyDuplicateIndex(item,records)<0).length}</b></span><span>รายการซ้ำ <b>{pendingLegacyImport.incoming.filter(item=>legacyDuplicateIndex(item,records)>=0).length}</b></span></div><p className="m101-legacy-import-help">เลือกรูปแบบจัดการข้อมูลซ้ำ ระบบจะบันทึกเมื่อกดยืนยันเท่านั้น</p><label className="m101-legacy-mode"><input type="radio" checked={legacyMode==='update_existing'} onChange={()=>setLegacyMode('update_existing')}/> อัปเดตข้อมูลเดิมและเพิ่มรายการใหม่</label><label className="m101-legacy-mode"><input type="radio" checked={legacyMode==='skip_duplicates'} onChange={()=>setLegacyMode('skip_duplicates')}/> ข้ามรายการซ้ำ นำเข้าเฉพาะรายการใหม่</label><label className="m101-legacy-mode"><input type="radio" checked={legacyMode==='import_all'} onChange={()=>setLegacyMode('import_all')}/> นำเข้าทั้งหมดเป็นรายการใหม่</label><div className="m101-editor-actions"><button type="button" className="m101-button" onClick={()=>setPendingLegacyImport(null)}>ยกเลิก</button><button type="button" className="m101-button m101-button-primary" disabled={saving} onClick={()=>void confirmLegacyImport()}>{saving?'กำลังบันทึก…':'ยืนยันนำเข้า'}</button></div></section></div>}
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

export function AnnualWork({ year = '69', canManage = true }: { year?: string; canManage?: boolean }) {
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
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>รายการงานทั้งหมด</h2><p>{tasks.length.toLocaleString('th-TH')} รายการในรอบปีนี้</p></div></div>{loading?<div className="m101-empty-state">กำลังโหลด…</div>:tasks.length?<div className="m101-work-list">{tasks.map(t=><div className="m101-work-row" key={t.id}><div><b>{t.taskName}</b><small>{t.businessName} · {t.taskCode} {t.dueDate?'· กำหนด '+new Date(t.dueDate+'T00:00:00').toLocaleDateString('th-TH'):''}</small>{t.note&&<p>{t.note}</p>}</div><select aria-label={'สถานะ '+t.taskName} value={t.status} onChange={e=>void update(t,e.target.value)}><option value="pending">รอดำเนินการ</option><option value="in_progress">กำลังดำเนินการ</option><option value="completed">เสร็จแล้ว</option></select>{canManage&&<button className="m101-row-delete" onClick={()=>void remove(t)}>ลบ</button>}</div>)}</div>:<div className="m101-empty-state"><b>ยังไม่มีรายการงานประจำปี</b><span>เพิ่มงานจากแบบฟอร์มด้านบนเพื่อเริ่มติดตาม</span></div>}</div>
  </section>;
}


type WorkspaceUser = { id: string; username: string; displayName: string; role: string; accountStatus: string; localPasswordSet: boolean; membershipType: string };
export function AdminSecurity() {
  const [users,setUsers]=useState<WorkspaceUser[]>([]);
  const [assignmentBusinesses,setAssignmentBusinesses]=useState<{id:string;companyName:string;taxId:string}[]>([]);
  const [assignments,setAssignments]=useState<{userId:string;businessId:string}[]>([]);
  const [selectedMember,setSelectedMember]=useState('');
  const [selectedBusinessIds,setSelectedBusinessIds]=useState<string[]>([]);
  const [businessSearch,setBusinessSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const [username,setUsername]=useState('');
  const [existingUsername,setExistingUsername]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [password,setPassword]=useState('');
  const [resetTarget,setResetTarget]=useState<WorkspaceUser|null>(null);
  const [resetPassword,setResetPassword]=useState('');
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const [data,assignmentData]=await Promise.all([apiJson('/api/admin/users'),apiJson('/api/admin/assignments')]);setUsers(data.users||[]);setAssignmentBusinesses(assignmentData.businesses||[]);setAssignments(assignmentData.assignments||[]);setSelectedMember(current=>current||((data.users||[]).find((u:WorkspaceUser)=>u.membershipType==='collaborator'&&u.accountStatus==='active')?.id||''));}catch(e){setError(e instanceof Error?e.message:'โหลดข้อมูลสมาชิกไม่สำเร็จ');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{setSelectedBusinessIds(assignments.filter(a=>a.userId===selectedMember).map(a=>a.businessId));},[assignments,selectedMember]);
  const create=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{await apiJson('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,displayName,password})});setUsername('');setDisplayName('');setPassword('');await load();}catch(e){setError(e instanceof Error?e.message:'สร้างสมาชิกไม่สำเร็จ');}finally{setSaving(false);}};
  const addExistingMember=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{await apiJson('/api/admin/workspace-members',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:existingUsername})});setExistingUsername('');await load();setError('เพิ่มบัญชีเดิมเข้า Workspace นี้แล้ว สมาชิกใช้ ID และรหัสผ่านเดิมเข้าสู่ระบบได้');}catch(e){setError(e instanceof Error?e.message:'เพิ่มสมาชิกเข้า Workspace ไม่สำเร็จ');}finally{setSaving(false);}};
  const update=async(user:WorkspaceUser,accountStatus:string)=>{setSaving(true);try{await apiJson('/api/admin/users/'+user.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({displayName:user.displayName,accountStatus})});await load();}catch(e){setError(e instanceof Error?e.message:'แก้ไขสมาชิกไม่สำเร็จ');}finally{setSaving(false);}};
  const removeFromWorkspace=async(user:WorkspaceUser)=>{if(!window.confirm(`นำ ${user.displayName||user.username} ออกจาก Workspace นี้? บัญชีและสิทธิ์ใน Workspace อื่นจะไม่ถูกลบ`))return;setSaving(true);setError('');try{await apiJson('/api/admin/workspace-members/'+user.id,{method:'DELETE'});if(selectedMember===user.id)setSelectedMember('');await load();setError('นำสมาชิกออกจาก Workspace นี้แล้ว บัญชีเดิมยังคงอยู่');}catch(e){setError(e instanceof Error?e.message:'นำสมาชิกออกไม่สำเร็จ');}finally{setSaving(false);}};
  const reset=async(e:React.FormEvent)=>{e.preventDefault();if(!resetTarget)return;setSaving(true);try{await apiJson('/api/admin/users/'+resetTarget.id+'/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:resetPassword})});setResetTarget(null);setResetPassword('');setError('ตั้งรหัสผ่านใหม่แล้ว สมาชิกต้องเข้าสู่ระบบอีกครั้ง');}catch(e){setError(e instanceof Error?e.message:'ตั้งรหัสผ่านไม่สำเร็จ');}finally{setSaving(false);}};
  const saveAssignments=async()=>{if(!selectedMember)return;setSaving(true);setError('');try{await apiJson('/api/admin/users/'+selectedMember+'/assignments',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessIds:selectedBusinessIds})});await load();setError('บันทึกการมอบหมายกิจการแล้ว');}catch(e){setError(e instanceof Error?e.message:'บันทึกการมอบหมายไม่สำเร็จ');}finally{setSaving(false);}};
  const visibleAssignmentBusinesses=assignmentBusinesses.filter(b=>(b.companyName+' '+b.taxId).toLocaleLowerCase('th-TH').includes(businessSearch.trim().toLocaleLowerCase('th-TH')));
  const changeOwnPassword=async(e:React.FormEvent)=>{e.preventDefault();if(newPassword!==confirmPassword){setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');return;}setSaving(true);try{await apiJson('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});setCurrentPassword('');setNewPassword('');setConfirmPassword('');setError('เปลี่ยนรหัสผ่านของคุณแล้ว');}catch(e){setError(e instanceof Error?e.message:'เปลี่ยนรหัสผ่านไม่สำเร็จ');}finally{setSaving(false);}};
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">WORKSPACE SECURITY</span><h1>ผู้ดูแลและความปลอดภัย</h1><p>Owner เป็นผู้ควบคุมบัญชีสมาชิกและสิทธิ์เข้าใช้งานทั้งหมด</p></div></div>{error&&<div className="m101-alert" role="status">{error}<button onClick={()=>void load()}>รีเฟรช</button></div>}
    <div className="m101-dashboard-grid">
      <form className="m101-panel m101-member-form" onSubmit={create}><div className="m101-panel-heading"><div><h2>เพิ่มบัญชีสมาชิก</h2><p>ไม่มีปุ่มสมัครสมาชิกสาธารณะ · Owner เป็นผู้สร้างบัญชี</p></div></div><label>ID สมาชิก<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={e=>setUsername(e.target.value)} placeholder="เช่น staff01"/></label><label>ชื่อที่แสดง<input required maxLength={80} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="ชื่อสมาชิก"/></label><label>รหัสผ่านเริ่มต้น<input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)} placeholder="อย่างน้อย 12 ตัวอักษร"/></label><button className="m101-button m101-button-primary" disabled={saving}>{saving?'กำลังบันทึก…':'สร้างบัญชีสมาชิก'}</button></form>
      <form className="m101-panel m101-member-form" onSubmit={addExistingMember}><div className="m101-panel-heading"><div><h2>เพิ่มบัญชีเดิมเข้า Workspace</h2><p>ใช้กับสมาชิกที่มีบัญชี M101 อยู่แล้ว · ไม่สร้างบัญชีซ้ำ</p></div></div><label>ID สมาชิกที่มีอยู่<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={existingUsername} onChange={e=>setExistingUsername(e.target.value)} placeholder="ระบุ ID สมาชิกเดิม"/></label><p className="m101-form-hint">สมาชิกจะใช้รหัสผ่านเดิม และเห็นเฉพาะกิจการที่ Owner ของ Workspace นี้มอบหมายให้</p><button className="m101-button m101-button-primary" disabled={saving}>{saving?'กำลังเพิ่ม…':'เพิ่มสมาชิกเข้า Workspace'}</button></form>
      <form className="m101-panel m101-member-form" onSubmit={changeOwnPassword}><div className="m101-panel-heading"><div><h2>เปลี่ยนรหัสผ่าน Owner</h2><p>เปลี่ยนรหัสผ่านบัญชีที่กำลังเข้าสู่ระบบ</p></div></div><label>รหัสผ่านปัจจุบัน<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label>รหัสผ่านใหม่<input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label><label>ยืนยันรหัสผ่านใหม่<input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label><button className="m101-button" disabled={saving}>เปลี่ยนรหัสผ่าน</button></form>
    </div>
    <div className="m101-panel"><div className="m101-panel-heading"><div><h2>บัญชีในพื้นที่ทำงาน</h2><p>{users.length} บัญชี · จัดการสถานะและตั้งรหัสผ่านใหม่</p></div><button className="m101-text-button" onClick={()=>void load()}>รีเฟรชข้อมูล</button></div>{loading?<div className="m101-empty-state">กำลังโหลดบัญชี…</div>:<div className="m101-user-list">{users.map(u=><div className="m101-user-row" key={u.id}><div className="m101-user-avatar">{(u.displayName||u.username||'?').slice(0,1).toUpperCase()}</div><div className="m101-user-meta"><b>{u.displayName||u.username}</b><small>{u.username} · {u.membershipType==='owner'?'Owner':'Member'}</small></div><span className={'m101-status-chip '+(u.accountStatus==='active'?'status-completed':'status-pending')}>{u.accountStatus==='active'?'ใช้งานอยู่':'ระงับบัญชี'}</span>{u.membershipType==='owner'?<span className="m101-owner-label">เจ้าของระบบ</span>:<><button className="m101-row-actions-button" onClick={()=>{setResetTarget(u);setResetPassword('');}}>ตั้งรหัสผ่าน</button><button className="m101-row-actions-button" disabled={saving} onClick={()=>void update(u,u.accountStatus==='active'?'suspended':'active')}>{u.accountStatus==='active'?'ระงับ':'เปิดใช้งาน'}</button><button className="m101-row-actions-button" disabled={saving} onClick={()=>void removeFromWorkspace(u)}>นำออกจาก Workspace</button></>}</div>)}</div>}</div>
    <div className="m101-panel m101-assignment-panel"><div className="m101-panel-heading"><div><h2>มอบหมายกิจการให้สมาชิก</h2><p>สมาชิกจะเห็นเฉพาะกิจการที่ Owner มอบหมายให้เท่านั้น</p></div></div><div className="m101-assignment-toolbar"><label>สมาชิก<select value={selectedMember} onChange={e=>setSelectedMember(e.target.value)}><option value="">เลือกสมาชิก</option>{users.filter(u=>u.membershipType==='collaborator'&&u.accountStatus==='active').map(u=><option key={u.id} value={u.id}>{u.displayName||u.username} · {u.username}</option>)}</select></label><label>ค้นหากิจการ<input value={businessSearch} onChange={e=>setBusinessSearch(e.target.value)} placeholder="ชื่อกิจการหรือเลขทะเบียน"/></label></div><div className="m101-assignment-summary">เลือกแล้ว {selectedBusinessIds.length} จาก {assignmentBusinesses.length} กิจการ</div><div className="m101-assignment-list">{visibleAssignmentBusinesses.map(b=><label key={b.id} className="m101-assignment-item"><input type="checkbox" checked={selectedBusinessIds.includes(b.id)} disabled={!selectedMember} onChange={e=>setSelectedBusinessIds(prev=>e.target.checked?[...prev,b.id]:prev.filter(id=>id!==b.id))}/><span><b>{b.companyName||'ไม่ระบุชื่อกิจการ'}</b><small>{b.taxId||'ไม่มีเลขทะเบียน'}</small></span></label>)}{!visibleAssignmentBusinesses.length&&<p className="m101-empty-state">ไม่พบกิจการที่ค้นหา</p>}</div><div className="m101-editor-actions"><button className="m101-button m101-button-primary" disabled={saving||!selectedMember} onClick={()=>void saveAssignments()}>{saving?'กำลังบันทึก…':'บันทึกการมอบหมาย'}</button></div></div>
    {resetTarget&&<div className="m101-modal-backdrop"><form className="m101-editor m101-reset-form" onSubmit={reset}><div className="m101-editor-head"><div><span className="m101-eyebrow">RESET MEMBER PASSWORD</span><h2>ตั้งรหัสผ่านให้ {resetTarget.displayName}</h2></div><button type="button" onClick={()=>setResetTarget(null)}>×</button></div><label>รหัสผ่านใหม่<input required type="password" minLength={12} value={resetPassword} onChange={e=>setResetPassword(e.target.value)}/></label><div className="m101-editor-actions"><button type="button" className="m101-button" onClick={()=>setResetTarget(null)}>ยกเลิก</button><button className="m101-button m101-button-primary" disabled={saving}>ยืนยันตั้งรหัสผ่าน</button></div></form></div>}
  </section>;
}


function normalizeThaiTaxId(value:string):string {
  let normalized=String(value||'').trim().replace(/\.0$/,'');
  if(/[+-]?\d*(\.\d+)?e[+-]?\d+/i.test(normalized)){
    const number=Number(normalized);
    if(Number.isFinite(number))normalized=BigInt(Math.round(number)).toString();
  }
  const digits=normalized.replace(/\D/g,'');
  if(digits.length===12&&!digits.startsWith('0'))normalized='0'+normalized;
  return normalized;
}
const importFields: { key: keyof Business; label: string; hints: string[] }[] = [
  { key: 'sequenceNo', label: 'ลำดับ', hints: ['ลำดับ','sequence','no','ที่'] },
  { key: 'companyName', label: 'ชื่อกิจการ', hints: ['ชื่อกิจการ','ชื่อนิติบุคคล','ชื่อบริษัท','ชื่อบริษัท/หจก','company name','business name'] },
  { key: 'type', label: 'ประเภทกิจการ', hints: ['ประเภท','type','รูปแบบ'] },
  { key: 'taxId', label: 'เลขทะเบียน / เลขผู้เสียภาษี', hints: ['เลขทะเบียน','เลขประจำตัวผู้เสียภาษี','tax','registration','เลขผู้เสียภาษี'] },
  { key: 'eFilingCode', label: 'รหัส e-Filing', hints: ['efiling','e-filing','รหัสยื่น','รหัสกรม'] },
  { key: 'ssoCode', label: 'รหัสประกันสังคม', hints: ['ประกันสังคม','sso'] },
  { key: 'auditorDate', label: 'วันที่ผู้สอบบัญชี', hints: ['วันที่แจ้งผู้สอบ','วันที่ผู้สอบบัญชี','ผู้สอบบัญชี','auditor date','auditor','audit'] },
  { key: 'password', label: 'รหัสผ่าน', hints: ['รหัสผ่าน','password','pass'] },
  { key: 'status', label: 'สถานะ', hints: ['สถานะ','status'] },
  { key: 'remark', label: 'หมายเหตุ', hints: ['หมายเหตุ','remark','note'] },
];
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  // Prefix spreadsheet formula starters so exported user data is treated as text.
  const safe = /^[\t\n\r ]*[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][]=[]; let row:string[]=[]; let cell=''; let quoted=false;
  for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'&&quoted&&source[i+1]==='"'){cell+='"';i++;}else if(ch==='"'){quoted=!quoted;}else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}else cell+=ch;}
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
}

function splitExcelTables(matrix: string[][]): string[][][] {
  const rowGroups: number[][] = []; let rowGroup: number[] = [];
  for (let row = 0; row < matrix.length; row++) {
    if ((matrix[row] || []).some(value => String(value ?? '').trim())) rowGroup.push(row);
    else if (rowGroup.length) { rowGroups.push(rowGroup); rowGroup = []; }
  }
  if (rowGroup.length) rowGroups.push(rowGroup);
  const maxColumns = Math.max(0, ...matrix.map(row => row.length));
  const columnGroups: number[][] = []; let columnGroup: number[] = [];
  for (let column = 0; column < maxColumns; column++) {
    if (matrix.some(row => String(row?.[column] ?? '').trim())) columnGroup.push(column);
    else if (columnGroup.length) { columnGroups.push(columnGroup); columnGroup = []; }
  }
  if (columnGroup.length) columnGroups.push(columnGroup);
  const blocks: string[][][] = [];
  for (const rows of rowGroups) for (const columns of columnGroups) {
    const block = rows.map(row => columns.map(column => String(matrix[row]?.[column] ?? '').trim()));
    if (block.length >= 2 && block[0].some(Boolean) && block.slice(1).some(row => row.some(Boolean))) blocks.push(block);
  }
  return blocks;
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
      const parsed=parseCsvRows((await file.text()).replace(/^\uFEFF/,''));
      if(parsed.length<2){setError('ไฟล์นี้ไม่มีแถวข้อมูลเพียงพอ');return;}
      setTableBlocks([parsed]);applyTable(parsed);return;
    }
    if(!['xlsx','xls','xlsm'].includes(extension||'')){setError('รองรับไฟล์ .xlsx, .xls, .xlsm และ .csv');return;}
    try{
      const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});
      const parsedSheets:Record<string,string[][]>={};
      for(const name of workbook.SheetNames){
        const matrix=XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name],{header:1,defval:'',raw:false}).map(row=>row.map(value=>value instanceof Date?localDateKey(value):String(value??'').trim()));
        parsedSheets[name]=matrix;
      }
      const names=workbook.SheetNames;
      if(!names.length){setError('ไม่พบ Worksheet ในไฟล์นี้');return;}
      setSheetData(parsedSheets);setSheetNames(names);setSelectedSheet(names[0]);
      const blocks=splitExcelTables(parsedSheets[names[0]]);
      if(!blocks.length){setError('ไม่พบตารางข้อมูลในชีตนี้');return;}
      setTableBlocks(blocks);setSelectedTable(0);applyTable(blocks[0]);
    }catch(e){setError(e instanceof Error?'อ่านไฟล์ Excel ไม่สำเร็จ: '+e.message:'อ่านไฟล์ Excel ไม่สำเร็จ');}
  };
  const chooseSheet=(name:string)=>{setSelectedSheet(name);const blocks=splitExcelTables(sheetData[name]||[]);setTableBlocks(blocks);setSelectedTable(0);if(blocks.length)applyTable(blocks[0]);else{setHeaders([]);setRows([]);setError('ไม่พบตารางข้อมูลในชีตนี้');}};
  const chooseTable=(index:number)=>{setSelectedTable(index);applyTable(tableBlocks[index]||[]);};
  const mapped=rows.map(row=>{const value=(key:keyof Business)=>{const header=mapping[String(key)];const index=headers.indexOf(header);return index>=0?String(row[index]||'').trim():'';};const rawType=value('type').toLocaleLowerCase('th-TH');const rawStatus=value('status').toLocaleLowerCase('th-TH');return {sequenceNo:value('sequenceNo'),companyName:value('companyName'),taxId:normalizeThaiTaxId(value('taxId')),type:rawType.includes('ห้าง')||rawType.includes('partnership')?'partnership':rawType.includes('บุคคล')?'individual':'company',eFilingCode:value('eFilingCode'),ssoCode:value('ssoCode'),auditorDate:value('auditorDate'),password:value('password'),status:rawStatus.includes('เสร็จ')||rawStatus.includes('complete')?'completed':rawStatus.includes('กำลัง')||rawStatus.includes('progress')?'in_progress':'pending',remark:value('remark')};}).filter(r=>r.companyName);
  const seenTaxIds=new Set(records.map(item=>normalizeThaiTaxId(item.taxId||'')).filter(Boolean));
  const seenCompanyNames=new Set(records.map(item=>(item.companyName||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH')).filter(Boolean));
  let duplicates=0;
  const uniqueMapped=mapped.filter(item=>{
    const taxId=normalizeThaiTaxId(item.taxId||'');
    const companyName=(item.companyName||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('th-TH');
    if((taxId&&seenTaxIds.has(taxId))||(companyName&&seenCompanyNames.has(companyName))){duplicates++;return false;}
    if(taxId)seenTaxIds.add(taxId);
    if(companyName)seenCompanyNames.add(companyName);
    return true;
  });
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


type RelationshipGroup = { id:string; name:string; createdAt:string; updatedAt:string; businessIds:string[] };
export function RelationshipGroups() {
  const [groups,setGroups]=useState<RelationshipGroup[]>([]);
  const [businesses,setBusinesses]=useState<{id:string;companyName:string;taxId:string}[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [name,setName]=useState('');
  const [businessIds,setBusinessIds]=useState<string[]>([]);
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await apiJson('/api/relationship-groups');setGroups(data.groups||[]);setBusinesses(data.businesses||[]);setSelectedId(current=>current&&((data.groups||[]).some((g:RelationshipGroup)=>g.id===current))?current:'');}catch(e){setError(e instanceof Error?e.message:'โหลดกลุ่มกิจการไม่สำเร็จ');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{const selected=groups.find(g=>g.id===selectedId);setName(selected?.name||'');setBusinessIds(selected?.businessIds||[]);},[groups,selectedId]);
  const startNew=()=>{setSelectedId('');setName('');setBusinessIds([]);};
  const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{if(selectedId){await apiJson('/api/relationship-groups/'+selectedId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,businessIds})});}else{const data=await apiJson('/api/relationship-groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,businessIds})});setSelectedId(data.id);}await load();setError('บันทึกกลุ่มกิจการแล้ว');}catch(e){setError(e instanceof Error?e.message:'บันทึกกลุ่มกิจการไม่สำเร็จ');}finally{setSaving(false);}};
  const remove=async()=>{if(!selectedId||!window.confirm('ยืนยันลบกลุ่มนี้? ข้อมูลกิจการและงานประจำปีจะไม่ถูกลบ'))return;setSaving(true);try{await apiJson('/api/relationship-groups/'+selectedId,{method:'DELETE'});setSelectedId('');setName('');setBusinessIds([]);await load();}catch(e){setError(e instanceof Error?e.message:'ลบกลุ่มไม่สำเร็จ');}finally{setSaving(false);}};
  const visible=businesses.filter(b=>(b.companyName+' '+b.taxId).toLocaleLowerCase('th-TH').includes(search.trim().toLocaleLowerCase('th-TH')));
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">BUSINESS RELATIONSHIPS</span><h1>กลุ่มกิจการและความสัมพันธ์</h1><p>จัดกลุ่มกิจการได้หลายกลุ่มโดยไม่รวมทะเบียน บัญชี หรืองานของแต่ละกิจการเข้าด้วยกัน</p></div><button className="m101-button m101-button-primary" onClick={startNew}>＋ สร้างกลุ่ม</button></div>{error&&<div className="m101-alert" role="status">{error}<button onClick={()=>void load()}>รีเฟรช</button></div>}
    <div className="m101-relationship-layout"><aside className="m101-panel m101-group-list"><div className="m101-panel-heading"><div><h2>กลุ่มที่สร้างไว้</h2><p>{groups.length} กลุ่ม</p></div></div>{loading?<div className="m101-empty-state">กำลังโหลด…</div>:groups.length?groups.map(group=><button key={group.id} className={'m101-group-choice '+(selectedId===group.id?'selected':'')} onClick={()=>setSelectedId(group.id)}><span><b>{group.name}</b><small>{group.businessIds.length} กิจการ</small></span><span>›</span></button>):<div className="m101-empty-state">ยังไม่มีกลุ่มกิจการ</div>}</aside>
      <form className="m101-panel m101-group-editor" onSubmit={save}><div className="m101-panel-heading"><div><h2>{selectedId?'แก้ไขกลุ่มกิจการ':'สร้างกลุ่มกิจการใหม่'}</h2><p>กิจการหนึ่งแห่งสามารถอยู่ในหลายกลุ่มได้</p></div>{selectedId&&<button type="button" className="m101-row-actions-button" onClick={()=>void remove()} disabled={saving}>ลบกลุ่ม</button>}</div><label className="m101-group-name">ชื่อกลุ่ม<input required minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น กลุ่มธุรกิจครอบครัว"/></label><div className="m101-assignment-toolbar"><label>ค้นหากิจการ<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ชื่อกิจการหรือเลขทะเบียน"/></label><span className="m101-assignment-summary">เลือก {businessIds.length} กิจการ</span></div><div className="m101-assignment-list">{visible.map(b=><label key={b.id} className="m101-assignment-item"><input type="checkbox" checked={businessIds.includes(b.id)} onChange={e=>setBusinessIds(prev=>e.target.checked?[...prev,b.id]:prev.filter(id=>id!==b.id))}/><span><b>{b.companyName||'ไม่ระบุชื่อกิจการ'}</b><small>{b.taxId||'ไม่มีเลขทะเบียน'}</small></span></label>)}{!visible.length&&<p className="m101-empty-state">ไม่พบกิจการ</p>}</div><div className="m101-editor-actions"><button type="button" className="m101-button" onClick={startNew}>ล้างฟอร์ม</button><button className="m101-button m101-button-primary" disabled={saving||name.trim().length<2}>{saving?'กำลังบันทึก…':selectedId?'บันทึกการแก้ไข':'สร้างกลุ่มกิจการ'}</button></div></form>
    </div>
  </section>;
}


type AnnualTaskRow = { id:string; fiscalYear:string; businessId:string; businessName:string; taskCode:string; taskName:string; status:string; dueDate:string; note:string; createdAt:string; updatedAt:string };
export function CalendarView({year='69'}:{year?:string}) {
  const [tasks,setTasks]=useState<AnnualTaskRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await apiJson('/api/annual-tasks?year='+encodeURIComponent(year));setTasks(data.tasks||[]);}catch(e){setError(e instanceof Error?e.message:'โหลดปฏิทินไม่สำเร็จ');}finally{setLoading(false);}},[year]);
  useEffect(()=>{void load();},[load]);
  const dated=tasks.filter(t=>t.dueDate).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
  const overdue=dated.filter(t=>t.dueDate<new Date().toISOString().slice(0,10)&&t.status!=='completed');
  const completed=tasks.filter(t=>t.status==='completed').length;
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">DEADLINE CALENDAR</span><h1>ปฏิทินกำหนดการ</h1><p>กำหนดส่งงานและภาระประจำปี · รอบปี {year}</p></div><button className="m101-button" onClick={()=>void load()}>↻ รีเฟรช</button></div>{error&&<div className="m101-alert" role="alert">{error}</div>}<div className="m101-report-grid"><div className="m101-panel"><small>กำหนดส่งทั้งหมด</small><strong>{dated.length}</strong></div><div className="m101-panel"><small>เลยกำหนดและยังไม่เสร็จ</small><strong>{overdue.length}</strong></div><div className="m101-panel"><small>ดำเนินการเสร็จแล้ว</small><strong>{completed}</strong></div></div><div className="m101-panel"><div className="m101-panel-heading"><div><h2>รายการกำหนดส่ง</h2><p>เรียงตามวันที่ใกล้ถึงก่อน</p></div></div>{loading?<div className="m101-empty-state">กำลังโหลดกำหนดการ…</div>:dated.length?<div className="m101-deadline-list">{dated.map(task=><div className="m101-deadline-row" key={task.id}><div className={'m101-deadline-date '+(task.dueDate<new Date().toISOString().slice(0,10)&&task.status!=='completed'?'is-overdue':'')}><b>{task.dueDate.slice(8,10)}</b><small>{task.dueDate.slice(5,7)}/{task.dueDate.slice(0,4)}</small></div><div className="m101-deadline-meta"><b>{task.taskName}</b><small>{task.businessName} · {task.taskCode}</small></div><span className={'m101-status-chip '+(task.status==='completed'?'status-completed':task.status==='in_progress'?'status-progress':'status-pending')}>{statusText[task.status]||'รอดำเนินการ'}</span></div>)}</div>:<div className="m101-empty-state">ยังไม่มีงานที่กำหนดวันส่งในรอบปีนี้</div>}</div></section>;
}
export function ReportsView({year='69'}:{year?:string}) {
  const [records,setRecords]=useState<Business[]>([]);
  const [tasks,setTasks]=useState<AnnualTaskRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const [directory,annual]=await Promise.all([apiJson('/api/directory?year='+encodeURIComponent(year)),apiJson('/api/annual-tasks?year='+encodeURIComponent(year))]);setRecords(directory.records||[]);setTasks(annual.tasks||[]);}catch(e){setError(e instanceof Error?e.message:'โหลดรายงานไม่สำเร็จ');}finally{setLoading(false);}},[year]);
  useEffect(()=>{void load();},[load]);
  const completed=tasks.filter(t=>t.status==='completed').length;
  const progress=tasks.filter(t=>t.status==='in_progress').length;
  const pending=tasks.length-completed-progress;
  const pct=tasks.length?Math.round(completed/tasks.length*100):0;
  const types=[{key:'company',label:'บริษัทจำกัด'},{key:'partnership',label:'ห้างหุ้นส่วน'},{key:'individual',label:'บุคคลธรรมดา'}].map(item=>({...item,count:records.filter(r=>r.type===item.key).length}));
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">WORKSPACE REPORTS</span><h1>รายงานและข้อมูลเชิงลึก</h1><p>สรุปจากทะเบียนกิจการและงานประจำปี · รอบปี {year}</p></div><button className="m101-button" onClick={()=>void load()}>↻ รีเฟรช</button></div>{error&&<div className="m101-alert" role="alert">{error}</div>}{loading?<div className="m101-panel m101-empty-state">กำลังคำนวณรายงาน…</div>:<><div className="m101-report-grid"><div className="m101-panel"><small>กิจการในทะเบียน</small><strong>{records.length.toLocaleString('th-TH')}</strong></div><div className="m101-panel"><small>งานประจำปี</small><strong>{tasks.length.toLocaleString('th-TH')}</strong></div><div className="m101-panel"><small>เสร็จแล้ว</small><strong>{completed.toLocaleString('th-TH')}</strong></div><div className="m101-panel"><small>ความคืบหน้า</small><strong>{pct}%</strong></div></div><div className="m101-report-columns"><div className="m101-panel"><div className="m101-panel-heading"><div><h2>สถานะงาน</h2><p>สัดส่วนงานทั้งหมดในรอบปี</p></div></div><div className="m101-progress-track"><span style={{width:pct+'%'}}/></div><div className="m101-report-legend"><span>เสร็จแล้ว <b>{completed}</b></span><span>กำลังทำ <b>{progress}</b></span><span>รอดำเนินการ <b>{pending}</b></span></div></div><div className="m101-panel"><div className="m101-panel-heading"><div><h2>ประเภทกิจการ</h2><p>จำแนกจากทะเบียนปัจจุบัน</p></div></div>{types.map(item=><div className="m101-type-stat" key={item.key}><span>{item.label}</span><b>{item.count}</b><i><span style={{width:(records.length?item.count/records.length*100:0)+'%'}}/></i></div>)}</div></div></>}</section>;
}
export function ActivityView() {
  const [events,setEvents]=useState<{id:string;actorUserId:string;actorName:string;action:string;resourceType:string;resourceId:string;metadata:Record<string,unknown>;createdAt:string}[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const data=await apiJson('/api/activity');setEvents(data.events||[]);}catch(e){setError(e instanceof Error?e.message:'โหลดประวัติการทำงานไม่สำเร็จ');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  const labels:Record<string,string>={'directory.year_saved':'บันทึกทะเบียนกิจการ','member.created':'สร้างบัญชีสมาชิก','member.updated':'แก้ไขบัญชีสมาชิก','member.password_reset':'ตั้งรหัสผ่านสมาชิก','member.assignments_updated':'เปลี่ยนการมอบหมายกิจการ','member.added_to_workspace':'เพิ่มสมาชิกเข้า Workspace','member.removed_from_workspace':'นำสมาชิกออกจาก Workspace','annual_task.created':'เพิ่มงานประจำปี','annual_task.updated':'อัปเดตงานประจำปี','annual_task.deleted':'ลบงานประจำปี','relationship_group.created':'สร้างกลุ่มกิจการ','relationship_group.updated':'แก้ไขกลุ่มกิจการ','relationship_group.deleted':'ลบกลุ่มกิจการ'};
  return <section className="m101-page"><div className="m101-page-heading"><div><span className="m101-eyebrow">AUDIT TRAIL</span><h1>ประวัติการทำงาน</h1><p>บันทึกการเปลี่ยนแปลงและการจัดการในพื้นที่ทำงาน</p></div><button className="m101-button" onClick={()=>void load()}>↻ รีเฟรช</button></div>{error&&<div className="m101-alert" role="alert">{error}</div>}<div className="m101-panel"><div className="m101-panel-heading"><div><h2>กิจกรรมล่าสุด</h2><p>แสดงสูงสุด 100 รายการล่าสุด</p></div></div>{loading?<div className="m101-empty-state">กำลังโหลดประวัติ…</div>:events.length?<div className="m101-activity-list">{events.map(event=><div className="m101-activity-row" key={event.id}><span className="m101-activity-dot"/><div><b>{labels[event.action]||event.action}</b><small>{event.actorName||'ระบบ'} · {event.resourceType} · {event.resourceId||'—'}</small></div><time>{new Date(event.createdAt).toLocaleString('th-TH')}</time></div>)}</div>:<div className="m101-empty-state">ยังไม่มีประวัติการเปลี่ยนแปลง</div>}</div></section>;
}
