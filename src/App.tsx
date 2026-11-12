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
  const current = pages.find(p => p.id === page)!;
  const choose = (id: Page) => { setPage(id); setMobileMenu(false); };
  const signOut = async () => { setBusy(true); try { await logout(); } finally { setBusy(false); } };
  const groups = ['WORKSPACE', 'OPERATIONS', 'INTELLIGENCE', 'SYSTEM'];

  return <div className="shell">
    {mobileMenu && <button className="scrim" aria-label="ปิดเมนู" onClick={() => setMobileMenu(false)} />}
    <aside className={'sidebar ' + (mobileMenu ? 'sidebar-open' : '')}>
      <div className="brand"><div className="brand-mark">M</div><div><b>MUSTANG</b><small>BUSINESS WORKSPACE</small></div><button className="close-menu" onClick={() => setMobileMenu(false)}>×</button></div>
      <div className="workspace-switch"><div className="workspace-symbol">M</div><div><b>M101 Workspace</b><small>พื้นที่ทำงานหลัก</small></div><i /></div>
      <nav>{groups.map(group => <div className="nav-group" key={group}><label>{group}</label>{pages.filter(p => p.group === group).map(p => <button key={p.id} onClick={() => choose(p.id)} className={'nav-link ' + (page === p.id ? 'selected' : '')}><span className="nav-icon">{p.icon}</span><span>{p.label}</span>{page === p.id && <i />}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="secure-note"><span>◈</span><div>พื้นที่ทำงานส่วนตัว<small>เชื่อมต่ออย่างปลอดภัย</small></div></div><div className="version">M101 <span>FOUNDATION · PHASE 01</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar">
        <div className="crumbs"><button className="menu-toggle" onClick={() => setMobileMenu(true)}>☰</button><span>Workspace</span><span className="slash">/</span><b>{current.label}</b></div>
        <div className="topbar-right"><span className="system-status"><i /> ระบบพร้อมใช้งาน</span><span className="top-divider" /><div className="avatar">{(user.displayName || user.username).slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{user.displayName || user.username}</b><small>Owner</small></div><button className="logout" onClick={signOut} disabled={busy}>{busy ? 'กำลังออก…' : 'ออกจากระบบ'}</button></div>
      </header>
      <main className="content">
        {page === 'overview' ? <CommandCenter navigate={choose} /> : <section className="module-page">
          <div className="page-title"><div><span className="eyebrow">M101 WORKSPACE</span><h1>{current.label}</h1><p>{current.desc}</p></div><span className="phase-tag">กำลังวางรากฐาน</span></div>
          <div className="module-empty"><div className="empty-icon">{current.icon}</div><h2>พื้นที่ทำงานส่วนนี้กำลังเตรียมระบบ</h2><p>ฟังก์ชันใหม่จะถูกพัฒนาตามลำดับ โดยไม่ดึงหน้าจอหรือระบบเดิมกลับมาใช้</p></div>
        </section>}
      </main>
      <footer className="footer"><span>© 2026 MUSTANG · M101</span><span>MODERN NAVY WORKSPACE</span></footer>
    </div>
  </div>;
}

function CommandCenter({ navigate }: { navigate: (id: Page) => void }) {
  const stats = [
    ['กิจการในพอร์ตโฟลิโอ', '—', 'รอเริ่มต้นทะเบียนกิจการ', '▤'],
    ['งานที่กำลังดำเนินการ', '—', 'รอเริ่มต้นระบบงาน', '☷'],
    ['กำหนดการใกล้ถึง', '—', 'รอข้อมูลกำหนดส่ง', '▦'],
    ['รายการที่ต้องตรวจสอบ', '—', 'ยังไม่มีข้อมูลให้ประเมิน', '◈'],
  ];
  return <div className="dashboard">
    <div className="page-title"><div><span className="eyebrow">EXECUTIVE OVERVIEW</span><h1>ศูนย์บัญชาการ</h1><p>ภาพรวมพอร์ตโฟลิโอและงานสำคัญของพื้นที่ทำงาน</p></div><span className="overview-tag"><i /> WORKSPACE OVERVIEW</span></div>
    <section className="hero">
      <div className="hero-copy"><span className="hero-kicker">✧ &nbsp; YOUR BUSINESS, IN ONE PLACE</span><h2>พื้นที่ทำงานใหม่<br /><em>เริ่มต้นอย่างเป็นระบบ</em></h2><p>จัดการกิจการ ความสัมพันธ์ และภาระงานสำคัญจากศูนย์กลางเดียว</p></div>
      <div className="hero-art"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="hero-core">M</div><i className="node node-a" /><i className="node node-b" /><i className="node node-c" /></div>
      <div className="hero-index">M101<small>01 / FOUNDATION</small></div>
    </section>
    <div className="section-head"><div><h2>สถานะพอร์ตโฟลิโอ</h2><p>ข้อมูลภาพรวมจะปรากฏเมื่อเริ่มเพิ่มข้อมูลเข้าสู่ระบบ</p></div><span className="live"><i /> LIVE OVERVIEW</span></div>
    <section className="stat-grid">{stats.map(([label, value, note, icon], i) => <article className="stat-card" key={label}><div className="stat-top"><span>{label}</span><b className={'stat-icon tone-' + i}>{icon}</b></div><strong>{value}</strong><small>{note}</small></article>)}</section>
    <div className="panel-grid">
      <section className="panel"><div className="panel-head"><div><h2>สิ่งที่ต้องดำเนินการ</h2><p>รายการสำคัญที่ต้องให้ความสนใจ</p></div><button onClick={() => navigate('work')}>ดูงานทั้งหมด ↗</button></div><Empty icon="☷" title="ยังไม่มีรายการดำเนินการ" text="เมื่อมีการสร้างงานหรือกำหนดภาระประจำปี รายการที่ต้องจัดการจะแสดงที่นี่" /></section>
      <section className="panel"><div className="panel-head"><div><h2>พอร์ตโฟลิโอกิจการ</h2><p>ภาพรวมหน่วยธุรกิจที่คุณดูแล</p></div><button className="square-action" onClick={() => navigate('businesses')}>↗</button></div><Empty icon="▤" title="ยังไม่มีข้อมูลกิจการ" text="ทะเบียนกิจการใหม่จะเริ่มต้นจากพื้นที่นี้" /><button className="panel-link" onClick={() => navigate('businesses')}>ไปยังพอร์ตโฟลิโอกิจการ →</button></section>
    </div>
    <section className="panel activity-panel"><div className="panel-head"><div><h2>กิจกรรมล่าสุด</h2><p>ติดตามความเคลื่อนไหวในพื้นที่ทำงาน</p></div><button onClick={() => navigate('activity')}>ดูประวัติทั้งหมด ↗</button></div><div className="activity-empty"><span>◷</span><div><b>ยังไม่มีประวัติกิจกรรม</b><small>เมื่อมีการเปลี่ยนแปลงข้อมูล ระบบจะแสดงบันทึกไว้ที่นี่</small></div></div></section>
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
