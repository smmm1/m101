/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BusinessRecord } from './types';
import { DashboardView } from './components/DashboardView';
import { YearManageModal } from './components/YearManageModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  ImportConflictModal,
  DuplicateConflictItem,
  ConflictResolutionMode,
} from './components/ImportConflictModal';
import { ThemeProvider } from './context/ThemeContext';
import { CursorProvider } from './context/CursorContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { initCuteClickSound } from './utils/cuteAudio';
import { SmartIdleScreen } from './components/SmartIdleScreen';
import { AdminControlCenter } from './components/AdminControlCenter';
import { UserManagementPanel } from './components/UserManagementPanel';

interface SessionUser { id: string; username: string; role: 'admin' | 'member' }

function WorkspaceLoadingSkeleton({ label = 'กำลังโหลดข้อมูล…' }: { label?: string }) {
  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 sm:p-6" aria-label={label} aria-busy="true">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="space-y-2"><div className="h-4 w-36 m101-skeleton-shimmer rounded bg-slate-200" /><div className="h-3 w-24 m101-skeleton-shimmer rounded bg-slate-100" /></div><div className="h-9 w-28 m101-skeleton-shimmer rounded-xl bg-slate-100" /></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-3 w-20 m101-skeleton-shimmer rounded bg-slate-100" /><div className="h-8 w-16 m101-skeleton-shimmer rounded bg-slate-200" /><div className="h-2 w-28 m101-skeleton-shimmer rounded bg-slate-100" /></div>)}</div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-40 m101-skeleton-shimmer rounded bg-slate-200" /><div className="h-10 w-full m101-skeleton-shimmer rounded-xl bg-slate-100" />{[0,1,2,3,4].map((item) => <div key={item} className="flex gap-3 border-b border-slate-100 py-4"><div className="h-9 w-9 m101-skeleton-shimmer rounded-lg bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 m101-skeleton-shimmer rounded bg-slate-200" /><div className="h-2 w-1/4 m101-skeleton-shimmer rounded bg-slate-100" /></div></div>)}</div><div className="hidden space-y-4 rounded-2xl border border-slate-200 bg-white p-5 xl:block"><div className="h-5 w-32 m101-skeleton-shimmer rounded bg-slate-200" />{[0,1,2,3].map((item) => <div key={item} className="h-16 m101-skeleton-shimmer rounded-xl bg-slate-100" />)}</div></div>
        <p className="text-center text-xs text-slate-400">{label}</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SystemConfigProvider>
        <CursorProvider>
          <AppContent />
        </CursorProvider>
      </SystemConfigProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapRequired, setBootstrapRequired] = useState(false);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapKey, setBootstrapKey] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('owner');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapError, setBootstrapError] = useState('');
  const [bootstrapBusy, setBootstrapBusy] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataReloadKey, setDataReloadKey] = useState(0);
  const pendingDatabaseWriteRef = React.useRef(false);
  const pendingSuccessToastsRef = React.useRef<Array<{ message: string; title?: string }>>([]);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const directoryRevisionRef = React.useRef<number | null>(null);
  const lastSavedSnapshotRef = React.useRef<string | null>(null);
  const saveInFlightRef = React.useRef(false);
  const saveRequestedRef = React.useRef(false);
  const saveBlockedRef = React.useRef(false);
  const [dataSaveCycle, setDataSaveCycle] = useState(0);
  const [saveConflict, setSaveConflict] = useState<{ changedYears: string[]; availableYears: string[]; recordsByYear: Record<string, BusinessRecord[]> } | null>(null);
  const [loadingLatestAfterConflict, setLoadingLatestAfterConflict] = useState(false);
  type UndoSnapshot = { recordsByYear: Record<string, BusinessRecord[]>; availableYears: string[]; selectedYear: string };
  const undoStackRef = React.useRef<UndoSnapshot[]>([]);
  const recordsByYearRef = React.useRef<Record<string, BusinessRecord[]>>({ '69': [] });
  const availableYearsRef = React.useRef<string[]>(['69']);
  const selectedYearRef = React.useRef('69');

  // Cloudflare D1 is the source of truth. Browser storage is never imported.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');

  useEffect(() => {
    return initCuteClickSound();
  }, []);


  // Hidden owner tools require a verified server-backed admin session.
  useEffect(() => {
    const handleMobileOwnerAccess = () => {
      if (!isLoggedIn || !sessionUser || sessionUser.role !== 'admin') return;
      setAdminPanelOpen((open) => !open);
    };
    window.addEventListener('m101:mobile-owner-access', handleMobileOwnerAccess);
    return () => window.removeEventListener('m101:mobile-owner-access', handleMobileOwnerAccess);
  }, [isLoggedIn, sessionUser]);

  useEffect(() => {
    const handleOwnerShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm')) return;
      if (!isLoggedIn || !sessionUser || sessionUser.role !== 'admin') return;
      event.preventDefault();
      setAdminPanelOpen((open) => !open);
    };
    window.addEventListener('keydown', handleOwnerShortcut);
    return () => window.removeEventListener('keydown', handleOwnerShortcut);
  }, [isLoggedIn, sessionUser]);

  useEffect(() => {
    if (!adminPanelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAdminPanelOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [adminPanelOpen]);

  const [userName, setUserName] = useState<string>('ผู้ดูแลระบบ');
  const [availableYears, setAvailableYears] = useState<string[]>(['69']);
  const [selectedYear, setSelectedYear] = useState<string>('69');
  const [recordsByYear, setRecordsByYear] = useState<Record<string, BusinessRecord[]>>({ '69': [] });

  // Keep refs current so the keyboard shortcut always restores the latest UI state.
  recordsByYearRef.current = recordsByYear;
  availableYearsRef.current = availableYears;
  selectedYearRef.current = selectedYear;

  const pushUndoSnapshot = () => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-29),
      {
        recordsByYear: JSON.parse(JSON.stringify(recordsByYearRef.current)) as Record<string, BusinessRecord[]>,
        availableYears: [...availableYearsRef.current],
        selectedYear: selectedYearRef.current,
      },
    ];
  };

  // Ctrl/Cmd+Z and the toast Undo action share the same safe restore path.
  const handleUndo = () => {
    if (!isLoggedIn || !sessionUser || undoStackRef.current.length === 0) return;
    const snapshot = undoStackRef.current.pop();
    if (!snapshot) return;
    pendingDatabaseWriteRef.current = true;
    setRecordsByYear(snapshot.recordsByYear);
    setAvailableYears(snapshot.availableYears);
    setSelectedYear(snapshot.selectedYear);
    showToast('ย้อนกลับการเปลี่ยนแปลงล่าสุดแล้ว', 'Undo สำเร็จ', 'info');
  };
  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!isLoggedIn || !sessionUser || undoStackRef.current.length === 0) return;
      event.preventDefault();
      handleUndo();
    };
    window.addEventListener('keydown', handleUndoShortcut);
    return () => window.removeEventListener('keydown', handleUndoShortcut);
  }, [isLoggedIn, sessionUser]);

  // Active records for currently selected fiscal year
  const currentRecords = recordsByYear[selectedYear] || [];

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const bootstrapResponse = await fetch('/api/auth/bootstrap-status', { credentials: 'same-origin' });
        if (!bootstrapResponse.ok) throw new Error('Cloudflare API is unavailable');
        const bootstrapStatus = await bootstrapResponse.json();
        if (!active) return;
        setBootstrapRequired(Boolean(bootstrapStatus.needsBootstrap));
        setBootstrapReady(Boolean(bootstrapStatus.bootstrapReady));
        const sessionResponse = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!sessionResponse.ok) throw new Error('Cloudflare API is unavailable');
        const session = await sessionResponse.json();
        if (!active) return;
        if (session.user) setSessionUser(session.user as SessionUser);
      } catch {
        if (active) setAuthError('เชื่อมต่อระบบ Cloudflare ไม่สำเร็จ กรุณาลองใหม่');
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void initialize();
    return () => { active = false; };
  }, []);

  const handleBootstrapSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBootstrapError('');
    setBootstrapBusy(true);
    try {
      const response = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: bootstrapUsername.trim(), password: bootstrapPassword, bootstrapKey }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ตั้งค่า Owner ไม่สำเร็จ');
      setBootstrapRequired(false);
      setBootstrapPassword('');
      setBootstrapKey('');
      setSessionUser(payload.user as SessionUser);
    } catch (error) {
      setBootstrapError(error instanceof Error ? error.message : 'ตั้งค่า Owner ไม่สำเร็จ');
    } finally {
      setBootstrapBusy(false);
    }
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUsername.trim(), password: authPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ID หรือรหัสผ่านไม่ถูกต้อง');
      setSessionUser(payload.user as SessionUser);
      setUserName(payload.user?.username || 'ผู้ดูแลระบบ');
      setUserRole(payload.user?.role === 'admin' ? 'admin' : 'member');
      setAuthPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'เชื่อมต่อระบบล็อกอินไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authReady) {
    return <div className="min-h-screen grid place-items-center bg-[#f5f5f5] text-slate-600">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  }

  if (sessionUser && (!accessReady || (isLoggedIn && !dataReady))) {
    return dataError ? <div className="min-h-screen grid place-items-center bg-[#f5f5f5]"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ</h1><p className="mt-3 text-sm text-zinc-600">{dataError}</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button></div></div> : <WorkspaceLoadingSkeleton label="กำลังตรวจสอบสิทธิ์และโหลดข้อมูลจาก Cloudflare D1…" />;
  }

  if (bootstrapRequired && !sessionUser) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6fa] px-5 py-10 text-slate-900">
        <section className="w-full max-w-[380px] rounded-2xl bg-white px-6 py-8 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] sm:px-8">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-slate-400">M101 · FIRST SETUP</p>
            <h1 className="mt-3 text-xl font-semibold tracking-tight">ตั้งค่าบัญชี Owner</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">สร้างบัญชีเจ้าของระบบเพียงบัญชีเดียว ก่อนเริ่มใช้งาน M101</p>
          </div>
          {bootstrapReady ? (
            <form onSubmit={handleBootstrapSubmit} className="space-y-3">
              <input value={bootstrapUsername} onChange={(event) => setBootstrapUsername(event.target.value)} autoComplete="username" required minLength={3} maxLength={32} placeholder="Owner ID" aria-label="Owner ID" className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-slate-400" />
              <input value={bootstrapPassword} onChange={(event) => setBootstrapPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={14} placeholder="รหัสผ่าน Owner (อย่างน้อย 14 ตัว)" aria-label="รหัสผ่าน Owner" className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-slate-400" />
              <input value={bootstrapKey} onChange={(event) => setBootstrapKey(event.target.value)} type="password" autoComplete="off" required placeholder="รหัสตั้งค่าครั้งแรก" aria-label="รหัสตั้งค่าครั้งแรก" className="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-slate-400" />
              {bootstrapError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{bootstrapError}</p>}
              <button type="submit" disabled={bootstrapBusy} className="h-12 w-full rounded-lg bg-[#172b4d] text-sm font-semibold text-white disabled:opacity-60">{bootstrapBusy ? 'กำลังตั้งค่า…' : 'สร้างบัญชี Owner'}</button>
            </form>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              ฐานข้อมูลยังไม่มีบัญชี Owner แต่ยังไม่ได้ตั้งค่า <code>M101_BOOTSTRAP_KEY</code> ใน Cloudflare Pages Preview จึงยังไม่เปิดให้สร้าง Owner เพื่อป้องกันบุคคลภายนอกยึดบัญชีแรก
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!sessionUser || !isLoggedIn) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6fa] px-5 py-10 text-slate-900">
        <section aria-labelledby="m101-login-title" className="w-full max-w-[380px] rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] sm:px-8 sm:py-9">
          <h1 id="m101-login-title" className="mb-7 text-center text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <input id="m101-login-username" type="text" autoComplete="username" required value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder="ID ผู้ใช้" aria-label="ID ผู้ใช้" className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
            <input id="m101-login-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
            {authError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-700">{authError}</p>}
            <button type="submit" disabled={authBusy} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#172b4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10213d] focus:outline-none focus:ring-4 focus:ring-[#172b4d]/15 disabled:cursor-not-allowed disabled:opacity-60">
              {authBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> กำลังเข้าสู่ระบบ…</> : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f5] text-slate-900 font-body antialiased">
      <SmartIdleScreen ownerPreviewEnabled={isLoggedIn && userRole === 'admin'} />
      {adminPanelOpen && isLoggedIn && userRole === 'admin' && (
        <AdminControlCenter
          onClose={() => setAdminPanelOpen(false)}
          onNavigate={(tab) => { window.dispatchEvent(new CustomEvent('m101:owner-navigate', { detail: { tab } })); setAdminPanelOpen(false); }}
          onPreviewAfk={() => { setAdminPanelOpen(false); window.dispatchEvent(new Event('m101:owner-preview-afk')); }}
          onManageUsers={() => { setAdminPanelOpen(false); setUserManagementOpen(true); }}
        />
      )}
      {userManagementOpen && isLoggedIn && userRole === 'admin' && <UserManagementPanel onClose={() => setUserManagementOpen(false)} />}
      {saveConflict && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="m101-save-conflict-title">
          <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-lg font-bold text-amber-700" aria-hidden="true">!</span>
              <div className="min-w-0">
                <h2 id="m101-save-conflict-title" className="text-base font-semibold text-slate-900">ข้อมูลในระบบเปลี่ยนแปลงก่อนบันทึกของคุณ</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">ระบบหยุดบันทึกอัตโนมัติแล้ว ข้อมูลชุดที่คุณแก้ไขยังอยู่ในหน้านี้ แต่ยังไม่ได้บันทึก และจะไม่ถูกเขียนทับข้อมูลล่าสุดบนเซิร์ฟเวอร์</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-xs font-semibold text-amber-900">ชุดข้อมูลที่ยังไม่ได้บันทึก</p>
              {saveConflict.changedYears.length > 0 ? (
                <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                  {saveConflict.changedYears.map((year) => (
                    <li key={year} className="flex items-center justify-between gap-3">
                      <span>รอบปีบัญชี {year}</span>
                      <span className="text-xs text-amber-800">{(saveConflict.recordsByYear[year] || []).length.toLocaleString()} รายการในฉบับของคุณ</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  ไม่พบความแตกต่างของรายการในฉบับนี้เมื่อเทียบกับข้อมูลที่เคยโหลดไว้ แต่เวอร์ชันบนเซิร์ฟเวอร์เปลี่ยนไปแล้ว ระบบจึงหยุดบันทึกเพื่อให้คุณตรวจสอบข้อมูลล่าสุดก่อน
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-amber-900">ก่อนโหลดข้อมูลล่าสุด ระบบจะดาวน์โหลดฉบับที่ยังไม่บันทึกเป็นไฟล์ JSON ให้อัตโนมัติ ไฟล์สำรองอาจมีข้อมูลสำคัญและรหัสของกิจการ ควรเก็บไว้ในที่ปลอดภัย</p>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" disabled={loadingLatestAfterConflict} onClick={() => {
                const recovery = new Blob([JSON.stringify({ availableYears: saveConflict.availableYears, recordsByYear: saveConflict.recordsByYear }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(recovery);
                const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'm101-unsaved-recovery.json'; anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
              }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">ดาวน์โหลดฉบับที่ยังไม่บันทึก</button>
              <button type="button" disabled={loadingLatestAfterConflict} onClick={() => void handleLoadLatestAfterConflict()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">{loadingLatestAfterConflict ? 'กำลังสำรองและโหลดข้อมูล…' : 'สำรองฉบับนี้แล้วโหลดข้อมูลล่าสุด'}</button>
            </div>
          </section>
        </div>
      )}
      <DashboardView
        records={currentRecords}
        userName={userName}
        selectedYear={selectedYear}
        availableYears={availableYears}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onEditRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onDeleteMultiple={handleDeleteMultiple}
        onAddRecord={handleAddRecord}
        onShowToast={showToast}
        onImportRecords={(items) => processImportRecords(items, 'นำเข้าไฟล์')}
        onSelectYear={handleSelectYear}
        onOpenYearModal={() => setIsYearModalOpen(true)}
        onAddYear={(yr) => handleAddYear(yr)}
        onDeleteYear={(yr) => handleDeleteYear(yr)}
        onRestoreRecords={(newRecords) => {
          pushUndoSnapshot();
          pendingDatabaseWriteRef.current = true;
          setRecordsByYear((prev) => ({
            ...prev,
            [selectedYear]: newRecords,
          }));
        }}
        isLoggedIn={isLoggedIn}
        isAdmin={userRole === 'admin'}
        onToggleLogin={() => {
          void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
            .finally(() => {
              setSessionUser(null);
              setIsLoggedIn(false);
              setDataReady(false);
            });
        }}
      />

      {/* Year Manage Modal */}
      {isYearModalOpen && (
        <YearManageModal
          isOpen={isYearModalOpen}
          onClose={() => setIsYearModalOpen(false)}
          selectedYear={selectedYear}
          availableYears={availableYears}
          recordsByYear={recordsByYear}
          onSelectYear={handleSelectYear}
          onAddYear={handleAddYear}
          onDeleteYear={handleDeleteYear}
          isLoggedIn={isLoggedIn}
        />
      )}

      {/* Import Conflict Resolution Modal */}
      <ImportConflictModal
        isOpen={isConflictModalOpen}
        fileName={pendingImportFile}
        duplicateItems={conflictDuplicates}
        newItems={conflictNewItems}
        onResolve={handleResolveConflict}
        onClose={() => setIsConflictModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} onUndo={handleUndo} canUndo={isLoggedIn && undoStackRef.current.length > 0} />
    </div>
  );
}
