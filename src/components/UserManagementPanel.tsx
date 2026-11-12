import React, { useCallback, useEffect, useState } from 'react';
type ManagedUser = { id: string; username: string; display_name: string; role: 'admin' | 'member'; account_status: 'active' | 'suspended'; local_password_set: number; created_at: string };
type Draft = { username: string; displayName: string; accountStatus: 'active' | 'suspended'; newPassword: string };

export function UserManagementPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      const rows = (payload.users || []) as ManagedUser[];
      setUsers(rows);
      setDrafts(Object.fromEntries(rows.map((user) => [user.id, { username: user.username, displayName: user.display_name, accountStatus: user.account_status, newPassword: '' }])));
    } catch (err) { setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadUsers(); }, [loadUsers]);
  const updateDraft = (id: string, patch: Partial<Draft>) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setCreating(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/users', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), displayName: displayName.trim(), password }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'สร้างบัญชีไม่สำเร็จ');
      setUsername(''); setDisplayName(''); setPassword(''); setNotice('สร้างบัญชีสมาชิกเรียบร้อยแล้ว'); await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ'); }
    finally { setCreating(false); }
  };
  const saveUser = async (id: string) => {
    const draft = drafts[id]; if (!draft) return;
    setBusyId(id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(id), { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'บันทึกบัญชีไม่สำเร็จ');
      setNotice('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว'); await loadUsers();
    } catch (err) { setError(err instanceof Error ? err.message : 'บันทึกบัญชีไม่สำเร็จ'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="m101-users-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div><p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">OWNER · ACCOUNT CONTROL</p><h2 id="m101-users-title" className="mt-1 text-xl font-semibold text-slate-900">จัดการบัญชีผู้ใช้</h2><p className="mt-1 text-sm text-slate-500">สร้าง ID และกำหนดรหัสผ่านให้สมาชิก ควบคุมสถานะได้จากที่นี่</p></div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </header>
        <div className="overflow-y-auto p-5 sm:p-7">
          <form onSubmit={createUser} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">สร้างบัญชีสมาชิก</h3><span className="text-xs text-slate-500">Owner ตั้ง ID เอง</span></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium text-slate-600">User ID<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="เช่น somchai01" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
              <label className="block text-xs font-medium text-slate-600">ชื่อที่แสดง<input required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ชื่อสมาชิก" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
              <label className="block text-xs font-medium text-slate-600">รหัสผ่านเริ่มต้น<input required minLength={12} maxLength={1024} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="อย่างน้อย 12 ตัว" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400" /></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="submit" disabled={creating} className="rounded-lg bg-[#172b4d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10213d] disabled:opacity-50">{creating ? 'กำลังสร้าง…' : 'สร้างบัญชี'}</button></div>
          </form>
          {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</p>}
          <div className="mt-6 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">บัญชีในระบบ <span className="font-normal text-slate-400">({users.length})</span></h3><button type="button" onClick={() => void loadUsers()} className="text-xs font-medium text-slate-500 hover:text-slate-900">รีเฟรช</button></div>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">กำลังโหลดบัญชี…</p> : <div className="mt-3 space-y-3">
            {users.map((user) => user.role === 'admin' ? <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"><div><div className="text-sm font-semibold text-slate-900">{user.username} <span className="ml-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">OWNER</span></div><div className="mt-1 text-xs text-slate-500">บัญชีเจ้าของระบบ · ป้องกันการแก้ไขจากรายการสมาชิก</div></div><span className="text-xs font-medium text-emerald-700">บัญชีหลัก</span></div> : <div key={user.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-slate-500">สมาชิก · {user.account_status === 'suspended' ? 'ระงับอยู่' : Number(user.local_password_set) !== 1 ? 'รอตั้งรหัสผ่าน' : 'เปิดใช้งาน'}</span><span className="text-[11px] text-slate-400">สร้าง {new Date(user.created_at).toLocaleDateString('th-TH')}</span></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">User ID<input value={drafts[user.id]?.username || ''} onChange={(e) => updateDraft(user.id, { username: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
                <label className="block text-xs font-medium text-slate-600">ชื่อที่แสดง<input value={drafts[user.id]?.displayName || ''} onChange={(e) => updateDraft(user.id, { displayName: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
                <label className="block text-xs font-medium text-slate-600">รหัสผ่านใหม่ <span className="font-normal text-slate-400">(เว้นว่างหากไม่เปลี่ยน)</span><input type="password" autoComplete="new-password" value={drafts[user.id]?.newPassword || ''} onChange={(e) => updateDraft(user.id, { newPassword: e.target.value })} placeholder="อย่างน้อย 12 ตัว" className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
                <label className="block text-xs font-medium text-slate-600">สถานะบัญชี<select value={drafts[user.id]?.accountStatus || 'active'} onChange={(e) => updateDraft(user.id, { accountStatus: e.target.value as Draft['accountStatus'] })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"><option value="active">เปิดใช้งาน</option><option value="suspended">ระงับบัญชี</option></select></label>
              </div>
              <div className="mt-3 flex justify-end"><button type="button" onClick={() => void saveUser(user.id)} disabled={busyId === user.id} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busyId === user.id ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}</button></div>
            </div>)}
            {!users.length && <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">ยังไม่มีบัญชีสมาชิก</p>}
          </div>}
          <p className="mt-5 text-xs leading-5 text-slate-400">รหัสผ่านถูกเก็บเป็น Hash ไม่แสดงกลับหลังบันทึก การรีเซ็ตรหัสผ่านหรือระงับบัญชีจะยกเลิก Session เดิมทันที</p>
        </div>
      </section>
    </div>
  );
}
