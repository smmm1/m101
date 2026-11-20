import React, { useCallback, useEffect, useMemo, useState } from 'react';

type Member = {
  id: string; username: string; display_name: string; role: 'admin' | 'member';
  account_status: 'active' | 'suspended'; local_password_set: number; created_at: string;
};
type Activity = {
  id: string; actor_user_id: string | null; actor_username?: string | null; actor_display_name?: string | null;
  action: string; resource_type: string; resource_id: string | null; metadata_json: string; created_at: string;
};
type Assignment = { id: string; business_id: string; user_id: string; display_name: string; created_at: string };
type BusinessOption = { id: string; companyName: string; fiscalYear: string };
type Tab = 'members' | 'permissions' | 'login' | 'activity';

const dateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
};
const actionLabel = (event: Activity) => {
  let metadata: Record<string, unknown> = {};
  try { metadata = JSON.parse(event.metadata_json || '{}'); } catch { metadata = {}; }
  const name = String(metadata.businessName || metadata.taskName || metadata.label || (event.action.startsWith('user.') && metadata.username ? '@' + metadata.username : ''));
  const year = metadata.fiscalYear ? ` · ปี ${metadata.fiscalYear}` : '';
  const changed = Array.isArray(metadata.changedFields) ? ` (แก้ไข: ${metadata.changedFields.join(', ')})` : '';
  const labels: Record<string, string> = {
    'auth.login': 'เข้าสู่ระบบ', 'auth.logout': 'ออกจากระบบ', 'auth.session_expired': 'เซสชันหมดอายุ',
    'user.created': 'สร้างบัญชีสมาชิก', 'user.updated': 'แก้ไขบัญชีสมาชิก',
    'business.created': 'เพิ่มกิจการ', 'business.updated': 'แก้ไขกิจการ',
    'business.deleted': 'ลบกิจการ', 'business.imported': 'นำเข้าไฟล์กิจการ', 'business.viewed': 'เปิดดูรายละเอียดกิจการ',
    'navigation.opened': 'เปิดหน้าเมนู', 'report.exported': 'ส่งออกรายงาน',
    'business.assignment.created': 'มอบหมายกิจการ', 'business.assignment.revoked': 'ยกเลิกการมอบหมาย',
    'annual_task.created': 'เพิ่มงานประจำปี', 'annual_task.updated': 'แก้ไขงานประจำปี', 'annual_task.deleted': 'ลบงานประจำปี',
    'owner.password_initialized': 'ตั้งค่าบัญชี Owner',
  };
  const memberState = event.action === 'user.updated' && metadata.accountStatus === 'suspended' ? ' · ระงับบัญชี'
    : event.action === 'user.updated' && metadata.passwordReset ? ' · รีเซ็ตรหัสผ่าน' : '';
  return (labels[event.action] || event.action) + (name ? ` · ${name}` : '') + memberState + year + changed;
};

export function OwnerMembersPage({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Activity[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [businessOptions, setBusinessOptions] = useState<BusinessOption[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'login' | 'changes' | 'views'>('all');
  const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดรายชื่อสมาชิกไม่สำเร็จ');
      setMembers((payload.users || []) as Member[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'โหลดสมาชิกไม่สำเร็จ'); }
    finally { setLoadingMembers(false); }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const query = new URLSearchParams({ limit: '500' });
      if (filterMember) query.set('memberId', filterMember);
      const response = await fetch(`/api/admin/activity?${query.toString()}`, { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดประวัติกิจกรรมไม่สำเร็จ');
      setEvents((payload.events || []) as Activity[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'โหลดประวัติไม่สำเร็จ'); }
    finally { setLoadingEvents(false); }
  }, [filterMember]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);
  const loadAssignments = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const [assignmentResponse, dataResponse] = await Promise.all([
        fetch('/api/workspace/assignments', { credentials: 'same-origin' }),
        fetch('/api/data', { credentials: 'same-origin' }),
      ]);
      const [assignmentPayload, dataPayload] = await Promise.all([assignmentResponse.json(), dataResponse.json()]);
      if (!assignmentResponse.ok) throw new Error(assignmentPayload.error || 'โหลดสิทธิ์สมาชิกไม่สำเร็จ');
      if (!dataResponse.ok) throw new Error(dataPayload.error || 'โหลดทะเบียนกิจการไม่สำเร็จ');
      setAssignments((assignmentPayload.assignments || []) as Assignment[]);
      const options: BusinessOption[] = [];
      for (const [year, rows] of Object.entries(dataPayload.recordsByYear || {}) as Array<[string, Array<Record<string, unknown>>]>) {
        for (const row of rows || []) if (row.id && row.companyName) options.push({ id: String(row.id), companyName: String(row.companyName), fiscalYear: year });
      }
      setBusinessOptions(options);
    } catch (err) { setError(err instanceof Error ? err.message : 'โหลดสิทธิ์สมาชิกไม่สำเร็จ'); }
    finally { setLoadingEvents(false); }
  }, []);

  useEffect(() => {
    if (tab === 'login' || tab === 'activity') void loadEvents();
    // Per-business assignment management is disabled for the shared-workspace model.
  }, [tab, loadEvents, loadAssignments]);

  const memberCount = members.filter((member) => member.role === 'member').length;
  const activeCount = members.filter((member) => member.role === 'member' && member.account_status === 'active').length;
  const filteredEvents = useMemo(() => events.filter((event) => {
    if (activityFilter === 'login') return event.action.startsWith('auth.');
    if (activityFilter === 'views') return ['business.viewed', 'navigation.opened'].includes(event.action);
    if (activityFilter === 'changes') return !event.action.startsWith('auth.') && !['business.viewed', 'navigation.opened'].includes(event.action);
    return true;
  }), [events, activityFilter]);

  const assignBusiness = async () => {
    if (!selectedMember || !selectedBusiness || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/workspace/assignments', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedMember, businessId: selectedBusiness }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'มอบหมายสิทธิ์ไม่สำเร็จ');
      setNotice(payload.alreadyAssigned ? 'สมาชิกมีสิทธิ์ในกิจการนี้อยู่แล้ว' : 'มอบหมายสิทธิ์เข้าถึงกิจการแล้ว');
      await loadAssignments();
    } catch (err) { setError(err instanceof Error ? err.message : 'มอบหมายสิทธิ์ไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const revokeAssignment = async (assignment: Assignment) => {
    if (saving || !window.confirm('ยกเลิกสิทธิ์เข้าถึงกิจการนี้?')) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/workspace/assignments/${encodeURIComponent(assignment.id)}`, { method: 'DELETE', credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ยกเลิกสิทธิ์ไม่สำเร็จ');
      setNotice('ยกเลิกสิทธิ์เข้าถึงแล้ว');
      await loadAssignments();
    } catch (err) { setError(err instanceof Error ? err.message : 'ยกเลิกสิทธิ์ไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const createMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), displayName: displayName.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'สร้างสมาชิกไม่สำเร็จ');
      setUsername(''); setDisplayName(''); setPassword('');
      setNotice(`สร้างบัญชี @${payload.user?.username || ''} แล้ว`);
      await loadMembers();
    } catch (err) { setError(err instanceof Error ? err.message : 'สร้างสมาชิกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  const updateMember = async (member: Member, changes: { displayName?: string; accountStatus?: 'active' | 'suspended'; newPassword?: string }) => {
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(member.id)}`, {
        method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: member.username, displayName: changes.displayName ?? member.display_name, accountStatus: changes.accountStatus ?? member.account_status, newPassword: changes.newPassword || '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'บันทึกข้อมูลสมาชิกไม่สำเร็จ');
      setEditing(null); setNewPassword('');
      setNotice(changes.accountStatus === 'suspended' ? `ระงับบัญชี @${member.username} แล้ว (เก็บประวัติไว้)` : changes.accountStatus === 'active' ? `เปิดใช้งาน @${member.username} แล้ว` : `บันทึกบัญชี @${member.username} แล้ว`);
      await loadMembers();
      if (tab !== 'members') await loadEvents();
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกสมาชิกไม่สำเร็จ'); }
    finally { setSaving(false); }
  };

  return (
    <main className="fixed inset-0 z-[300] flex min-h-0 flex-col overflow-y-auto bg-[#f5f6f8] text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="กลับ">←</button>
          <div className="min-w-0"><p className="text-[10px] font-semibold tracking-[.16em] text-slate-400">OWNER CONTROL</p><h1 className="truncate text-lg font-semibold">จัดการสมาชิกและประวัติ</h1></div>
        </div>
        <button type="button" onClick={() => { void loadMembers(); if (tab !== 'members') void loadEvents(); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">รีเฟรช</button>
      </header>

      <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-8">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">สมาชิกทั้งหมด</p><p className="mt-1 text-2xl font-semibold tabular-nums">{memberCount}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">กำลังใช้งาน</p><p className="mt-1 text-2xl font-semibold tabular-nums">{activeCount}</p></div>
          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1"><p className="text-xs text-slate-500">ระงับบัญชี</p><p className="mt-1 text-2xl font-semibold tabular-nums">{memberCount - activeCount}</p></div>
        </section>

        <nav className="flex gap-1 border-b border-slate-200" aria-label="ส่วนจัดการสมาชิก">
          {([['members','สมาชิก'],['login','เข้า–ออกระบบ'],['activity','กิจกรรมในระบบ']] as Array<[Tab,string]>).map(([key,label]) => (
            <button key={key} type="button" onClick={() => { setTab(key); setError(''); setNotice(''); }} className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${tab === key ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </nav>

        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        {tab === 'members' && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4"><div><h2 className="text-sm font-semibold">บัญชีสมาชิก</h2><p className="mt-1 text-xs text-slate-400">จัดการบัญชีและสถานะการเข้าใช้งาน</p></div><span className="text-xs text-slate-400">{memberCount} คน</span></div>
            {loadingMembers ? <p className="p-8 text-center text-sm text-slate-400">กำลังโหลด…</p> : <div className="divide-y divide-slate-100">
              {members.filter((member) => member.role === 'member').map((member) => <div key={member.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{member.display_name} <span className="font-normal text-slate-400">@{member.username}</span></p><p className="mt-1 text-xs text-slate-400">สร้างเมื่อ {dateTime(member.created_at)} · สิทธิ์ Member</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${member.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{member.account_status === 'active' ? 'ใช้งานได้' : 'ระงับบัญชี'}</span></div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => { setEditing(member); setEditName(member.display_name); setNewPassword(''); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">แก้ไข / รีเซ็ตรหัส</button>
                  <button type="button" disabled={saving} onClick={() => { const next = member.account_status === 'active' ? 'suspended' : 'active'; if (window.confirm(next === 'suspended' ? `ระงับบัญชี @${member.username}? ประวัติเดิมจะยังอยู่` : `เปิดใช้งาน @${member.username} อีกครั้ง?`)) void updateMember(member, { accountStatus: next }); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">{member.account_status === 'active' ? 'นำออก / ระงับ' : 'เปิดใช้งาน'}</button>
                </div>
              </div>)}
              {!memberCount && <p className="p-8 text-center text-sm text-slate-400">ยังไม่มีสมาชิก</p>}
            </div>}
          </section>

          <section className="h-fit rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold">เพิ่มสมาชิก</h2><p className="mt-1 text-xs leading-5 text-slate-500">Owner กำหนด User ID และรหัสผ่านให้สมาชิก</p>
            <form onSubmit={createMember} className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-600">User ID<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="เช่น somchai01" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
              <label className="block text-xs font-medium text-slate-600">ชื่อที่แสดง<input required maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
              <label className="block text-xs font-medium text-slate-600">รหัสผ่านเริ่มต้น<input required minLength={12} maxLength={1024} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /><span className="mt-1 block font-normal text-slate-400">อย่างน้อย 12 ตัวอักษร</span></label>
              <button type="submit" disabled={saving || password.length < 12 || !username.trim() || !displayName.trim()} className="h-10 w-full rounded-lg bg-[#172b4d] text-sm font-semibold text-white hover:bg-[#10213d] disabled:opacity-50">{saving ? 'กำลังบันทึก…' : 'สร้างบัญชีสมาชิก'}</button>
            </form>
            <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-5 text-slate-400">การนำออกจะระงับการเข้าสู่ระบบและเก็บประวัติเดิมไว้ ไม่ลบบันทึกกิจกรรมย้อนหลัง</p>
          </section>
        </div>}

        {tab === 'permissions' && <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4"><h2 className="text-sm font-semibold">กำหนดสิทธิ์เข้าถึงกิจการ</h2><p className="mt-1 text-xs text-slate-400">สมาชิกจะเห็นและแก้ไขได้เฉพาะกิจการที่ Owner มอบหมายให้</p></div>
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
            <label className="block text-xs font-medium text-slate-600">สมาชิก<select value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">เลือกสมาชิก</option>{members.filter((member) => member.role === 'member' && member.account_status === 'active').map((member) => <option key={member.id} value={member.id}>{member.display_name} (@{member.username})</option>)}</select></label>
            <label className="block text-xs font-medium text-slate-600">กิจการที่อนุญาต<select value={selectedBusiness} onChange={(event) => setSelectedBusiness(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">เลือกกิจการ</option>{businessOptions.map((business) => <option key={business.id} value={business.id}>{business.companyName} · ปี {business.fiscalYear}</option>)}</select></label>
            <button type="button" disabled={!selectedMember || !selectedBusiness || saving} onClick={() => void assignBusiness()} className="h-10 rounded-lg bg-[#172b4d] px-4 text-sm font-semibold text-white disabled:opacity-50">มอบหมายสิทธิ์</button>
          </div>
          {loadingEvents ? <p className="p-8 text-center text-sm text-slate-400">กำลังโหลดสิทธิ์…</p> : <div className="divide-y divide-slate-100">
            {assignments.filter((assignment) => !selectedMember || assignment.user_id === selectedMember).map((assignment) => {
              const business = businessOptions.find((item) => item.id === assignment.business_id);
              const member = members.find((item) => item.id === assignment.user_id);
              return <div key={assignment.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{business?.companyName || 'กิจการที่ไม่มีในทะเบียนแล้ว'}</p><p className="mt-1 text-xs text-slate-400">{member?.display_name || assignment.display_name} · มอบหมายเมื่อ {dateTime(assignment.created_at)}</p></div><button type="button" disabled={saving} onClick={() => void revokeAssignment(assignment)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">ยกเลิกสิทธิ์</button></div>;
            })}
            {!assignments.length && <p className="p-8 text-center text-sm text-slate-400">ยังไม่มีการมอบหมายสิทธิ์</p>}
          </div>}
          <footer className="border-t border-slate-100 px-4 py-3 text-[11px] leading-5 text-slate-400">สิทธิ์ในปัจจุบันเป็นการกำหนดขอบเขตตามกิจการ (เข้าถึงและแก้ไขข้อมูลกิจการที่ได้รับมอบหมาย) ยังไม่มีการแยกสิทธิ์อ่านอย่างเดียวกับแก้ไข</footer>
        </section>}

        {(tab === 'login' || tab === 'activity') && <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${tab === 'login' ? 'bg-sky-50 text-sky-700' : 'bg-violet-50 text-violet-700'}`} aria-hidden="true">{tab === 'login' ? '🔐' : '📋'}</span>
              <div><h2 className="text-sm font-semibold">{tab === 'login' ? 'ประวัติการเข้า–ออกระบบ' : 'ประวัติกิจกรรมสมาชิก'}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{tab === 'login' ? 'ตรวจสอบว่าใครเข้าสู่ระบบหรือออกจากระบบเมื่อใด' : 'ติดตามการเปลี่ยนแปลงและการใช้งานที่สำคัญของสมาชิก'}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="กรองตามสมาชิก" value={filterMember} onChange={(event) => setFilterMember(event.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"><option value="">สมาชิกทั้งหมด</option>{members.filter((member) => member.role === 'member').map((member) => <option key={member.id} value={member.id}>{member.display_name} (@{member.username})</option>)}</select>
              {tab === 'activity' && <select aria-label="กรองประเภทกิจกรรม" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-600"><option value="all">ทุกกิจกรรม</option><option value="changes">เพิ่ม / แก้ไข / ลบ</option><option value="views">เปิดดู / เปิดหน้า</option><option value="login">เข้า–ออกระบบ</option></select>}
              <button type="button" onClick={() => void loadEvents()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"><span aria-hidden="true">↻</span> โหลดใหม่</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{tab === 'login' ? 'รายการเข้า–ออก' : 'กิจกรรมที่พบ'}</p><p className="mt-1 text-xl font-semibold tabular-nums">{(tab === 'login' ? events.filter((event) => event.action.startsWith('auth.')) : filteredEvents).length}</p></div>
            <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-xs text-slate-500">{tab === 'login' ? 'เข้าสู่ระบบ' : 'รายการเปลี่ยนแปลง'}</p><p className="mt-1 text-xl font-semibold tabular-nums">{tab === 'login' ? events.filter((event) => event.action === 'auth.login').length : events.filter((event) => /\.created$|\.updated$|\.deleted$/.test(event.action)).length}</p></div>
            <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:col-span-1"><p className="text-xs text-slate-500">{tab === 'login' ? 'ออกจากระบบ / หมดอายุ' : 'เปิดดู / เปิดหน้า'}</p><p className="mt-1 text-xl font-semibold tabular-nums">{tab === 'login' ? events.filter((event) => event.action === 'auth.logout' || event.action === 'auth.session_expired').length : events.filter((event) => ['business.viewed','navigation.opened'].includes(event.action)).length}</p></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><p className="text-xs font-semibold text-slate-700">{tab === 'login' ? 'รายการเข้า–ออกล่าสุด' : 'รายการกิจกรรมล่าสุด'}</p><span className="text-[11px] text-slate-400">ใหม่ล่าสุดอยู่ด้านบน</span></div>
            {loadingEvents ? <p className="p-10 text-center text-sm text-slate-400">กำลังโหลดประวัติ…</p> : (tab === 'login' ? events.filter((event) => event.action.startsWith('auth.')) : filteredEvents).length ? <div className="divide-y divide-slate-100">
              {(tab === 'login' ? events.filter((event) => event.action.startsWith('auth.')) : filteredEvents).map((event) => {
                const meta = (() => { try { return JSON.parse(event.metadata_json || '{}') as Record<string, unknown>; } catch { return {}; } })();
                const visual = event.action === 'auth.login' ? { icon: '↪', tone: 'bg-emerald-50 text-emerald-700', tag: 'เข้าสู่ระบบ' }
                  : event.action === 'auth.logout' ? { icon: '↩', tone: 'bg-slate-100 text-slate-600', tag: 'ออกจากระบบ' }
                  : event.action === 'auth.session_expired' ? { icon: '◷', tone: 'bg-amber-50 text-amber-700', tag: 'เซสชันหมดอายุ' }
                  : event.action === 'business.imported' ? { icon: '⇧', tone: 'bg-cyan-50 text-cyan-700', tag: 'นำเข้าไฟล์' }
                   : event.action.endsWith('.created') ? { icon: '+', tone: 'bg-emerald-50 text-emerald-700', tag: 'เพิ่มข้อมูล' }
                  : event.action.endsWith('.updated') ? { icon: '✎', tone: 'bg-sky-50 text-sky-700', tag: 'แก้ไขข้อมูล' }
                  : event.action.endsWith('.deleted') ? { icon: '×', tone: 'bg-rose-50 text-rose-700', tag: 'ลบข้อมูล' }
                  : event.action === 'business.viewed' ? { icon: '◎', tone: 'bg-violet-50 text-violet-700', tag: 'เปิดดูข้อมูล' }
                  : event.action === 'navigation.opened' ? { icon: '⌂', tone: 'bg-slate-100 text-slate-600', tag: 'เปิดหน้าเมนู' }
                  : event.action.includes('assignment') ? { icon: '⌑', tone: 'bg-indigo-50 text-indigo-700', tag: 'จัดการสิทธิ์' }
                  : event.action === 'report.exported' ? { icon: '⇧', tone: 'bg-cyan-50 text-cyan-700', tag: 'ส่งออกรายงาน' }
                  : { icon: '•', tone: 'bg-slate-100 text-slate-600', tag: 'กิจกรรมอื่น' };
                const target = String(meta.businessName || meta.taskName || meta.label || (meta.username ? '@' + meta.username : '') || '');
                const actor = event.actor_display_name || event.actor_username || 'บัญชีที่ถูกนำออก';
                return <button type="button" key={event.id} onClick={() => setSelectedEvent(event)} className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50/70">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-semibold ${visual.tone}`} aria-hidden="true">{visual.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-800">{actionLabel(event)}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${visual.tone}`}>{visual.tag}</span></div>
                    <p className="mt-1 truncate text-xs text-slate-500">{actor}{event.actor_username ? ` (@${event.actor_username})` : ''}{target && !actionLabel(event).includes(target) ? ` · ${target}` : ''}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{event.action}</p>
                  </div>
                  <time className="shrink-0 self-center text-right text-[11px] leading-5 tabular-nums text-slate-500">{dateTime(event.created_at)}</time>
                </button>;
              })}
            </div> : <div className="px-5 py-12 text-center"><span className="text-2xl" aria-hidden="true">🗂️</span><p className="mt-2 text-sm font-medium text-slate-600">ยังไม่มีประวัติในหมวดนี้</p><p className="mt-1 text-xs text-slate-400">เมื่อมีการใช้งาน รายการจะปรากฏที่นี่</p></div>}
            <footer className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[11px] leading-5 text-slate-500">แสดงสูงสุด 500 รายการ · Logout จะบันทึกเมื่อกดออกจากระบบจริง ส่วนเซสชันหมดอายุจะแสดงแยกต่างหาก</footer>
          </div>
        </section>}
      </div>

      {selectedEvent && (() => {
        let meta: Record<string, unknown> = {};
        try { meta = JSON.parse(selectedEvent.metadata_json || '{}') as Record<string, unknown>; } catch { meta = {}; }
        const safeLabel = (key: string) => ({ companyName: 'ชื่อกิจการ', type: 'ประเภท', status: 'สถานะ', auditorDate: 'วันที่ผู้สอบบัญชี', remark: 'หมายเหตุ', topic: 'หัวข้อ', sourceType: 'แหล่งข้อมูล', sourceFileName: 'ชื่อไฟล์ต้นทาง', sequenceNo: 'ลำดับ' } as Record<string,string>)[key] || key;
        const valueText = (value: unknown) => value === undefined || value === null || value === '' ? '—' : String(value);
        const samples = Array.isArray(meta.createdSamples) ? meta.createdSamples as Array<Record<string, unknown>> : [];
        const updates = Array.isArray(meta.updatedSamples) ? meta.updatedSamples as Array<Record<string, unknown>> : [];
        const changes = Array.isArray(meta.changes) ? meta.changes as Array<Record<string, unknown>> : [];
        const preview = meta.recordPreview && typeof meta.recordPreview === 'object' ? meta.recordPreview as Record<string, unknown> : {};
        return <div className="fixed inset-0 z-[340] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title">
          <section className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-semibold tracking-wider text-slate-400">ACTIVITY DETAIL</p><h2 id="activity-detail-title" className="mt-1 text-base font-semibold text-slate-800">{actionLabel(selectedEvent)}</h2><p className="mt-1 text-xs text-slate-500">{selectedEvent.actor_display_name || selectedEvent.actor_username || 'สมาชิก'} · {dateTime(selectedEvent.created_at)}</p></div><button type="button" onClick={() => setSelectedEvent(null)} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">ปิด</button></header>
            <div className="max-h-[calc(85vh-76px)] space-y-4 overflow-y-auto p-5">
              {selectedEvent.action === 'business.imported' ? <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">ไฟล์</p><p className="mt-1 break-all text-sm font-medium">{valueText(meta.fileName)}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">เพิ่มใหม่</p><p className="mt-1 text-xl font-semibold">{Number(meta.createdCount || 0).toLocaleString('th-TH')}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">แก้ไขเดิม</p><p className="mt-1 text-xl font-semibold">{Number(meta.updatedCount || 0).toLocaleString('th-TH')}</p></div></div>
                {samples.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">ตัวอย่างกิจการที่เพิ่ม</h3><div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{samples.map((item,i)=><div key={String(item.id || i)} className="p-3"><p className="text-sm font-medium">{valueText(item.companyName)}</p><p className="mt-1 text-xs text-slate-500">ปี {valueText(item.fiscalYear)} · {valueText(item.type)} · {valueText(item.status)}</p></div>)}</div></div>}
                {updates.length > 0 && <div><h3 className="mb-2 text-sm font-semibold">ตัวอย่างกิจการที่แก้ไข</h3><div className="space-y-2">{updates.map((item,i)=><div key={String(item.id || i)} className="rounded-xl border border-slate-200 p-3"><p className="text-sm font-medium">{valueText(item.companyName)}</p>{Array.isArray(item.changes) && (item.changes as Array<Record<string,unknown>>).map((change,j)=><p key={j} className="mt-1 text-xs text-slate-600">{safeLabel(String(change.field))}: <span className="text-rose-600">{valueText(change.before)}</span> → <span className="font-medium text-emerald-700">{valueText(change.after)}</span></p>)}</div>)}</div></div>}
                <p className="text-[11px] text-slate-400">แสดงตัวอย่างสูงสุด 12 รายการต่อประเภท</p>
              </> : selectedEvent.action === 'business.updated' ? <>
                <p className="text-sm font-medium">กิจการ: {valueText(meta.businessName)}</p>
                {changes.length > 0 ? <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">{changes.map((change,i)=><div key={i} className="grid grid-cols-1 gap-1 p-3 sm:grid-cols-[130px_1fr] sm:gap-3"><p className="text-xs font-semibold text-slate-600">{safeLabel(String(change.field))}</p><p className="text-xs text-slate-600"><span className="text-rose-600">{valueText(change.before)}</span><span className="mx-2 text-slate-400">→</span><span className="font-medium text-emerald-700">{valueText(change.after)}</span></p></div>)}</div> : <p className="text-sm text-slate-500">ไม่มีรายละเอียดค่าเดิม/ค่าใหม่ในประวัติรายการนี้</p>}
              </> : <>
                <p className="text-sm font-medium">{valueText(meta.businessName || meta.taskName || meta.label || selectedEvent.resource_id)}</p>
                {Object.keys(preview).length > 0 && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{Object.entries(preview).map(([key,value])=><div key={key} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-500">{safeLabel(key)}</p><p className="mt-1 break-words text-sm text-slate-800">{valueText(value)}</p></div>)}</div>}
                {selectedEvent.action === 'business.deleted' && <p className="text-xs text-slate-500">บันทึกว่ารายการกิจการนี้ถูกลบโดยสมาชิก</p>}
              </>}
            </div>
          </section>
        </div>;
      })()}

      {editing && <div className="fixed inset-0 z-[320] grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-member-title">
        <form onSubmit={(event) => { event.preventDefault(); void updateMember(editing, { displayName: editName.trim(), newPassword }); }} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
          <div><h2 id="edit-member-title" className="text-base font-semibold">แก้ไขสมาชิก</h2><p className="mt-1 text-xs text-slate-400">@{editing.username}</p></div>
          <label className="block text-xs font-medium text-slate-600">ชื่อที่แสดง<input required maxLength={80} value={editName} onChange={(event) => setEditName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-600">รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)<input type="password" minLength={12} maxLength={1024} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /><span className="mt-1 block font-normal text-slate-400">อย่างน้อย 12 ตัวอักษร ระบบจะออกจากระบบอุปกรณ์อื่นเมื่อรีเซ็ต</span></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">ยกเลิก</button><button type="submit" disabled={saving || !editName.trim() || (newPassword.length > 0 && newPassword.length < 12)} className="rounded-lg bg-[#172b4d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button></div>
        </form>
      </div>}
    </main>
  );
}
