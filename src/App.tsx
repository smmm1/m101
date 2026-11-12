import { FormEvent, useEffect, useState } from 'react';

type User = { id: string; username: string; displayName?: string; role: 'admin' | 'member' };
type Page = 'overview' | 'businesses' | 'work' | 'calendar' | 'documents' | 'reports' | 'activity' | 'settings';
const pages: { id: Page; label: string; group: string; icon: string; desc: string }[] = [
  { id: 'overview', label: 'ศูนย์บัญชาการ', group: 'WORKSPACE', icon: '▦', desc: 'ภาพรวมสถานะและสิ่งที่ต้องจัดการในพอร์ตโฟลิโอ' },
  { id: 'businesses', label: 'พอร์ตโฟลิโอกิจการ', group: 'WORKSPACE', icon: '▤', desc: 'จัดการข้อมูลนิติบุคคลและกิจการในพื้นที่ทำงาน' },
  { id: 'work', label: 'งานและภาระประจำปี', group: 'OPERATIONS', icon: '☷', desc: 'วางแผน ติดตาม และตรวจสอบงานของแต่ละกิจการ' },
  { id: 'calendar', label: 'ปฏิทินกำหนดการ', group: 'OPERATIONS', icon: '▦', desc: 'กำหนดส่งและเหตุการณ์สำคัญตามช่วงเวลา' },
  { id: 'documents', label: 'คลังเอกสาร', group: 'OPERATIONS', icon: '▱', desc: 'เอกสารและหลักฐานที่เชื่อมโยงกับกิจการและงาน' },
  { id: 'reports', label: 'รายงานและข้อมูลเชิงลึก', group: 'INTELLIGENCE', icon: '▥', desc: 'วิเคราะห์ภาพรวมและติดตามผลการดำเนินงาน' },
  { id: 'activity', label: 'ประวัติการทำงาน', group: 'INTELLIGENCE', icon: '◷', desc: 'ตรวจสอบเหตุการณ์และการเปลี่ยนแปลงในระบบ' },
  { id: 'settings', label: 'ตั้งค่าพื้นที่ทำงาน', group: 'SYSTEM', icon: '⚙', desc: 'จัดการสมาชิก สิทธิ์ และการตั้งค่าระบบ' },
];

function Workspace({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const [page, setPage] = useState<Page>('overview');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const current = pages.find(p => p.id === page)!;
  const choose = (id: Page) => { setPage(id); setMobileMenu(false); };
  const signOut = async () => { setBusy(true); try { await logout(); } finally { setBusy(false); } };
  const groups = ['WORKSPACE', 'OPERATIONS', 'INTELLIGENCE', 'SYSTEM'];
  return <div className="shell">
    {mobileMenu && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobileMenu(false)} />}
    <aside className={'sidebar ' + (mobileMenu ? 'sidebar-open' : '')}>
      <div className="brand"><div className="brand-mark">M</div><div><b>MUSTANG</b><small>BUSINESS WORKSPACE</small></div><button className="close-menu" onClick={() => setMobileMenu(false)}>×</button></div>
      <nav>{groups.map(group => <div className="nav-group" key={group}><label>{group === 'WORKSPACE' ? 'MENU' : group === 'OPERATIONS' ? 'OPERATIONS' : group === 'INTELLIGENCE' ? 'INSIGHTS' : 'OTHERS'}</label>{pages.filter(p => p.group === group).map(p => <button key={p.id} onClick={() => choose(p.id)} className={'nav-link ' + (page === p.id ? 'selected' : '')}><span className="nav-icon">{p.icon}</span><span>{p.label}</span></button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><span>◈</span><div>พื้นที่ทำงานส่วนตัว<small>เชื่อมต่ออย่างปลอดภัย</small></div></div><div className="version">M101 <span>BUSINESS WORKSPACE</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <button className="menu-toggle" onClick={() => setMobileMenu(true)}>☰</button>
        <div className="global-search"><span>⌕</span><input aria-label="ค้นหาใน M101" placeholder="ค้นหากิจการ งาน หรือเอกสาร..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="topbar-right"><div className="avatar">{(user.displayName || user.username).slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{user.displayName || user.username}</b><small>Owner</small></div><button className="logout" onClick={signOut} disabled={busy}>{busy ? 'กำลังออก…' : '⌄'}</button><button className="notice" aria-label="การแจ้งเตือน">♧<i /></button></div>
      </header>
      <main className="content">
        {page === 'overview' ? <CommandCenter navigate={choose} /> : <section className="module-page">
          <div className="page-title"><div><h1>{current.label}</h1><p>{current.desc}</p></div><span className="phase-tag">M101 Workspace</span></div>
          <div className="module-empty"><div className="empty-icon">{current.icon}</div><h2>พื้นที่ทำงานส่วนนี้กำลังเตรียมระบบ</h2><p>หน้าจอนี้จะเชื่อมกับข้อมูลและความสามารถเดิมของ M101 ในเฟสถัดไป</p></div>
        </section>}
      </main>
    </div>
  </div>;
}

function CommandCenter({ navigate }: { navigate: (id: Page) => void }) {
  return <div className="dashboard">
    <div className="page-title"><div><h1>Dashboard</h1><p>ภาพรวมการดำเนินงานของกิจการทั้งหมด</p></div><div className="period-select">ภาพรวมทั้งหมด <span>⌄</span></div></div>
    <div className="dashboard-top">
      <section className="dash-panel revenue-panel">
        <div className="dash-panel-head"><div><h2>ภาพรวมกิจการ</h2><p>สถานะกิจการในพอร์ตโฟลิโอ</p></div><button onClick={() => navigate('businesses')}>ดูทะเบียนกิจการ</button></div>
        <div className="metric-value">— <small>กิจการทั้งหมด</small></div>
        <div className="metric-note">ยังไม่มีข้อมูลสำหรับสรุปผล</div>
        <div className="bar-chart empty-chart"><div className="chart-gridlines"><i/><i/><i/><i/></div><div className="chart-empty-label">ข้อมูลกิจการจะแสดงในส่วนนี้เมื่อเชื่อมต่อข้อมูลจริง</div><div className="bar-axis">{Array.from({length:12},(_,i)=><small key={i}>{String(i+1).padStart(2,'0')}</small>)}</div></div>
        <div className="chart-legend"><span><i className="blue-dot"/> กิจการที่ดำเนินการ</span><span><i className="gray-dot"/> รอตรวจสอบ</span></div>
      </section>
      <section className="dash-panel order-time-panel">
        <div className="dash-panel-head"><div><h2>สถานะงานประจำปี</h2><p>ความคืบหน้าของงานทั้งหมด</p></div><button onClick={() => navigate('work')}>ดูงานทั้งหมด</button></div>
        <div className="donut-area"><div className="donut"><div className="donut-hole"><b>—</b><small>ไม่มีข้อมูล</small></div></div></div>
        <div className="donut-legend"><span><i className="blue-dot"/> เสร็จแล้ว <small>—</small></span><span><i className="purple-dot"/> กำลังทำ <small>—</small></span><span><i className="light-dot"/> ยังไม่เริ่ม <small>—</small></span></div>
      </section>
    </div>
    <div className="dashboard-bottom">
      <section className="dash-panel rating-panel">
        <div className="dash-panel-head"><div><h2>ภาพรวมการปฏิบัติงาน</h2><p>ตัวชี้วัดจากข้อมูลในระบบ</p></div></div>
        <div className="ring-metrics"><div className="ring ring-one"><b>—</b><small>งานเสร็จ</small></div><div className="ring ring-two"><b>—</b><small>ตรงเวลา</small></div><div className="ring ring-three"><b>—</b><small>รอตรวจสอบ</small></div></div>
      </section>
      <section className="dash-panel most-panel">
        <div className="dash-panel-head"><div><h2>กิจการที่ต้องติดตาม</h2><p>รายการสำคัญที่ต้องดำเนินการ</p></div><button onClick={() => navigate('businesses')}>ดูทั้งหมด</button></div>
        <div className="empty-list"><span>▤</span><div><b>ยังไม่มีรายการกิจการ</b><small>กิจการที่ต้องติดตามจะแสดงที่นี่</small></div></div>
        <div className="empty-list"><span>☷</span><div><b>ยังไม่มีงานที่ต้องติดตาม</b><small>งานใกล้ครบกำหนดจะแสดงที่นี่</small></div></div>
        <div className="empty-list"><span>◷</span><div><b>ยังไม่มีกำหนดการใกล้ถึง</b><small>กำหนดส่งสำคัญจะแสดงที่นี่</small></div></div>
        <button className="text-action" onClick={() => navigate('work')}>ไปยังงานประจำปี →</button>
      </section>
      <section className="dash-panel order-panel">
        <div className="dash-panel-head"><div><h2>แนวโน้มการดำเนินงาน</h2><p>สรุปตามช่วงเวลา</p></div><button onClick={() => navigate('reports')}>ดูรายงาน</button></div>
        <div className="line-chart empty-line"><div className="line-grid"><i/><i/><i/><i/></div><div className="chart-empty-label">กราฟจะแสดงเมื่อมีข้อมูลเพียงพอ</div><div className="line-labels"><span>01</span><span>02</span><span>03</span><span>04</span><span>05</span><span>06</span></div></div>
        <div className="chart-legend"><span><i className="blue-dot"/> ช่วงเวลาปัจจุบัน</span><span><i className="gray-dot"/> ช่วงเวลาก่อนหน้า</span></div>
      </section>
    </div>
  </div>;
}
function Empty({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="empty"><span>{icon}</span><b>{title}</b><p>{text}</p></div>;
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
  return <main className="auth-screen"><section className="auth-panel"><div className="auth-mark">M</div><div className="auth-eyebrow">MUSTANG WORKSPACE</div><h1>เข้าสู่ระบบ</h1><form onSubmit={login} className="auth-form"><input type="text" autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} placeholder="ID ผู้ใช้" /><input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="รหัสผ่าน" />{error && <p className="auth-error" role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button></form><div className="auth-footnote">◈ &nbsp; SECURE WORKSPACE ACCESS</div></section></main>;
}
