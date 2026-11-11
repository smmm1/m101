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
  const [accessReady, setAccessReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  const [authPin, setAuthPin] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [pinSetupValue, setPinSetupValue] = useState('');
  const [pinSetupConfirm, setPinSetupConfirm] = useState('');
  const [pinSetupError, setPinSetupError] = useState('');
  const [pinSetupBusy, setPinSetupBusy] = useState(false);
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
  const [isVisitor, setIsVisitor] = useState(false);

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

  useEffect(() => {
    let active = true;
    if (!sessionUser) {
      setPinEnabled(false);
      return () => { active = false; };
    }
    fetch('/api/auth/pin/status', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'PIN status unavailable');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setPinEnabled(Boolean(payload.enabled));
      })
      .catch(() => {
        if (active) setPinEnabled(false);
      });
    return () => { active = false; };
  }, [sessionUser]);

  useEffect(() => {
    let active = true;
    if (!sessionUser) {
      setIsLoggedIn(false);
      setUserRole('member');
      setAccessReady(true);
      setDataReady(false);
      directoryRevisionRef.current = null;
      lastSavedSnapshotRef.current = null;
      saveBlockedRef.current = false;
      saveRequestedRef.current = false;
      return () => { active = false; };
    }

    setAccessReady(false);
    setDataReady(false);
    setDataError('');
    fetch('/api/data', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'โหลดข้อมูลจาก Cloudflare D1 ไม่สำเร็จ');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const nextRecords = payload.recordsByYear && Object.keys(payload.recordsByYear).length
          ? payload.recordsByYear as Record<string, BusinessRecord[]>
          : { '69': [] };
        const years = Array.isArray(payload.availableYears) && payload.availableYears.length
          ? payload.availableYears.map((year: string) => year === '2569' ? '69' : String(year))
          : Object.keys(nextRecords);
        setRecordsByYear(nextRecords);
        setAvailableYears(years.length ? years : ['69']);
        directoryRevisionRef.current = Number.isSafeInteger(Number(payload.directoryRevision)) ? Number(payload.directoryRevision) : null;
        lastSavedSnapshotRef.current = JSON.stringify({ availableYears: years.length ? years : ['69'], recordsByYear: nextRecords });
        saveBlockedRef.current = false;
        saveRequestedRef.current = false;
        setSaveConflict(null);
        setLoadingLatestAfterConflict(false);
        undoStackRef.current = [];
        setSelectedYear((current) => years.includes(current) ? current : (years[0] || '69'));
        setUserName(sessionUser.username || 'ผู้ดูแลระบบ');
        setUserRole(sessionUser.role === 'admin' ? 'admin' : 'member');
        setIsLoggedIn(true);
        setAccessReady(true);
        setDataReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : 'โหลดข้อมูลจาก Cloudflare D1 ไม่สำเร็จ');
        setAccessReady(true);
        setDataReady(false);
        if (error instanceof Error && error.message.includes('401')) setSessionUser(null);
      });
    return () => { active = false; };
  }, [sessionUser, dataReloadKey]);

  useEffect(() => {
    let active = true;
    if (!isVisitor || sessionUser) return () => { active = false; };
    setDataReady(false);
    setDataError('');
    fetch('/api/public/data', { credentials: 'same-origin' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'โหลดข้อมูลสาธารณะไม่สำเร็จ');
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        const nextRecords = payload.recordsByYear || {};
        const years = payload.availableYears?.length ? payload.availableYears : Object.keys(nextRecords);
        setRecordsByYear(nextRecords);
        setAvailableYears(years.length ? years : ['69']);
        directoryRevisionRef.current = null;
        lastSavedSnapshotRef.current = null;
        undoStackRef.current = [];
        setSelectedYear((current) => years.includes(current) ? current : (years[0] || '69'));
        setUserName('ผู้เยี่ยมชม');
        setDataReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : 'โหลดข้อมูลสาธารณะไม่สำเร็จ');
        setDataReady(false);
      });
    return () => { active = false; };
  }, [isVisitor, sessionUser, dataReloadKey]);

  // Save only against the exact D1 snapshot revision loaded by this client.
  // Requests are serialized; a stale snapshot is blocked rather than auto-overwritten.
  useEffect(() => {
    if (!dataReady || !isLoggedIn || !sessionUser || saveBlockedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (saveBlockedRef.current) return;
      if (saveInFlightRef.current) {
        saveRequestedRef.current = true;
        return;
      }
      const snapshotKey = JSON.stringify({ availableYears, recordsByYear });
      if (snapshotKey === lastSavedSnapshotRef.current) {
        pendingDatabaseWriteRef.current = false;
        return;
      }
      const expectedDirectoryRevision = directoryRevisionRef.current;
      if (expectedDirectoryRevision === null) {
        saveBlockedRef.current = true;
        pendingDatabaseWriteRef.current = false;
        showToast('ไม่พบเวอร์ชันข้อมูลจากเซิร์ฟเวอร์ จึงหยุดบันทึกเพื่อป้องกันข้อมูลสูญหาย กรุณาโหลดข้อมูลใหม่', 'ยังไม่ได้บันทึก', 'error');
        return;
      }

      saveInFlightRef.current = true;
      void (async () => {
        try {
          const response = await fetch('/api/data', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ availableYears, recordsByYear, expectedDirectoryRevision }),
          });
          const payload = await response.json();
          if (response.status === 409 || payload.conflict) {
            saveBlockedRef.current = true;
            pendingDatabaseWriteRef.current = false;
            pendingSuccessToastsRef.current = [];
            let baseline: { availableYears?: string[]; recordsByYear?: Record<string, BusinessRecord[]> } = {};
            try { baseline = lastSavedSnapshotRef.current ? JSON.parse(lastSavedSnapshotRef.current) : {}; } catch { baseline = {}; }
            const baselineRecords = baseline.recordsByYear || {};
            const baselineYears = baseline.availableYears || [];
            // Capture the latest React state, including edits made while this request was in flight.
            const unsavedRecords = recordsByYearRef.current;
            const unsavedYears = availableYearsRef.current;
            const changedYears = Array.from(new Set([
              ...Object.keys(baselineRecords), ...Object.keys(unsavedRecords), ...baselineYears, ...unsavedYears,
            ])).filter((year) => JSON.stringify(baselineRecords[year] || []) !== JSON.stringify(unsavedRecords[year] || []) || baselineYears.includes(year) !== unsavedYears.includes(year));
            setSaveConflict({
              changedYears,
              availableYears: [...unsavedYears],
              recordsByYear: JSON.parse(JSON.stringify(unsavedRecords)) as Record<string, BusinessRecord[]>,
            });
            showToast(payload.error || 'ข้อมูลถูกแก้ไขจากอุปกรณ์อื่น กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกต่อ', 'พบข้อมูลชนกัน — ยังไม่ได้บันทึก', 'error');
            return;
          }
          if (!response.ok) throw new Error(payload.error || 'บันทึก Cloudflare D1 ไม่สำเร็จ');
          directoryRevisionRef.current = Number(payload.directoryRevision);
          lastSavedSnapshotRef.current = snapshotKey;
          pendingDatabaseWriteRef.current = false;
          const queued = pendingSuccessToastsRef.current.splice(0);
          queued.forEach((item) => showToast(item.message, item.title, 'success'));
        } catch (error) {
          pendingDatabaseWriteRef.current = false;
          pendingSuccessToastsRef.current = [];
          showToast(
            error instanceof Error ? `บันทึก Cloudflare D1 ไม่สำเร็จ: ${error.message}` : 'บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ',
            'ข้อมูลยังไม่ซิงก์',
            'error'
          );
        } finally {
          saveInFlightRef.current = false;
          if (saveRequestedRef.current && !saveBlockedRef.current) {
            saveRequestedRef.current = false;
            setDataSaveCycle((cycle) => cycle + 1);
          }
        }
      })();
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dataReady, isLoggedIn, sessionUser, recordsByYear, availableYears, dataSaveCycle]);

  // Modals state
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);

  // Import Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState('');
  const [conflictDuplicates, setConflictDuplicates] = useState<DuplicateConflictItem[]>([]);
  const [conflictNewItems, setConflictNewItems] = useState<Partial<BusinessRecord>[]>([]);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    message: string,
    title?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    if (type === 'success' && pendingDatabaseWriteRef.current) {
      pendingSuccessToastsRef.current.push({ message, title });
      return;
    }
    const id = `${Date.now()}-${Math.random()}`;
    setToasts([{ id, title, message, type }]);
    const timeout = setTimeout(() => {
      handleDismissToast(id);
    }, 3000);
    return () => clearTimeout(timeout);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!saveConflict) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'ยังมีข้อมูลที่ไม่ได้บันทึก';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [saveConflict]);

  const handleLoadLatestAfterConflict = async () => {
    if (!saveConflict || loadingLatestAfterConflict) return;
    setLoadingLatestAfterConflict(true);
    try {
      // Download the unsaved local snapshot before replacing the in-memory data.
      const recovery = new Blob([JSON.stringify({
        exportedAt: new Date().toISOString(),
        purpose: 'M101 recovery copy of changes that were not saved because the server snapshot changed.',
        availableYears: saveConflict.availableYears,
        recordsByYear: saveConflict.recordsByYear,
      }, null, 2)], { type: 'application/json' });
      const recoveryUrl = URL.createObjectURL(recovery);
      const anchor = document.createElement('a');
      anchor.href = recoveryUrl;
      anchor.download = `m101-unsaved-recovery-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(recoveryUrl), 1000);

      const response = await fetch('/api/data', { credentials: 'same-origin', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'โหลดข้อมูลล่าสุดไม่สำเร็จ');
      const latestRecords = payload.recordsByYear && Object.keys(payload.recordsByYear).length
        ? payload.recordsByYear as Record<string, BusinessRecord[]>
        : { '69': [] };
      const latestYears = Array.isArray(payload.availableYears) && payload.availableYears.length
        ? payload.availableYears.map((year: string) => year === '2569' ? '69' : String(year))
        : Object.keys(latestRecords);
      const normalizedYears = latestYears.length ? latestYears : ['69'];
      directoryRevisionRef.current = Number.isSafeInteger(Number(payload.directoryRevision)) ? Number(payload.directoryRevision) : null;
      lastSavedSnapshotRef.current = JSON.stringify({ availableYears: normalizedYears, recordsByYear: latestRecords });
      saveBlockedRef.current = false;
      saveRequestedRef.current = false;
      undoStackRef.current = [];
      setRecordsByYear(latestRecords);
      setAvailableYears(normalizedYears);
      setSelectedYear((current) => normalizedYears.includes(current) ? current : (normalizedYears[0] || '69'));
      setSaveConflict(null);
      showToast('โหลดข้อมูลล่าสุดแล้ว และดาวน์โหลดฉบับที่ยังไม่บันทึกไว้ให้แล้ว', 'ซิงก์ข้อมูลสำเร็จ', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'โหลดข้อมูลล่าสุดไม่สำเร็จ', 'ยังไม่ได้โหลดข้อมูล', 'error');
    } finally {
      setLoadingLatestAfterConflict(false);
    }
  };

  // Year Handlers
  const handleSelectYear = (year: string) => {
    setSelectedYear(year);
    if (!recordsByYear[year]) {
      setRecordsByYear((prev) => ({
        ...prev,
        [year]: [],
      }));
    }
    showToast(`สลับไปยังรอบปีบัญชี ${year}`, 'เปลี่ยนรอบปี');
  };

  const handleAddYear = (newYear: string, copyFromYear?: string) => {
    if (availableYears.includes(newYear)) {
      showToast(`รอบปี ${newYear} มีอยู่ในระบบแล้ว`, 'แจ้งเตือน', 'error');
      return;
    }

    pushUndoSnapshot();
    pendingDatabaseWriteRef.current = true;
    const updatedYears = [...availableYears, newYear].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    setAvailableYears(updatedYears);

    let initialDataForNewYear: BusinessRecord[] = [];
    if (copyFromYear && recordsByYear[copyFromYear]) {
      initialDataForNewYear = recordsByYear[copyFromYear].map((r, idx) => ({
        ...r,
        id: `rec-${newYear}-${Date.now()}-${idx}`,
        auditorDate: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    setRecordsByYear((prev) => ({
      ...prev,
      [newYear]: initialDataForNewYear,
    }));

    setSelectedYear(newYear);
    setIsYearModalOpen(false);

    if (copyFromYear) {
      showToast(
        `สร้างรอบปี ${newYear} พร้อมคัดลอกรายชื่อบริษัท ${initialDataForNewYear.length} รายการจากปี ${copyFromYear} เรียบร้อย`,
        'สร้างรอบปีใหม่สำเร็จ'
      );
    } else {
      showToast(`สร้างรอบปี ${newYear} เรียบร้อยแล้ว`, 'สร้างรอบปีใหม่สำเร็จ');
    }
  };

  const handleDeleteYear = (yearToDelete: string) => {
    if (availableYears.length <= 1) {
      showToast('ไม่สามารถลบรอบปีเดียวที่เหลืออยู่ได้', 'แจ้งเตือน', 'error');
      return;
    }

    pushUndoSnapshot();
    pendingDatabaseWriteRef.current = true;
    const nextAvailable = availableYears.filter((y) => y !== yearToDelete);
    setAvailableYears(nextAvailable);

    setRecordsByYear((prev) => {
      const copy = { ...prev };
      delete copy[yearToDelete];
      return copy;
    });

    if (selectedYear === yearToDelete) {
      setSelectedYear(nextAvailable[0]);
    }

    showToast(`ลบรอบปี ${yearToDelete} เรียบร้อยแล้ว`, 'ลบรอบปี');
  };

  // Record CRUD for the Active Year
  const updateActiveYearRecords = (updater: (prev: BusinessRecord[]) => BusinessRecord[]) => {
    pushUndoSnapshot();
    pendingDatabaseWriteRef.current = true;
    setRecordsByYear((prev) => {
      const currentList = prev[selectedYear] || [];
      const updatedList = updater(currentList);
      return {
        ...prev,
        [selectedYear]: updatedList,
      };
    });
  };

  const handleAddRecord = (newRecord: BusinessRecord) => {
    updateActiveYearRecords((prev) => [newRecord, ...prev]);
  };

  const handleUpdateRecord = (updated: BusinessRecord) => {
    updateActiveYearRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(`อัปเดตข้อมูล "${updated.companyName}" สำเร็จ`, 'บันทึกเรียบร้อย');
  };

  const handleDeleteRecord = (id: string) => {
    const target = currentRecords.find((r) => r.id === id);
    updateActiveYearRecords((prev) => prev.filter((r) => r.id !== id));
    showToast(`ลบข้อมูล "${target?.companyName || id}" แล้ว`, 'ลบข้อมูล');
  };

  const handleDeleteMultiple = (ids: string[]) => {
    updateActiveYearRecords((prev) => prev.filter((r) => !ids.includes(r.id)));
    showToast(`ลบข้อมูล ${ids.length} รายการแล้ว`, 'ลบข้อมูล');
  };

  // Helper to append formatted records
  const createNewFormattedRecords = (
    newItems: Partial<BusinessRecord>[],
    currentList: BusinessRecord[]
  ): BusinessRecord[] => {
    const baseTimestamp = Date.now();
    let maxSeq = 0;
    currentList.forEach((r) => {
      const cleaned = r.sequenceNo ? r.sequenceNo.replace(/\D/g, '') : '';
      const num = parseInt(cleaned, 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    });

    return newItems.map((item, idx) => {
      const rowTimestamp = new Date(baseTimestamp + (newItems.length - idx) * 1000).toISOString();
      const calculatedSeq = maxSeq + idx + 1;

      return {
        id: `import-${selectedYear}-${baseTimestamp}-${String(idx).padStart(4, '0')}`,
        sequenceNo: item.sequenceNo?.trim() || String(calculatedSeq),
        taxId: item.taxId !== undefined ? item.taxId : '',
        companyName: item.companyName || `กิจการนำเข้า ${calculatedSeq}`,
        type: item.type || 'company',
        auditorDate: item.auditorDate !== undefined ? item.auditorDate : '',
        password: item.password !== undefined ? item.password : '',
        remark: item.remark !== undefined ? item.remark : '',
        eFilingCode: item.eFilingCode !== undefined ? item.eFilingCode : '',
        ssoCode: item.ssoCode !== undefined ? item.ssoCode : '',
        status: item.status || 'pending',
        isVerifiedDbd: true,
        topic: item.topic || `นำเข้าปี ${selectedYear}`,
        sourceType: item.sourceType || 'excel',
        sourceFileName: item.sourceFileName,
        createdAt: rowTimestamp,
        updatedAt: rowTimestamp,
      };
    });
  };

  // Import Process for Active Year
  const processImportRecords = (
    parsedItems: Partial<BusinessRecord>[],
    fileName: string
  ) => {
    const duplicateList: DuplicateConflictItem[] = [];
    const newItemsList: Partial<BusinessRecord>[] = [];

    const existingTaxMap = new Map<string, BusinessRecord>();
    currentRecords.forEach((r) => {
      const cleanTax = r.taxId ? r.taxId.replace(/\D/g, '').trim() : '';
      if (cleanTax) {
        existingTaxMap.set(cleanTax, r);
      }
    });

    parsedItems.forEach((item) => {
      const cleanTax = item.taxId ? item.taxId.replace(/\D/g, '').trim() : '';
      if (cleanTax && existingTaxMap.has(cleanTax)) {
        duplicateList.push({
          incoming: item,
          existing: existingTaxMap.get(cleanTax)!,
        });
      } else {
        newItemsList.push(item);
      }
    });

    if (duplicateList.length > 0) {
      setPendingImportFile(fileName);
      setConflictDuplicates(duplicateList);
      setConflictNewItems(newItemsList);
      setIsConflictModalOpen(true);
    } else {
      const formatted = createNewFormattedRecords(newItemsList, currentRecords);
      updateActiveYearRecords((prev) => [...formatted, ...prev]);
      showToast(`นำเข้าสำเร็จ ${formatted.length} รายการ เข้าสู่ปี ${selectedYear}`, 'นำเข้าไฟล์สำเร็จ');

    }
  };

  // Resolve Duplicate Conflict
  const handleResolveConflict = (mode: ConflictResolutionMode) => {
    setIsConflictModalOpen(false);

    if (mode === 'update_existing') {
      const incomingUpdatesMap = new Map<string, Partial<BusinessRecord>>();
      conflictDuplicates.forEach(({ incoming, existing }) => {
        const cleanTax = existing.taxId ? existing.taxId.replace(/\D/g, '').trim() : '';
        if (cleanTax) {
          incomingUpdatesMap.set(cleanTax, incoming);
        }
      });

      updateActiveYearRecords((prev) => {
        const updatedList = prev.map((r) => {
          const cleanTax = r.taxId ? r.taxId.replace(/\D/g, '').trim() : '';
          if (cleanTax && incomingUpdatesMap.has(cleanTax)) {
            const incoming = incomingUpdatesMap.get(cleanTax)!;
            return {
              ...r,
              companyName: incoming.companyName || r.companyName,
              type: incoming.type || r.type,
              auditorDate: incoming.auditorDate !== undefined && incoming.auditorDate !== '' ? incoming.auditorDate : r.auditorDate,
              password: incoming.password !== undefined && incoming.password !== '' ? incoming.password : r.password,
              remark: incoming.remark !== undefined && incoming.remark !== '' ? incoming.remark : r.remark,
              eFilingCode: incoming.eFilingCode !== undefined && incoming.eFilingCode !== '' ? incoming.eFilingCode : r.eFilingCode,
              ssoCode: incoming.ssoCode !== undefined && incoming.ssoCode !== '' ? incoming.ssoCode : r.ssoCode,
              status: incoming.status || r.status,
              topic: incoming.topic || r.topic,
              updatedAt: new Date().toISOString(),
            };
          }
          return r;
        });

        const newFormatted = createNewFormattedRecords(conflictNewItems, updatedList);
        return [...newFormatted, ...updatedList];
      });

      showToast(
        `อัปเดตข้อมูลเดิม ${conflictDuplicates.length} รายการ และเพิ่มกิจการใหม่ ${conflictNewItems.length} รายการ (ปี ${selectedYear})`,
        'อัปเดตข้อมูลสำเร็จ'
      );

    } else if (mode === 'skip_duplicates') {
      if (conflictNewItems.length > 0) {
        updateActiveYearRecords((prev) => {
          const newFormatted = createNewFormattedRecords(conflictNewItems, prev);
          return [...newFormatted, ...prev];
        });
        showToast(
          `ข้ามรายการซ้ำ ${conflictDuplicates.length} รายการ และนำเข้ารายการใหม่ ${conflictNewItems.length} รายการ (ปี ${selectedYear})`,
          'นำเข้าเฉพาะรายการใหม่'
        );
      } else {
        showToast(
          `ข้ามรายการซ้ำทั้งหมด ${conflictDuplicates.length} รายการ`,
          'ข้ามรายการซ้ำแล้ว',
          'info'
        );
      }

    } else if (mode === 'import_all') {
      const allIncoming = [...conflictDuplicates.map((d) => d.incoming), ...conflictNewItems];
      updateActiveYearRecords((prev) => {
        const newFormatted = createNewFormattedRecords(allIncoming, prev);
        return [...newFormatted, ...prev];
      });
      showToast(
        `นำเข้าทั้งหมด ${allIncoming.length} รายการ เข้าสู่ปี ${selectedYear}`,
        'นำเข้าทั้งหมดสำเร็จ'
      );

    }
  };

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
    setIsVisitor(false);
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(authMode === 'pin' ? '/api/auth/pin/login' : '/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authMode === 'pin'
          ? { pin: authPin }
          : { username: authUsername.trim(), password: authPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'ID หรือรหัสผ่านไม่ถูกต้อง');
      setSessionUser(payload.user as SessionUser);
      setUserName(payload.user?.username || 'ผู้ดูแลระบบ');
      setUserRole(payload.user?.role === 'admin' ? 'admin' : 'member');
      setAuthPassword('');
      setAuthPin('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'เชื่อมต่อระบบล็อกอินไม่สำเร็จ กรุณาลองใหม่');
      if (authMode === 'pin') setAuthPin('');
    } finally {
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    if (authMode === 'pin' && authPin.length === 6 && !authBusy) {
      void handleLoginSubmit({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>);
    }
  }, [authMode, authPin, authBusy]);

  // PIN login accepts physical keyboard input without requiring the keypad to be focused.
  useEffect(() => {
    if (authMode !== 'pin' || isVisitor || isLoggedIn) return;

    const handlePinKeyDown = (event: KeyboardEvent) => {
      if (authBusy) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        setAuthError('');
        setAuthPin((current) => current.length < 6 ? current + event.key : current);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        setAuthError('');
        setAuthPin((current) => current.slice(0, -1));
      } else if (event.key === 'Escape') {
        setAuthError('');
        setAuthPin('');
      }
    };

    window.addEventListener('keydown', handlePinKeyDown);
    return () => window.removeEventListener('keydown', handlePinKeyDown);
  }, [authMode, authBusy, isVisitor, isLoggedIn]);

  if (!authReady) {
    return <div className="min-h-screen grid place-items-center bg-[#f5f5f5] text-slate-600">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  }

  if (sessionUser && (!accessReady || (isLoggedIn && !dataReady))) {
    return dataError ? <div className="min-h-screen grid place-items-center bg-[#f5f5f5]"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ</h1><p className="mt-3 text-sm text-zinc-600">{dataError}</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button></div></div> : <WorkspaceLoadingSkeleton label="กำลังตรวจสอบสิทธิ์และโหลดข้อมูลจาก Cloudflare D1…" />;
  }

  if (isVisitor && !dataReady) {
    return dataError ? <div className="min-h-screen grid place-items-center bg-[#f5f5f5] p-6"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหมดผู้เยี่ยมชม</h1><p className="mt-3 text-sm text-zinc-600">{dataError}</p><button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button><button className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => { setIsVisitor(false); setDataError(''); }}>กลับไปหน้าเข้าสู่ระบบ</button></div></div> : <WorkspaceLoadingSkeleton label="กำลังโหลดข้อมูลที่เปิดเผยได้…" />;
  }

  if (bootstrapRequired && !sessionUser && !isVisitor) {
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

  if ((!sessionUser || !isLoggedIn) && !isVisitor) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6fa] px-5 py-10 text-slate-900">
        <section aria-labelledby="m101-login-title" className="w-full max-w-[380px] rounded-2xl border border-slate-200/80 bg-white px-6 py-8 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] sm:px-8 sm:py-9">
          <h1 id="m101-login-title" className="mb-7 text-center text-xl font-semibold tracking-tight text-slate-900">เข้าสู่ระบบ</h1>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => { setAuthMode('password'); setAuthPin(''); setAuthError(''); }} aria-pressed={authMode === 'password'} className={`rounded-md px-3 py-2 text-sm font-medium transition ${authMode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>ID / Password</button>
              <button type="button" onClick={() => { setAuthMode('pin'); setAuthPassword(''); setAuthError(''); }} aria-pressed={authMode === 'pin'} className={`rounded-md px-3 py-2 text-sm font-medium transition ${authMode === 'pin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>PIN</button>
            </div>

            {authMode === 'password' ? (
              <div className="space-y-3">
                <input id="m101-login-username" type="text" autoComplete="username" required value={authUsername} onChange={(event) => setAuthUsername(event.target.value)} placeholder="ID ผู้ใช้" aria-label="ID ผู้ใช้" className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
                <input id="m101-login-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="รหัสผ่าน" aria-label="รหัสผ่าน" className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center gap-3 py-2" aria-label={`กรอกแล้ว ${authPin.length} จาก 6 หลัก`}>
                  {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-3 w-3 rounded-full border transition-colors ${index < authPin.length ? 'border-slate-800 bg-slate-800' : 'border-slate-300 bg-white'}`} />)}
                </div>
                <div className="mx-auto grid max-w-[252px] grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9','clear','0','back'].map((key) => (
                    <button key={key} type="button" disabled={authBusy} onClick={() => {
                      setAuthError('');
                      if (key === 'clear') setAuthPin('');
                      else if (key === 'back') setAuthPin((value) => value.slice(0, -1));
                      else setAuthPin((value) => value.length < 6 ? value + key : value);
                    }} className="h-11 rounded-lg border border-slate-200 bg-white text-base font-medium text-slate-800 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50">
                      {key === 'clear' ? 'ล้าง' : key === 'back' ? '⌫' : key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {authError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-700">{authError}</p>}
            <button type="submit" disabled={authBusy || (authMode === 'pin' && authPin.length !== 6)} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#172b4d] px-4 text-sm font-semibold text-white transition hover:bg-[#10213d] focus:outline-none focus:ring-4 focus:ring-[#172b4d]/15 disabled:cursor-not-allowed disabled:opacity-60">
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
        />
      )}
      {pinSetupOpen && sessionUser && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form onSubmit={async (event) => {
            event.preventDefault();
            setPinSetupError('');
            if (!/^\d{6}$/.test(pinSetupValue)) { setPinSetupError('PIN ต้องเป็นตัวเลข 6 หลัก'); return; }
            if (pinSetupValue !== pinSetupConfirm) { setPinSetupError('PIN ทั้งสองช่องไม่ตรงกัน'); return; }
            setPinSetupBusy(true);
            try {
              const response = await fetch('/api/auth/pin/setup', {
                method: 'POST', credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinSetupValue }),
              });
              const payload = await response.json();
              if (!response.ok) throw new Error(payload.error || 'บันทึก PIN ไม่สำเร็จ');
              setPinEnabled(true);
              setPinSetupOpen(false);
              setPinSetupValue('');
              setPinSetupConfirm('');
              showToast('ตั้งค่า PIN เรียบร้อยแล้ว', 'PIN พร้อมใช้งาน');
            } catch (error) {
              setPinSetupError(error instanceof Error ? error.message : 'บันทึก PIN ไม่สำเร็จ');
            } finally {
              setPinSetupBusy(false);
            }
          }} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-slate-900">{pinEnabled ? 'เปลี่ยน PIN' : 'ตั้งค่า PIN'}</h2><p className="mt-1 text-xs text-slate-500">กำหนดรหัสตัวเลข 6 หลักสำหรับเข้าสู่ระบบ</p></div>
              {pinEnabled && <button type="button" onClick={() => setPinSetupOpen(false)} className="rounded-full px-3 py-1 text-slate-400 hover:bg-slate-100">✕</button>}
            </div>
            <label className="mb-2 block text-sm font-medium text-slate-700">PIN ใหม่</label>
            <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="password" autoComplete="new-password" value={pinSetupValue} onChange={(event) => setPinSetupValue(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="ตัวเลข 6 หลัก" className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-slate-400" />
            <label className="mb-2 block text-sm font-medium text-slate-700">ยืนยัน PIN</label>
            <input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="password" autoComplete="new-password" value={pinSetupConfirm} onChange={(event) => setPinSetupConfirm(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="กรอกอีกครั้ง" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:border-slate-400" />
            {pinSetupError && <p role="alert" className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{pinSetupError}</p>}
            <button type="submit" disabled={pinSetupBusy} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{pinSetupBusy ? 'กำลังบันทึก…' : 'บันทึก PIN'}</button>
            {!pinEnabled && <button type="button" onClick={() => setPinSetupOpen(false)} className="mt-2 w-full rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">ตั้งค่าภายหลัง</button>}
          </form>
        </div>
      )}
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
        isVisitor={isVisitor}
        onReturnToLogin={() => { setIsVisitor(false); setDataError(''); setAuthError(''); }}
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
