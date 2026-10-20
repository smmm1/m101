/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ActiveScreen, BusinessRecord } from './types';
import { supabase } from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BusinessListView } from './components/BusinessListView';
import { EditBusinessModal } from './components/EditBusinessModal';
import { AddBusinessModal } from './components/AddBusinessModal';
import { SettingsView } from './components/SettingsView';
import { ImportDocumentView } from './components/ImportDocumentView';
import { YearManageModal } from './components/YearManageModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { parseDocumentFile } from './utils/excelHelper';
import {
  ImportConflictModal,
  DuplicateConflictItem,
  ConflictResolutionMode,
} from './components/ImportConflictModal';
import { ThemeProvider } from './context/ThemeContext';
import { CursorProvider } from './context/CursorContext';
import { SystemConfigProvider } from './context/SystemConfigContext';
import { INITIAL_BUSINESS_RECORDS } from './data/initialData';

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudError, setCloudError] = useState('');
  const [needsMigration, setNeedsMigration] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'Mustang Admin';
    } catch {
      return 'Mustang Admin';
    }
  });

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active || !data.session?.user) return;
        const email = data.session.user.email?.trim().toLowerCase();
        if (!email) {
          await supabase.auth.signOut();
          return;
        }
        const { data: allowed, error: allowlistError } = await supabase
          .from('allowed_users')
          .select('email')
          .eq('email', email)
          .maybeSingle();
        if (!active) return;
        if (allowlistError || !allowed) {
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          return;
        }
        setUserName(email);
        setIsLoggedIn(true);
      } catch (error) {
        if (active) setCloudError(error instanceof Error ? error.message : 'เชื่อมต่อ Supabase ไม่สำเร็จ');
      }
    };
    void checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsLoggedIn(false);
        setCloudReady(false);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

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

  // Load allowlisted users' records from Supabase. Migrate saved browser data only when the cloud has no records.
  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    const loadCloud = async () => {
      setCloudReady(false);
      setCloudError('');
      setNeedsMigration(false);
      const { data, error } = await supabase
        .from('directory_year_data')
        .select('fiscal_year, records');
      if (!active) return;
      if (error) {
        setCloudError('เชื่อมต่อฐานข้อมูลไม่ได้: ' + error.message);
        return;
      }
      const rows = data || [];
      if (rows.length > 0) {
        const cloudRecords: Record<string, BusinessRecord[]> = {};
        rows.forEach((row: { fiscal_year: string; records: BusinessRecord[] }) => {
          cloudRecords[row.fiscal_year] = row.records || [];
        });
        const years = Object.keys(cloudRecords).sort();
        setRecordsByYear(cloudRecords);
        setAvailableYears(years.length ? years : ['69']);
        setSelectedYear((prev) => (cloudRecords[prev] ? prev : years[0] || '69'));
      } else {
        // Ask before copying saved browser data into Supabase.
        setNeedsMigration(true);
      }
      if (active) setCloudReady(true);
    };
    void loadCloud();
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  // Save records to Supabase after the initial cloud load completes.
  useEffect(() => {
    if (!isLoggedIn || !cloudReady || needsMigration) return;
    const persist = async () => {
      const rows = Object.entries(recordsByYear).map(([fiscal_year, records]) => ({
        fiscal_year,
        records,
        updated_at: new Date().toISOString(),
      }));
      if (!rows.length) return;
      const { error } = await supabase
        .from('directory_year_data')
        .upsert(rows, { onConflict: 'fiscal_year' });
      if (error) setCloudError('บันทึกฐานข้อมูลไม่สำเร็จ: ' + error.message);
      else setCloudError('');
    };
    void persist();
  }, [recordsByYear, isLoggedIn, cloudReady, needsMigration]);

  // Persist records to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS_BY_YEAR, JSON.stringify(recordsByYear));
    } catch {}
  }, [recordsByYear]);

  // Persist available years
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_YEARS, JSON.stringify(availableYears));
    } catch {}
  }, [availableYears]);

  // Persist selected year
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_YEAR, selectedYear);
    } catch {}
  }, [selectedYear]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);
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
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      handleDismissToast(id);
    }, 5000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogin = (user: string) => {
    setCloudReady(false);
    setCloudError('');
    setUserName(user);
    try {
      localStorage.setItem(STORAGE_KEY_USER, user);
    } catch {}
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    void supabase.auth.signOut();
    setCloudReady(false);
    setCloudError('');
    setIsLoggedIn(false);
  };

  const handleMigrateLocalData = async () => {
    setCloudError('');
    const rows = Object.entries(recordsByYear).map(([fiscal_year, records]) => ({
      fiscal_year,
      records,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('directory_year_data')
      .upsert(rows, { onConflict: 'fiscal_year' });
    if (error) {
      setCloudError('ย้ายข้อมูลเดิมไม่สำเร็จ: ' + error.message);
      return;
    }
    setNeedsMigration(false);
  };

  const handleStartEmptyCloud = async () => {
    setCloudError('');
    const emptyRecords = { '69': [] as BusinessRecord[] };
    const { error } = await supabase
      .from('directory_year_data')
      .upsert([{ fiscal_year: '69', records: [], updated_at: new Date().toISOString() }], { onConflict: 'fiscal_year' });
    if (error) {
      setCloudError('เริ่มฐานข้อมูลว่างไม่สำเร็จ: ' + error.message);
      return;
    }
    setRecordsByYear(emptyRecords);
    setAvailableYears(['69']);
    setSelectedYear('69');
    setNeedsMigration(false);
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

    const updatedYears = [...availableYears, newYear].sort();
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

    if (isLoggedIn && cloudReady && !needsMigration) {
      void supabase.from('directory_year_data').delete().eq('fiscal_year', yearToDelete).then(({ error }) => {
        if (error) setCloudError('ลบรอบปีในฐานข้อมูลไม่สำเร็จ: ' + error.message);
      });
    }
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
    setIsAddModalOpen(false);
  };

  const handleUpdateRecord = (updated: BusinessRecord) => {
    updateActiveYearRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    showToast(`อัปเดตข้อมูล "${updated.companyName}" สำเร็จ`, 'บันทึกเรียบร้อย');
    setEditingRecord(null);
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
      setCurrentScreen('dashboard');
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
      setCurrentScreen('dashboard');
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
      setCurrentScreen('dashboard');
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
      setCurrentScreen('dashboard');
    }
  };

  const handleHeaderFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseDocumentFile(file, `ไฟล์: ${file.name}`);
      if (parsed.length > 0) {
        processImportRecords(parsed, file.name);
      } else {
        showToast(`ไม่พบข้อมูลในไฟล์ ${file.name}`, 'แจ้งเตือน', 'info');
      }
    } catch {
      showToast(`เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}`, 'ข้อผิดพลาด', 'error');
    }
    e.target.value = '';
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;
  if (!cloudReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#fafafa] text-sm text-[#52525b]">
        <div className="font-semibold">กำลังโหลดข้อมูลที่ได้รับอนุญาตจากฐานข้อมูล…</div>
        {cloudError && <div role="alert" className="max-w-xl px-4 text-center text-rose-600">{cloudError}</div>}
        {cloudError && <button className="rounded-lg border px-3 py-2" onClick={handleLogout}>ออกจากระบบ</button>}
      </div>
    );
  }

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;
  if (!cloudReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#fafafa] text-sm text-[#52525b]">
        <div className="font-semibold">กำลังโหลดข้อมูลที่ได้รับอนุญาตจากฐานข้อมูล…</div>
        {cloudError && <div role="alert" className="max-w-xl px-4 text-center text-rose-600">{cloudError}</div>}
        {cloudError && <button className="rounded-lg border px-3 py-2" onClick={handleLogout}>ออกจากระบบ</button>}
      </div>
    );
  }
  if (needsMigration) {
    const localCount = Object.values(recordsByYear).reduce((sum, records) => sum + records.length, 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] p-4 text-slate-900">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-bold">เลือกข้อมูลเริ่มต้นสำหรับฐานข้อมูล</h1>
          <p className="mt-2 text-sm text-slate-600">
            ยังไม่พบข้อมูลบน Supabase และพบข้อมูลที่บันทึกไว้ในเบราว์เซอร์ {localCount} รายการ
            เลือกได้ว่าจะย้ายข้อมูลเดิมขึ้นฐานข้อมูล หรือเริ่มจากฐานข้อมูลว่าง
          </p>
          {cloudError && <div role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{cloudError}</div>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={() => void handleMigrateLocalData()} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
              ย้ายข้อมูลเดิมขึ้นฐานข้อมูล
            </button>
            <button type="button" onClick={() => void handleStartEmptyCloud()} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              เริ่มฐานข้อมูลว่าง
            </button>
          </div>
          <button type="button" onClick={handleLogout} className="mt-4 text-sm text-slate-500 underline">
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f4f5f7] text-slate-900 font-body antialiased">
      {cloudError && <div role="alert" className="fixed top-3 right-3 z-[100] max-w-lg rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-lg">{cloudError}</div>}
      <DashboardView
        records={currentRecords}
        userName={userName}
        selectedYear={selectedYear}
        availableYears={availableYears}
        recordsByYear={recordsByYear}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onEditRecord={setEditingRecord}
        onDeleteRecord={handleDeleteRecord}
        onDeleteMultiple={handleDeleteMultiple}
        onAddRecord={handleAddRecord}
        onShowToast={showToast}
        onLogout={handleLogout}
        onImportRecords={(items) => processImportRecords(items, 'นำเข้าไฟล์')}
        onSelectYear={handleSelectYear}
        onOpenYearModal={() => setIsYearModalOpen(true)}
        onAddYear={(yr) => handleAddYear(yr)}
        onDeleteYear={(yr) => handleDeleteYear(yr)}
        onRestoreRecords={(newRecords) => {
          setRecordsByYear((prev) => ({
            ...prev,
            [selectedYear]: newRecords,
          }));
        }}
      />

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddBusinessModal
          allRecords={currentRecords}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddRecord}
          onShowToast={showToast}
          nextSequenceNo={String(currentRecords.length + 1)}
        />
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <EditBusinessModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={handleUpdateRecord}
          onShowToast={showToast}
        />
      )}

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
