import React, { useCallback, useEffect, useState } from 'react';

type ManagedUser = {
  id: string;
  username: string;
  display_name: string;
  role: 'admin' | 'member';
  account_status: 'active' | 'suspended';
  local_password_set: number;
  created_at: string;
};

export function UserManagementPanel({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users', { credentials: 'same-origin' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดรายชื่อบัญชีไม่สำเร็จ');
      setUsers((payload.users || []) as ManagedUser[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดบัญชี');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), displayName: displayName.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'สร้างบัญชีไม่สำเร็จ');
      setUsername('');
      setDisplayName('');
      setPassword('');
      setNotice(`สร้างบัญชี ${payload.user?.username || ''} เรียบร้อยแล้ว สมาชิกสามารถเข้าสู่ระบบได้ทันที`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างบัญชีไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="m101-users-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !creating) onClose(); }}
    >
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-slate-400">OWNER · ACCOUNT CONTROL</p>
            <h2 id="m101-users-title" className="mt-1 text-xl font-semibold text-slate-900">เพิ่มบัญชีสมาชิก</h2>
            <p className="mt-1 text-sm text-slate-500">Owner กำหนด User ID ชื่อ และรหัสผ่านให้สมาชิกได้เอง</p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          <form onSubmit={createUser} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              User ID
              <input
                required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+"
                value={username} onChange={(event) => setUsername(event.target.value)}
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="เช่น somchai01"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">3–32 ตัว ใช้ภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง</span>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              ชื่อสมาชิก
              <input
                required maxLength={80} value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="ชื่อที่แสดงในระบบ"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              รหัสผ่านเริ่มต้น
              <input
                required minLength={12} maxLength={1024} type="password" autoComplete="new-password"
                value={password} onChange={(event) => setPassword(event.target.value)}
                placeholder="กำหนดรหัสผ่านอย่างน้อย 12 ตัวอักษร"
                className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
              <span className="mt-1 block text-xs font-normal text-slate-400">ระบบจัดเก็บรหัสผ่านในรูปแบบ Hash และจะไม่แสดงรหัสผ่านย้อนหลัง</span>
            </label>

            {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">{notice}</p>}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="submit" disabled={creating || !username.trim() || !displayName.trim() || password.length < 12}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#172b4d] px-5 text-sm font-semibold text-white hover:bg-[#10213d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชีสมาชิก'}
              </button>
            </div>
          </form>

          <section className="mt-7 border-t border-slate-100 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">บัญชีในระบบ <span className="font-normal text-slate-400">({users.length})</span></h3>
              <button type="button" onClick={() => void loadUsers()} disabled={loading} className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50">รีเฟรช</button>
            </div>
            {loading ? (
              <p className="py-5 text-center text-sm text-slate-500">กำลังโหลดรายชื่อ…</p>
            ) : users.length ? (
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{user.display_name} <span className="ml-1 text-xs font-normal text-slate-400">@{user.username}</span></p>
                      <p className="mt-0.5 text-xs text-slate-400">{user.role === 'admin' ? 'Owner' : 'Member'} · {new Date(user.created_at).toLocaleDateString('th-TH')}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${user.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {user.account_status === 'active' ? 'ใช้งาน' : 'ระงับ'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-5 text-center text-sm text-slate-500">ยังไม่มีบัญชีในระบบ</p>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
