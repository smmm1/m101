/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { BusinessRecord } from './types';
import { DashboardView } from './components/DashboardView';
import { YearManageModal } from './components/YearManageModal';
import { FloatingPenButton } from './components/FloatingPenButton';
import { EditTitlesModal } from './components/EditTitlesModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  ImportConflictModal,
  DuplicateConflictItem,
  ConflictResolutionMode,
} from './components/ImportConflictModal';
import { ThemeProvider } from './context/ThemeContext';
import { CursorProvider } from './context/CursorContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { INITIAL_BUSINESS_RECORDS } from './data/initialData';
import { initCuteClickSound } from './utils/cuteAudio';

const STORAGE_KEY_YEARS = 'directory_years_v1';
const STORAGE_KEY_SELECTED_YEAR = 'directory_selected_year_v1';
const STORAGE_KEY_RECORDS_BY_YEAR = 'directory_records_by_year_v1';
const STORAGE_KEY_OLD_RECORDS = 'directory_records_v1';
const STORAGE_KEY_USER = 'app_directory_user_v1';

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
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState('');
  const [dataReloadKey, setDataReloadKey] = useState(0);
  const remoteYearsRef = useRef<Set<string>>(new Set());
  const pendingDatabaseWriteRef = useRef(false);
  const pendingSuccessToastsRef = useRef<Array<{ message: string; title?: string }>>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return initCuteClickSound();
  }, []);

  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'Mustang Admin';
    } catch {
      return 'Mustang Admin';
    }
  });

  // Multi-Year state (defaults to year 69)
  const [availableYears, setAvailableYears] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_YEARS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((y: string) => (y === '2569' ? '69' : String(y)));
        }
      }
    } catch {}
    return ['69'];
  });

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTED_YEAR);
      if (saved === '2569') return '69';
      return saved || '69';
    } catch {
      return '69';
    }
  });

  // Records by fiscal year - guarantees initial records exist so table is never empty
  const [recordsByYear, setRecordsByYear] = useState<Record<string, BusinessRecord[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS_BY_YEAR);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) {
          if (parsed['2569'] && !parsed['69']) {
            parsed['69'] = parsed['2569'];
            delete parsed['2569'];
          }
          // If '69' has records, return parsed
          if (parsed['69'] && parsed['69'].length > 0) {
            return parsed;
          }
          // If empty array for '69', populate with INITIAL_BUSINESS_RECORDS
          parsed['69'] = INITIAL_BUSINESS_RECORDS;
          return parsed;
        }
      }
    } catch {}

    // Fallback: check legacy single-year records
    try {
      const legacy = localStorage.getItem(STORAGE_KEY_OLD_RECORDS);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { '69': parsed };
        }
      }
    } catch {}

    return {
      '69': INITIAL_BUSINESS_RECORDS,
    };
  });

  // Active records for currently selected fiscal year
  const currentRecords = recordsByYear[selectedYear] || [];

  // Keep a local cache only after Supabase has loaded successfully.
  useEffect(() => {
    if (!dataReady) return;
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS_BY_YEAR, JSON.stringify(recordsByYear));
    } catch {}
  }, [recordsByYear, dataReady]);

  // Persist available years
  useEffect(() => {
    if (!dataReady) return;
    try {
      localStorage.setItem(STORAGE_KEY_YEARS, JSON.stringify(availableYears));
    } catch {}
  }, [availableYears, dataReady]);

  // Persist selected year
  useEffect(() => {
    if (!dataReady) return;
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_YEAR, selectedYear);
    } catch {}
  }, [selectedYear, dataReady]);

  // Access is granted only by a real Supabase session and the database allowlist.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member');
  const [isVisitor, setIsVisitor] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true);
      setAuthError('ยังไม่ได้ตั้งค่า Supabase URL หรือ Publishable Key ใน Vercel');
      return;
    }

    let active = true;
    const client = supabase;
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError('ตรวจสอบเซสชันไม่สำเร็จ กรุณาลองใหม่');
      setSessionUser(data.session?.user ?? null);
      setAuthReady(true);
    }).catch(() => {
      if (active) {
        setAuthError('เชื่อมต่อระบบยืนยันตัวตนไม่สำเร็จ');
        setAuthReady(true);
      }
    });

    const { data: authSubscription } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setSessionUser(session?.user ?? null);
    });

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
    };
  }, []);

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
    setAuthError('');
    const checkAllowlist = async () => {
      try {
        if (!supabase || !sessionUser.email) throw new Error('บัญชีนี้ไม่มีอีเมลที่ตรวจสอบได้');
        const { data, error } = await supabase
          .from('allowed_users')
          .select('email, role')
          .eq('email', sessionUser.email.toLowerCase())
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          await supabase.auth.signOut();
          if (active) {
            setAuthError('บัญชีนี้ยังไม่ได้รับอนุญาตให้เข้าใช้งาน M101');
            setIsLoggedIn(false);
            setAccessReady(true);
          }
          return;
        }
        if (active) {
          setUserName(sessionUser.email || 'Mustang Admin');
          setUserRole(data.role === 'admin' ? 'admin' : 'member');
          setIsLoggedIn(true);
          setAccessReady(true);
        }
      } catch {
        if (active) {
          setAuthError('ตรวจสอบสิทธิ์ผู้ใช้ไม่สำเร็จ กรุณาลองใหม่');
          setIsLoggedIn(false);
          setAccessReady(true);
        }
      }
    };
    void checkAllowlist();
    return () => { active = false; };
  }, [sessionUser]);

  useEffect(() => {
    const client = supabase;
    if (!isLoggedIn || !accessReady || !sessionUser || !client) return;
    let active = true;
    setDataReady(false);
    setDataError('');

    const loadRemoteData = async () => {
      try {
        // Preserve a copy of all pre-Supabase local data before switching the app to the database.
        const backupPairs: Array<[string, string]> = [
          [STORAGE_KEY_YEARS, 'directory_years_v1_backup_before_supabase'],
          [STORAGE_KEY_SELECTED_YEAR, 'directory_selected_year_v1_backup_before_supabase'],
          [STORAGE_KEY_RECORDS_BY_YEAR, 'directory_records_by_year_v1_backup_before_supabase'],
          [STORAGE_KEY_OLD_RECORDS, 'directory_records_v1_backup_before_supabase'],
        ];
        for (const [sourceKey, backupKey] of backupPairs) {
          const existing = localStorage.getItem(sourceKey);
          if (existing !== null && localStorage.getItem(backupKey) === null) {
            localStorage.setItem(backupKey, existing);
          }
        }

        const { data: rows, error } = await client
          .from('directory_year_data')
          .select('fiscal_year, records, updated_at')
          .order('fiscal_year', { ascending: true });
        if (error) throw error;
        if (!active) return;

        if (rows && rows.length > 0) {
          const nextRecords: Record<string, BusinessRecord[]> = {};
          for (const row of rows) {
            const year = row.fiscal_year === '2569' ? '69' : String(row.fiscal_year);
            if (Object.prototype.hasOwnProperty.call(nextRecords, year)) {
              throw new Error(`พบข้อมูลปีบัญชีซ้ำหลังปรับรูปแบบเป็น ${year} กรุณาตรวจสอบข้อมูลในฐานข้อมูลก่อนแก้ไขต่อ`);
            }
            nextRecords[year] = Array.isArray(row.records) ? row.records as BusinessRecord[] : [];
          }
          remoteYearsRef.current = new Set(rows.map((row) => row.fiscal_year === '2569' ? '69' : String(row.fiscal_year)));
          const years = Object.keys(nextRecords).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          const savedSelection = localStorage.getItem(STORAGE_KEY_SELECTED_YEAR);
          const normalizedSelection = savedSelection === '2569' ? '69' : savedSelection;
          setRecordsByYear(nextRecords);
          setAvailableYears(years.length ? years : ['69']);
          setSelectedYear(normalizedSelection && years.includes(normalizedSelection) ? normalizedSelection : (years[0] || '69'));
        } else {
          // Only migrate actual user-saved browser data when the remote table is empty.
          let localRecords: Record<string, BusinessRecord[]> | null = null;
          const savedByYear = localStorage.getItem(STORAGE_KEY_RECORDS_BY_YEAR);
          if (savedByYear) {
            try {
              const parsed = JSON.parse(savedByYear);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) localRecords = parsed;
            } catch {}
          }
          if (!localRecords) {
            const legacy = localStorage.getItem(STORAGE_KEY_OLD_RECORDS);
            if (legacy) {
              try {
                const parsed = JSON.parse(legacy);
                if (Array.isArray(parsed) && parsed.length) localRecords = { '69': parsed };
              } catch {}
            }
          }
          if (!localRecords) localRecords = { '69': INITIAL_BUSINESS_RECORDS };
          if (localRecords['2569'] && !localRecords['69']) {
            localRecords['69'] = localRecords['2569'];
            delete localRecords['2569'];
          }
          const savedYears = localStorage.getItem(STORAGE_KEY_YEARS);
          let years = Object.keys(localRecords);
          if (savedYears) {
            try {
              const parsed = JSON.parse(savedYears);
              if (Array.isArray(parsed)) years = Array.from(new Set([...years, ...parsed.map((y: string) => y === '2569' ? '69' : String(y))]));
            } catch {}
          }
          years = years.length ? years.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })) : ['69'];
          const migrationRows = years.map((year) => ({
            fiscal_year: year,
            records: Array.isArray(localRecords?.[year]) ? localRecords[year] : [],
            updated_by: sessionUser.id,
            updated_at: new Date().toISOString(),
          }));
          const { error: migrateError } = await client
            .from('directory_year_data')
            .upsert(migrationRows, { onConflict: 'fiscal_year' });
          if (migrateError) throw migrateError;
          if (!active) return;
          remoteYearsRef.current = new Set(years);
          setRecordsByYear(Object.fromEntries(years.map((year) => [year, Array.isArray(localRecords?.[year]) ? localRecords[year] : []])));
          setAvailableYears(years);
          const savedSelection = localStorage.getItem(STORAGE_KEY_SELECTED_YEAR);
          const normalizedSelection = savedSelection === '2569' ? '69' : savedSelection;
          setSelectedYear(normalizedSelection && years.includes(normalizedSelection) ? normalizedSelection : years[0]);
        }
        if (active) setDataReady(true);
      } catch (error) {
        if (active) {
          setDataError(error instanceof Error ? error.message : 'โหลดข้อมูลจาก Supabase ไม่สำเร็จ');
          setDataReady(false);
        }
      }
    };

    void loadRemoteData();
    return () => { active = false; };
  }, [isLoggedIn, accessReady, sessionUser, dataReloadKey]);


  // Visitors use a database view that masks sensitive fields before data reaches the browser.
  useEffect(() => {
    const client = supabase;
    if (!isVisitor || sessionUser || !client || !isSupabaseConfigured) return;
    let active = true;
    setDataReady(false);
    setDataError('');

    const loadPublicData = async () => {
      try {
        const { data: rows, error } = await client
          .from('directory_year_data_public')
          .select('fiscal_year, records, updated_at')
          .order('fiscal_year', { ascending: true });
        if (error) throw error;
        if (!active) return;

        const nextRecords: Record<string, BusinessRecord[]> = {};
        for (const row of rows || []) {
          const year = row.fiscal_year === '2569' ? '69' : String(row.fiscal_year);
          nextRecords[year] = Array.isArray(row.records) ? row.records as BusinessRecord[] : [];
        }
        const years = Object.keys(nextRecords).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const savedSelection = localStorage.getItem(STORAGE_KEY_SELECTED_YEAR);
        const normalizedSelection = savedSelection === '2569' ? '69' : savedSelection;
        setRecordsByYear(nextRecords);
        setAvailableYears(years.length ? years : ['69']);
        setSelectedYear(normalizedSelection && years.includes(normalizedSelection) ? normalizedSelection : (years[0] || '69'));
        setUserName('ผู้เยี่ยมชม');
        setDataReady(true);
      } catch {
        if (active) {
          setDataError('โหลดข้อมูลสาธารณะไม่สำเร็จ กรุณาลองใหม่');
          setDataReady(false);
        }
      }
    };

    void loadPublicData();
    return () => { active = false; };
  }, [isVisitor, sessionUser, dataReloadKey]);

  // Persist each fiscal-year document to Supabase. The local cache is never treated as authoritative.
  useEffect(() => {
    const client = supabase;
    if (!dataReady || !isLoggedIn || !sessionUser || !client) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const currentYears = Array.from(new Set([...availableYears, ...Object.keys(recordsByYear)]))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      const rowsToSave = currentYears.map((year) => ({
        fiscal_year: year,
        records: Array.isArray(recordsByYear[year]) ? recordsByYear[year] : [],
        updated_by: sessionUser.id,
        updated_at: new Date().toISOString(),
      }));
      void (async () => {
        try {
          const { error: saveError } = await client
            .from('directory_year_data')
            .upsert(rowsToSave, { onConflict: 'fiscal_year' });
          if (saveError) throw saveError;
          const removedYears = Array.from(remoteYearsRef.current).filter((year) => !currentYears.includes(year));
          if (removedYears.length) {
            const { error: deleteError } = await client
              .from('directory_year_data')
              .delete()
              .in('fiscal_year', removedYears);
            if (deleteError) throw deleteError;
          }
          remoteYearsRef.current = new Set(currentYears);
          pendingDatabaseWriteRef.current = false;
          const queued = pendingSuccessToastsRef.current.splice(0);
          queued.forEach((item) => showToast(item.message, item.title, 'success'));
        } catch (error) {
          // Keep failed edits recoverable locally; do not announce success.
          try {
            localStorage.setItem('directory_records_by_year_v1_unsynced_backup', JSON.stringify(recordsByYear));
            localStorage.setItem('directory_years_v1_unsynced_backup', JSON.stringify(availableYears));
          } catch {}
          pendingDatabaseWriteRef.current = false;
          pendingSuccessToastsRef.current = [];
          showToast(
            error instanceof Error ? `บันทึก Supabase ไม่สำเร็จ: ${error.message}` : 'บันทึก Supabase ไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ',
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
  const [isEditTitlesModalOpen, setIsEditTitlesModalOpen] = useState(false);

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
        sequenceNo: String(calculatedSeq),
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
    if (!supabase || !isSupabaseConfigured) {
      setAuthError('ยังไม่ได้ตั้งค่า Supabase URL หรือ Publishable Key');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim().toLowerCase(),
        password: authPassword,
      });
      if (error) setAuthError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    } catch {
      setAuthError('เชื่อมต่อระบบล็อกอินไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!authReady) {
    return <div className="min-h-screen grid place-items-center bg-[#f4f5f7] text-slate-600">กำลังตรวจสอบการเข้าสู่ระบบ…</div>;
  }

  if (!isSupabaseConfigured || !supabase) {
    return <div className="min-h-screen grid place-items-center bg-[#f4f5f7] p-6"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">ยังไม่ได้ตั้งค่า Supabase</h1><p className="mt-3 text-sm text-slate-600">ตรวจสอบ VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ใน Vercel แล้ว Deploy ใหม่</p></div></div>;
  }

  if (sessionUser && (!accessReady || (isLoggedIn && !dataReady))) {
    return <div className="min-h-screen grid place-items-center bg-[#f4f5f7] text-slate-600">{dataError ? <div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหลดข้อมูลจากฐานข้อมูลไม่สำเร็จ</h1><p className="mt-3 text-sm text-rose-600">{dataError}</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button></div> : 'กำลังตรวจสอบสิทธิ์และโหลดข้อมูลจาก Supabase…'}</div>;
  }

  if (isVisitor && !dataReady) {
    return <div className="min-h-screen grid place-items-center bg-[#f4f5f7] p-6"><div className="max-w-lg rounded-3xl bg-white p-8 shadow-xl"><h1 className="text-xl font-extrabold">โหมดผู้เยี่ยมชม</h1><p className="mt-3 text-sm text-slate-600">{dataError || 'กำลังโหลดข้อมูลที่เปิดเผยได้…'}</p>{dataError && <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={() => { setDataError(''); setDataReloadKey((value) => value + 1); }}>ลองใหม่</button>}<button className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => { setIsVisitor(false); setDataError(''); }}>กลับไปหน้าเข้าสู่ระบบ</button></div></div>;
  }

  if ((!sessionUser || !isLoggedIn) && !isVisitor) {
    return (
      <main className="m101-login-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbfbfa] px-5 py-12 text-slate-900">
        <style>{`
          @keyframes m101-cat-walk {
            0% { left: -5rem; transform: translateY(0) rotate(0deg); }
            20% { transform: translateY(-4px) rotate(-2deg); }
            40% { transform: translateY(0) rotate(1deg); }
            60% { transform: translateY(-5px) rotate(-1deg); }
            80% { transform: translateY(0) rotate(2deg); }
            100% { left: calc(100% + 5rem); transform: translateY(0) rotate(0deg); }
          }
          @keyframes m101-paw-fade {
            0%, 100% { opacity: .15; transform: translateY(0); }
            50% { opacity: .45; transform: translateY(-3px); }
          }
          .m101-cat-walker {
            position: absolute;
            bottom: 9px;
            left: -5rem;
            font-size: 2rem;
            line-height: 1;
            animation: m101-cat-walk 19s linear infinite;
            will-change: left, transform;
          }
          .m101-cat-walker:nth-child(2) { bottom: 15px; animation-duration: 24s; animation-delay: -8s; font-size: 1.7rem; }
          .m101-cat-walker:nth-child(3) { bottom: 7px; animation-duration: 21s; animation-delay: -15s; font-size: 2.15rem; }
          .m101-paw { animation: m101-paw-fade 3s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .m101-cat-walker, .m101-paw { animation: none !important; }
            .m101-cat-walker { left: auto; }
          }
        `}</style>

        <div aria-hidden="true" className="pointer-events-none absolute left-[12%] top-[14%] h-32 w-32 rounded-full bg-amber-50/80 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[18%] right-[12%] h-40 w-40 rounded-full bg-stone-100 blur-3xl" />

        <section className="relative z-10 w-full max-w-[390px] animate-[fadeIn_.45s_ease-out]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[1.4rem] border border-amber-100 bg-[#fffaf0] shadow-sm transition-transform duration-300 hover:-rotate-3 hover:scale-105" role="img" aria-label="แมวลายสลิดน่ารัก">
              <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
                <path d="M12 27 10 9 25 18 Q32 15 39 18 L54 9 52 28 Q57 35 54 44 Q49 56 32 56 Q15 56 10 44 Q7 35 12 27Z" fill="#d6a36e" stroke="#8c6242" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M15 23 14 15 23 21Z" fill="#eaa6a0"/><path d="M49 23 50 15 41 21Z" fill="#eaa6a0"/>
                <path d="M23 19 27 25 M32 17 32 24 M41 19 37 25 M13 31 20 33 M51 31 44 33" stroke="#8c6242" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
                <path d="M21 34 Q25 30 29 34 M35 34 Q39 30 43 34" stroke="#49382e" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                <ellipse cx="32" cy="40" rx="3.4" ry="2.6" fill="#d8797d"/>
                <path d="M32 42 Q29 46 25 43 M32 42 Q35 46 39 43" stroke="#49382e" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
                <path d="M23 41 12 39 M23 44 12 45 M41 41 52 39 M41 44 52 45" stroke="#8c6242" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M26 51 Q32 48 38 51" stroke="#8c6242" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Time to work , my love.</h1>
            
          </div>

          <form onSubmit={handleLoginSubmit} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)] sm:p-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">เข้าสู่ระบบ</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ปลอดภัย
              </span>
            </div>

            <label htmlFor="m101-login-email" className="mb-2 block text-sm font-medium text-slate-700">อีเมล</label>
            <input id="m101-login-email" type="email" autoComplete="username" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@example.com" className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />

            <label htmlFor="m101-login-password" className="mb-2 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
            <input id="m101-login-password" type="password" autoComplete="current-password" required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="กรอกรหัสผ่าน" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />

            {authError && <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-700">{authError}</p>}

            <button type="submit" disabled={authBusy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60">
              {authBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> กำลังเข้าสู่ระบบ…</> : <>เข้าสู่ระบบ <span aria-hidden="true">→</span></>}
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-100" /><span>หรือ</span><span className="h-px flex-1 bg-slate-100" /></div>

            <button type="button" onClick={() => { setIsVisitor(true); setAuthError(''); setDataError(''); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100">เข้าใช้งานในฐานะผู้เยี่ยมชม</button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">อะ มีแมวกี่ตัว ?</p>
          <div aria-hidden="true" className="m101-paw pointer-events-none absolute -right-7 top-2 text-lg text-stone-300">🐾</div>
        </section>

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-14 overflow-hidden border-t border-stone-100/80 bg-white/70">
          <span className="m101-cat-walker">🐈</span>
          <span className="m101-cat-walker">🐈‍⬛</span>
          <span className="m101-cat-walker">🐈</span>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f7] text-slate-900 font-body antialiased">
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
          void supabase?.auth.signOut().then(({ error }) => {
            if (error) showToast('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่', 'ข้อผิดพลาด', 'error');
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
      <FloatingPenButton
        onOpenModal={() => setIsEditTitlesModalOpen(true)}
        isLoggedIn={isLoggedIn}
      />

      {isEditTitlesModalOpen && (
        <EditTitlesModal
          isOpen={isEditTitlesModalOpen}
          onClose={() => setIsEditTitlesModalOpen(false)}
          onShowToast={showToast}
        />
      )}
    </div>
  );
}
