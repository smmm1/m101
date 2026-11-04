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

interface SessionUser { id: string; email: string; role: 'admin' | 'member' }

function WorkspaceLoadingSkeleton({ label = 'กำลังโหลดข้อมูล…' }: { label?: string }) {
  return (
    <main className="min-h-screen bg-[#f4f5f7] p-4 sm:p-6" aria-label={label} aria-busy="true">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="space-y-2"><div className="h-4 w-36 animate-pulse rounded bg-slate-200" /><div className="h-3 w-24 animate-pulse rounded bg-slate-100" /></div><div className="h-9 w-28 animate-pulse rounded-xl bg-slate-100" /></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map((item) => <div key={item} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-3 w-20 animate-pulse rounded bg-slate-100" /><div className="h-8 w-16 animate-pulse rounded bg-slate-200" /><div className="h-2 w-28 animate-pulse rounded bg-slate-100" /></div>)}</div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="h-5 w-40 animate-pulse rounded bg-slate-200" /><div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />{[0,1,2,3,4].map((item) => <div key={item} className="flex gap-3 border-b border-slate-100 py-4"><div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 w-2/5 animate-pulse rounded bg-slate-200" /><div className="h-2 w-1/4 animate-pulse rounded bg-slate-100" /></div></div>)}</div><div className="hidden space-y-4 rounded-2xl border border-slate-200 bg-white p-5 xl:block"><div className="h-5 w-32 animate-pulse rounded bg-slate-200" />{[0,1,2,3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div></div>
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
  const [accessReady, setAccessReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
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
  type UndoSnapshot = { recordsByYear: Record<string, BusinessRecord[]>; availableYears: string[]; selectedYear: string };
  const undoStackRef = React.useRef<UndoSnapshot[]>([]);
  const recordsByYearRef = React.useRef<Record<string, BusinessRecord[]>>({ '69': [] });
  const availableYearsRef = React.useRef<string[]>(['69']);
  const selectedYearRef = React.useRef('69');

  useEffect(() => {
    return initCuteClickSound();
  }, []);

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

  // Ctrl/Cmd+Z restores the previous data state. Native text-field undo remains untouched.
  useEffect(() => {
    const handleUndoShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!isLoggedIn || !sessionUser || undoStackRef.current.length === 0) return;
      event.preventDefault();
      const snapshot = undoStackRef.current.pop();
      if (!snapshot) return;
      pendingDatabaseWriteRef.current = true;
      setRecordsByYear(snapshot.recordsByYear);
      setAvailableYears(snapshot.availableYears);
      setSelectedYear(snapshot.selectedYear);
      showToast('ย้อนกลับการเปลี่ยนแปลงล่าสุดแล้ว', 'Undo สำเร็จ', 'info');
    };
    window.addEventListener('keydown', handleUndoShortcut);
    return () => window.removeEventListener('keydown', handleUndoShortcut);
  }, [isLoggedIn, sessionUser]);

  // Active records for currently selected fiscal year
  const currentRecords = recordsByYear[selectedYear] || [];

  // Cloudflare D1 is the source of truth. Browser storage is never imported.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [isVisitor, setIsVisitor] = useState(false);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
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
        undoStackRef.current = [];
        setSelectedYear((current) => years.includes(current) ? current : (years[0] || '69'));
        setUserName(sessionUser.email || 'ผู้ดูแลระบบ');
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

  // Save changes to the isolated M101 D1 database.
  useEffect(() => {
    if (!dataReady || !isLoggedIn || !sessionUser) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch('/api/data', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ availableYears, recordsByYear }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'บันทึก Cloudflare D1 ไม่สำเร็จ');
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
        }
      })();
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dataReady, isLoggedIn, sessionUser, recordsByYear, availableYears]);

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
          : { email: authEmail.trim().toLowerCase(), password: authPassword }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      setSessionUser(payload.user as SessionUser);
      setUserName(payload.user?.email || 'ผู้ดูแลระบบ');
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
    return <div className="min-h-screen grid place-items-center bg-[#f4f5f7] text-slate-600">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  }

  if (sessionUser && (!accessReady || (isLoggedIn && !dataReady))) {
    return dataError ? <div className="min-h-screen grid place-items-center bg-[#f4f5f7]"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ</h1><p className="mt-3 text-sm text-rose-600">{dataError}</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button></div></div> : <WorkspaceLoadingSkeleton label="กำลังตรวจสอบสิทธิ์และโหลดข้อมูลจาก Cloudflare D1…" />;
  }

  if (isVisitor && !dataReady) {
    return dataError ? <div className="min-h-screen grid place-items-center bg-[#f4f5f7] p-6"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหมดผู้เยี่ยมชม</h1><p className="mt-3 text-sm text-rose-600">{dataError}</p><button className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button><button className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => { setIsVisitor(false); setDataError(''); }}>กลับไปหน้าเข้าสู่ระบบ</button></div></div> : <WorkspaceLoadingSkeleton label="กำลังโหลดข้อมูลที่เปิดเผยได้…" />;
  }

  if ((!sessionUser || !isLoggedIn) && !isVisitor) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] text-slate-900">
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
          <section className="relative isolate flex min-h-[270px] flex-col justify-between overflow-hidden bg-[#123f39] px-7 py-8 text-white sm:px-12 sm:py-10 lg:min-h-screen lg:px-16 lg:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.24) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
            <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full border border-white/10" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-[20rem] w-[20rem] rounded-full border border-white/10" />
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-white/10 text-sm font-bold tracking-tight">M</div>
              <div>
                <p className="text-sm font-semibold tracking-[0.16em]">WORKSPACE</p>
                <p className="mt-0.5 text-[11px] tracking-wide text-emerald-100/70">ระบบจัดการข้อมูล</p>
              </div>
            </div>

            <div className="relative z-10 mt-12 max-w-xl lg:my-auto lg:py-16">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-100/20 bg-white/[0.07] px-3 py-1.5 text-xs font-medium text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> พื้นที่จัดการข้อมูลกิจการ
              </p>
              <h1 className="max-w-lg text-3xl font-semibold leading-[1.25] tracking-tight sm:text-4xl lg:text-[2.8rem]">
                ข้อมูลสำคัญ<br className="hidden sm:block" /> จัดการได้อย่างเป็นระบบ
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-emerald-50/75 sm:text-base">
                รวมรายการ เอกสาร และข้อมูลกิจการไว้ในพื้นที่เดียว พร้อมเครื่องมือนำเข้าข้อมูลที่ตรวจสอบได้ก่อนบันทึก
              </p>

              <div className="mt-10 hidden max-w-md rounded-2xl border border-white/15 bg-white/[0.07] p-4 sm:block">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-50/80">WORKSPACE OVERVIEW</span>
                  <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[10px] font-medium text-emerald-100">พร้อมใช้งาน</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-200/15 text-emerald-100">01</span>
                    <div className="flex-1"><div className="h-2 w-28 rounded-full bg-white/70" /><div className="mt-2 h-1.5 w-40 max-w-full rounded-full bg-white/20" /></div>
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/[0.07] px-3 py-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-emerald-100">02</span>
                    <div className="flex-1"><div className="h-2 w-20 rounded-full bg-white/55" /><div className="mt-2 h-1.5 w-32 max-w-full rounded-full bg-white/20" /></div>
                    <span className="h-2 w-2 rounded-full bg-amber-200" />
                  </div>
                </div>
                <p className="mt-3 text-[10px] tracking-wide text-emerald-50/45">A CLEAR VIEW OF YOUR WORK</p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between border-t border-white/15 pt-5 text-[11px] text-emerald-50/55">
              <span>จัดระเบียบงาน ให้เห็นภาพชัดขึ้น</span>
              <span>พื้นที่ทำงานส่วนตัว</span>
            </div>
          </section>

          <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
            <div className="w-full max-w-[420px]">
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#39766b]">ยินดีต้อนรับกลับ</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">เข้าสู่ระบบ</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">ลงชื่อเข้าใช้เพื่อเข้าถึงข้อมูลและพื้นที่ทำงานของคุณ</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1">
                  <button type="button" onClick={() => { setAuthMode('password'); setAuthPin(''); setAuthError(''); }} aria-pressed={authMode === 'password'} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === 'password' ? 'bg-[#eaf3f0] text-[#20584f] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>อีเมลและรหัสผ่าน</button>
                  <button type="button" onClick={() => { setAuthMode('pin'); setAuthPassword(''); setAuthError(''); }} aria-pressed={authMode === 'pin'} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${authMode === 'pin' ? 'bg-[#eaf3f0] text-[#20584f] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>PIN 6 หลัก</button>
                </div>

                {authMode === 'password' ? (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="m101-login-email" className="mb-2 block text-sm font-medium text-slate-700">อีเมล</label>
                      <input id="m101-login-email" type="email" autoComplete="username" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="name@example.com" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#39766b] focus:ring-4 focus:ring-[#39766b]/10" />
                    </div>
                    <div>
                      <label htmlFor="m101-login-password" className="mb-2 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
                      <input id="m101-login-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="กรอกรหัสผ่านของคุณ" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#39766b] focus:ring-4 focus:ring-[#39766b]/10" />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5">
                    <label className="mb-4 block text-center text-sm font-medium text-slate-700">กรอก PIN 6 หลัก</label>
                    <div className="mb-5 flex justify-center gap-3" aria-label={`กรอกแล้ว ${authPin.length} จาก 6 หลัก`}>
                      {Array.from({ length: 6 }, (_, index) => <span key={index} className={`h-3.5 w-3.5 rounded-full border transition-colors ${index < authPin.length ? 'border-[#28685d] bg-[#28685d]' : 'border-slate-300 bg-white'}`} />)}
                    </div>
                    <div className="mx-auto grid max-w-[270px] grid-cols-3 gap-2">
                      {['1','2','3','4','5','6','7','8','9','clear','0','back'].map((key) => (
                        <button key={key} type="button" disabled={authBusy} onClick={() => {
                          setAuthError('');
                          if (key === 'clear') setAuthPin('');
                          else if (key === 'back') setAuthPin((value) => value.slice(0, -1));
                          else setAuthPin((value) => value.length < 6 ? value + key : value);
                        }} className="h-12 rounded-xl border border-slate-200 bg-[#fbfcfb] text-lg font-semibold text-slate-800 transition hover:border-[#9bbdb4] hover:bg-[#edf5f2] active:scale-[0.98] disabled:opacity-50">
                          {key === 'clear' ? 'ล้าง' : key === 'back' ? '⌫' : key}
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-center text-xs leading-5 text-slate-500">ใช้แป้นตัวเลขบนหน้าจอหรือคีย์บอร์ดได้ · ครบ 6 หลักจะเข้าสู่ระบบอัตโนมัติ</p>
                  </div>
                )}

                {authError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-6 text-rose-700">{authError}</p>}

                <button type="submit" disabled={authBusy || (authMode === 'pin' && authPin.length !== 6)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#20584f] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17483f] focus:outline-none focus:ring-4 focus:ring-[#39766b]/20 disabled:cursor-not-allowed disabled:opacity-60">
                  {authBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> กำลังเข้าสู่ระบบ…</> : <>{authMode === 'pin' ? 'ปลดล็อกด้วย PIN' : 'เข้าสู่ระบบ'} <span aria-hidden="true">→</span></>}
                </button>

                <div className="flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>หรือ</span><span className="h-px flex-1 bg-slate-200" /></div>

                <button type="button" onClick={() => { setIsVisitor(true); setAuthError(''); setDataError(''); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200">เข้าใช้งานในฐานะผู้เยี่ยมชม</button>
              </form>

              <div className="mt-8 flex items-start gap-2.5 rounded-xl bg-[#edf4f1] px-3.5 py-3 text-xs leading-5 text-[#38645c]">
                <span aria-hidden="true" className="mt-0.5">●</span>
                <p>การเข้าสู่ระบบใช้การยืนยันตัวตนที่ตั้งค่าไว้ และเชื่อมต่อข้อมูลอย่างปลอดภัย</p>
              </div>
              <p className="mt-6 text-center text-[11px] text-slate-400">พื้นที่จัดการข้อมูล</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f7] text-slate-900 font-body antialiased">
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
            {pinSetupError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{pinSetupError}</p>}
            <button type="submit" disabled={pinSetupBusy} className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{pinSetupBusy ? 'กำลังบันทึก…' : 'บันทึก PIN'}</button>
            {!pinEnabled && <button type="button" onClick={() => setPinSetupOpen(false)} className="mt-2 w-full rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50">ตั้งค่าภายหลัง</button>}
          </form>
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

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
