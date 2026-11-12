import { FormEvent, useEffect, useState } from 'react';

type SessionUser = { id: string; username: string; displayName?: string; role: 'admin' | 'member' };
type BootstrapMode = 'create' | 'claim-existing-owner' | 'unavailable';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapMode, setBootstrapMode] = useState<BootstrapMode>('create');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [ownerId, setOwnerId] = useState('owner');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [bootstrapError, setBootstrapError] = useState('');

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const [bootstrapResponse, sessionResponse] = await Promise.all([
          fetch('/api/auth/bootstrap-status', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }),
        ]);
        if (!bootstrapResponse.ok || !sessionResponse.ok) throw new Error('เชื่อมต่อระบบยืนยันตัวตนไม่สำเร็จ');
        const bootstrap = await bootstrapResponse.json();
        const session = await sessionResponse.json();
        if (!active) return;
        setBootstrapRequired(Boolean(bootstrap.needsBootstrap));
        setBootstrapReady(Boolean(bootstrap.bootstrapReady));
        setBootstrapMode(
          bootstrap.bootstrapMode === 'claim-existing-owner'
            ? 'claim-existing-owner'
            : bootstrap.bootstrapMode === 'unavailable' ? 'unavailable' : 'create',
        );
        setSessionUser(session.user || null);
      } catch {
        if (active) setAuthError('เชื่อมต่อระบบล็อกอินไม่สำเร็จ กรุณาโหลดหน้าใหม่');
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ID หรือรหัสผ่านไม่ถูกต้อง');
      setSessionUser(payload.user as SessionUser);
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleBootstrap = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBootstrapBusy(true);
    setBootstrapError('');
    try {
      const response = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: ownerId.trim(),
          password: ownerPassword,
          passwordConfirm: ownerPasswordConfirm,
          bootstrapKey,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error([
          payload.error || 'ตั้งค่า Owner ไม่สำเร็จ',
          payload.errorType ? `ประเภท: ${payload.errorType}` : '',
          payload.errorDetail ? `รายละเอียด: ${payload.errorDetail}` : '',
        ].filter(Boolean).join(' — '));
      }
      setBootstrapRequired(false);
      setOwnerPassword('');
      setOwnerPasswordConfirm('');
      setBootstrapKey('');
      setSessionUser(payload.user as SessionUser);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : 'ตั้งค่า Owner ไม่สำเร็จ');
    } finally {
      setBootstrapBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      setSessionUser(null);
      setUsername('');
      setPassword('');
      setAuthError('');
    }
  };

  if (!authReady) {
    return <main className="auth-screen"><p className="loading-copy">กำลังตรวจสอบการเข้าสู่ระบบ…</p></main>;
  }

  if (sessionUser) {
    return (
      <main className="new-workspace" aria-label="พื้นที่ทำงาน M101 ใหม่">
        <header className="workspace-bar">
          <span className="workspace-brand">M101</span>
          <div className="workspace-account">
            <span>{sessionUser.displayName || sessionUser.username}</span>
            <button type="button" onClick={handleLogout}>ออกจากระบบ</button>
          </div>
        </header>
        <section className="workspace-canvas" aria-label="พื้นที่เริ่มต้นว่างเปล่า" />
      </main>
    );
  }

  if (bootstrapRequired) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <h1>ตั้งค่า Owner</h1>
          <p className="auth-subtitle">สร้างบัญชีเจ้าของระบบก่อนเริ่มต้นใช้งาน</p>
          {bootstrapReady ? (
            <form onSubmit={handleBootstrap} className="auth-form">
              <input value={ownerId} onChange={(event) => setOwnerId(event.target.value)} autoComplete="username" minLength={3} maxLength={32} required placeholder="Owner ID" aria-label="Owner ID" />
              <input value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} type="password" autoComplete="new-password" minLength={11} required placeholder="รหัสผ่าน Owner" aria-label="รหัสผ่าน Owner" />
              <input value={ownerPasswordConfirm} onChange={(event) => setOwnerPasswordConfirm(event.target.value)} type="password" autoComplete="new-password" minLength={11} required placeholder="ยืนยันรหัสผ่าน Owner" aria-label="ยืนยันรหัสผ่าน Owner" />
              <input value={bootstrapKey} onChange={(event) => setBootstrapKey(event.target.value)} type="password" autoComplete="off" required placeholder="รหัสตั้งค่าครั้งแรก" aria-label="รหัสตั้งค่าครั้งแรก" />
              {bootstrapError && <p className="auth-error" role="alert">{bootstrapError}</p>}
              <button type="submit" disabled={bootstrapBusy}>{bootstrapBusy ? 'กำลังตั้งค่า…' : 'สร้างบัญชี Owner'}</button>
            </form>
          ) : (
            <p className="auth-error" role="alert">
              {bootstrapMode === 'claim-existing-owner'
                ? 'พบ Owner เดิม แต่ยังไม่ได้เปิดการตั้งค่ารหัสผ่าน'
                : 'ยังไม่ได้เปิดการสร้าง Owner ครั้งแรก กรุณาตรวจสอบ Preview Secret และ Deploy อีกครั้ง'}
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <h1>เข้าสู่ระบบ</h1>
        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="ID ผู้ใช้"
            aria-label="ID ผู้ใช้"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="รหัสผ่าน"
            aria-label="รหัสผ่าน"
          />
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          <button type="submit" disabled={authBusy}>{authBusy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
        </form>
      </section>
    </main>
  );
}
