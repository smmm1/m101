import { FormEvent, useEffect, useState } from 'react';
import { AdminSecurity, AnnualWork, BusinessRegistry, CommandCenter, ImportExport, RelationshipGroups } from './components/WorkspacePages';

type User = { id: string; username: string; displayName?: string; role: 'admin' | 'member' };
type Page = 'overview' | 'businesses' | 'groups' | 'work' | 'import' | 'settings';
const pages: { id: Page; label: string; group: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'ภาพรวม', group: 'WORKSPACE', icon: '▦', desc: 'ภาพรวมกิจการและงานที่ต้องติดตาม' },
  { id: 'businesses', label: 'ทะเบียนกิจการ', group: 'WORKSPACE', icon: '▤', desc: 'ข้อมูลกิจการและนิติบุคคลทั้งหมด' },
  { id: 'groups', label: 'กลุ่มกิจการ', group: 'WORKSPACE', icon: '◎', desc: 'จัดกลุ่มกิจการและความสัมพันธ์' },
  { id: 'work', label: 'งานประจำปี', group: 'OPERATIONS', icon: '☷', desc: 'จัดการงานและกำหนดส่งรายกิจการ' },
  { id: 'import', label: 'นำเข้า / ส่งออก', group: 'OPERATIONS', icon: '⇅', desc: 'นำเข้าและส่งออกข้อมูลทะเบียนกิจการ' },
  { id: 'settings', label: 'ผู้ดูแลและความปลอดภัย', group: 'SYSTEM', icon: '⚙', desc: 'จัดการบัญชีและสิทธิ์ในพื้นที่ทำงาน' },
];

function Workspace({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const [page, setPage] = useState<Page>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('69');
  const [availableYears, setAvailableYears] = useState<string[]>(['69']);
  useEffect(() => { let active = true; fetch('/api/directory?year=' + encodeURIComponent(year), { credentials: 'same-origin', cache: 'no-store' }).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'โหลดรอบปีไม่สำเร็จ'); return data; }).then(data => { if (active && Array.isArray(data.availableYears) && data.availableYears.length) setAvailableYears(data.availableYears); }).catch(() => {}); return () => { active = false; }; }, [year]);
  const current = pages.find(p => p.id === page)!;
  const choose = (id: Page) => { setPage(id); setMobileMenu(false); };
  const signOut = async () => { setBusy(true); try { await logout(); } finally { setBusy(false); } };
  const groups = ['WORKSPACE', 'OPERATIONS', 'INTELLIGENCE', 'SYSTEM'];
  return <div className="shell">
    {mobileMenu && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobileMenu(false)} />}
    <aside className={'sidebar ' + (mobileMenu ? 'sidebar-open' : '')}>
      <div className="brand"><div className="brand-mark">M</div><div><b>MUSTANG</b><small>BUSINESS WORKSPACE</small></div><button className="close-menu" onClick={() => setMobileMenu(false)}>×</button></div>
      <nav>{groups.map(group => <div className="nav-group" key={group}><label>{group}</label>{pages.filter(p => p.group === group).map(p => <button key={p.id} onClick={() => choose(p.id)} className={'nav-link ' + (page === p.id ? 'selected' : '')}><span className="nav-icon">{p.icon}</span><span>{p.label}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><span>◈</span><div>พื้นที่ทำงานส่วนตัว<small>เชื่อมต่ออย่างปลอดภัย</small></div></div><div className="version">M101 <span>MODERN NAVY</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button className="menu-toggle" onClick={() => setMobileMenu(true)}>☰</button>
        <div className="global-search"><span>⌕</span><input aria-label="ค้นหาใน M101" placeholder="ค้นหากิจการ งาน หรือเอกสาร..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="topbar-right"><label className="topbar-year">ปีบัญชี <select value={year} onChange={e => setYear(e.target.value)}>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select></label><div className="avatar">{(user.displayName || user.username).slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{user.displayName || user.username}</b><small>{user.role === 'admin' ? 'Owner' : 'Member'}</small></div><button className="logout" onClick={signOut} disabled={busy}>{busy ? 'กำลังออก…' : '⌄'}</button></div>
      </header>
      <main className="content">
        {page === 'overview' ? <CommandCenter navigate={choose} year={year} /> : page === 'businesses' ? <BusinessRegistry year={year} globalSearch={search} onYearChange={setYear} onOpenImport={() => choose('import')} /> : page === 'groups' ? <RelationshipGroups /> : page === 'work' ? <AnnualWork year={year} /> : page === 'settings' ? <AdminSecurity /> : page === 'import' ? <ImportExport year={year} /> : <section className="module-page">
          <div className="page-title"><div><h1>{current.label}</h1><p>{current.desc}</p></div><span className="phase-tag">M101 Workspace</span></div>
          <div className="module-empty"><div className="empty-icon">{current.icon}</div><h2>{page === 'import' ? 'เครื่องมือนำเข้าและส่งออก' : 'การจัดการ Owner และความปลอดภัย'}</h2><p>{page === 'import' ? 'การส่งออก CSV พร้อมใช้งานจากหน้าทะเบียนกิจการ ส่วนตัวช่วยจับคู่ไฟล์ Excel จะเชื่อมต่อในขั้นถัดไป' : 'บัญชี Owner และสิทธิ์สมาชิกจะเชื่อมกับระบบจัดการบัญชีในขั้นถัดไป'}</p>{page === 'import' && <button className="m101-button" onClick={() => choose('businesses')}>ไปยังทะเบียนกิจการ</button>}</div>
        </section>}
      </main>
    </div>
  </div>;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapMode, setBootstrapMode] = useState<'create' | 'claim-existing-owner' | 'unavailable'>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ownerId, setOwnerId] = useState('owner');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [b, s] = await Promise.all([
          fetch('/api/auth/bootstrap-status', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        if (!b.ok || !s.ok) throw new Error();
        const bootstrap = await b.json(); const session = await s.json();
        if (!active) return;
        setBootstrapRequired(Boolean(bootstrap.needsBootstrap));
        setBootstrapReady(Boolean(bootstrap.bootstrapReady));
        setBootstrapMode(bootstrap.bootstrapMode === 'claim-existing-owner' ? 'claim-existing-owner' : bootstrap.bootstrapMode === 'unavailable' ? 'unavailable' : 'create');
        setUser(session.user || null);
      } catch { if (active) setError('เชื่อมต่อระบบล็อกอินไม่สำเร็จ กรุณาโหลดหน้าใหม่'); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ID หรือรหัสผ่านไม่ถูกต้อง');
      setUser(payload.user as User); setPassword('');
    } catch (e) { setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  const bootstrap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBootstrapBusy(true); setBootstrapError('');
    try {
      const response = await fetch('/api/auth/bootstrap', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: ownerId.trim(), password: ownerPassword, passwordConfirm: ownerPasswordConfirm, bootstrapKey }) });
      const payload = await response.json();
      if (!response.ok) throw new Error([payload.error || 'ตั้งค่า Owner ไม่สำเร็จ', payload.errorType ? 'ประเภท: ' + payload.errorType : '', payload.errorDetail ? 'รายละเอียด: ' + payload.errorDetail : ''].filter(Boolean).join(' — '));
      setBootstrapRequired(false); setOwnerPassword(''); setOwnerPasswordConfirm(''); setBootstrapKey(''); setUser(payload.user as User);
    } catch (e) { setBootstrapError(e instanceof Error ? e.message : 'ตั้งค่า Owner ไม่สำเร็จ'); }
    finally { setBootstrapBusy(false); }
  };
  const logout = async () => { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { setUser(null); setUsername(''); setPassword(''); setError(''); } };

  if (!ready) return <main className="auth-screen"><p className="loading-copy">กำลังตรวจสอบการเข้าสู่ระบบ…</p></main>;
  if (user) return <Workspace user={user} logout={logout} />;
  if (bootstrapRequired) return <main className="auth-screen"><section className="auth-panel"><div className="auth-mark">M</div><div className="auth-eyebrow">MUSTANG WORKSPACE</div><h1>ตั้งค่า Owner</h1><p className="auth-subtitle">สร้างบัญชีเจ้าของระบบก่อนเริ่มต้นใช้งาน</p>{bootstrapReady ? <form onSubmit={bootstrap} className="auth-form"><input value={ownerId} onChange={e => setOwnerId(e.target.value)} autoComplete="username" minLength={3} maxLength={32} required placeholder="Owner ID" /><input value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} type="password" autoComplete="new-password" minLength={11} required placeholder="รหัสผ่าน Owner" /><input value={ownerPasswordConfirm} onChange={e => setOwnerPasswordConfirm(e.target.value)} type="password" autoComplete="new-password" minLength={11} required placeholder="ยืนยันรหัสผ่าน Owner" /><input value={bootstrapKey} onChange={e => setBootstrapKey(e.target.value)} type="password" autoComplete="off" required placeholder="รหัสตั้งค่าครั้งแรก" />{bootstrapError && <p className="auth-error" role="alert">{bootstrapError}</p>}<button type="submit" disabled={bootstrapBusy}>{bootstrapBusy ? 'กำลังตั้งค่า…' : 'สร้างบัญชี Owner'}</button></form> : <p className="auth-error" role="alert">{bootstrapMode === 'claim-existing-owner' ? 'พบ Owner เดิม แต่ยังไม่ได้เปิดการตั้งค่ารหัสผ่าน' : 'ยังไม่ได้เปิดการสร้าง Owner ครั้งแรก กรุณาตรวจสอบ Preview Secret และ Deploy อีกครั้ง'}</p>}</section></main>;
  return <main className="auth-screen"><section className="auth-panel" aria-label="เข้าสู่ระบบ M101"><form onSubmit={login} className="auth-form"><input type="text" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} placeholder="ID ผู้ใช้" aria-label="ID ผู้ใช้" /><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" />{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button></form></section></main>;
}
