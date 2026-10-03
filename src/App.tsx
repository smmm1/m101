/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { ActiveScreen, BusinessRecord } from './types';
import { INITIAL_BUSINESS_RECORDS } from './data/initialData';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BusinessListView } from './components/BusinessListView';
import { EditBusinessModal } from './components/EditBusinessModal';
import { AddBusinessModal } from './components/AddBusinessModal';
import { SettingsView } from './components/SettingsView';

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

const STORAGE_KEY_YEARS = 'directory_years_v1';
const STORAGE_KEY_SELECTED_YEAR = 'directory_selected_year_v1';
const STORAGE_KEY_RECORDS_BY_YEAR = 'directory_records_by_year_v1';
const STORAGE_KEY_OLD_RECORDS = 'directory_records_v1';
const STORAGE_KEY_USER = 'app_directory_user_v1';
const STORAGE_KEY_AUTH = 'app_directory_is_logged_in_v1';

type AppData = { years: string[]; recordsByYear: Record<string, BusinessRecord[]> };

async function fetchAppData(url: string): Promise<AppData> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load data (${res.status})`);
  return res.json();
}

// One-time migration source: data previously kept only in this browser.
function loadLegacyLocalData(): AppData {
  let years = ['69'];
  let recordsByYear: Record<string, BusinessRecord[]> | null = null;

  try {
    const savedYears = JSON.parse(localStorage.getItem(STORAGE_KEY_YEARS) || 'null');
    if (Array.isArray(savedYears) && savedYears.length > 0) {
      years = savedYears.map((y: string) => (y === '2569' ? '69' : String(y)));
    }
    const savedRecords = JSON.parse(localStorage.getItem(STORAGE_KEY_RECORDS_BY_YEAR) || 'null');
    if (savedRecords && typeof savedRecords === 'object' && Object.keys(savedRecords).length > 0) {
      if (savedRecords['2569'] && !savedRecords['69']) {
        savedRecords['69'] = savedRecords['2569'];
        delete savedRecords['2569'];
      }
      recordsByYear = savedRecords;
    }
  } catch {}

  if (!recordsByYear) {
    let fallback69 = INITIAL_BUSINESS_RECORDS;
    try {
      const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY_OLD_RECORDS) || 'null');
      if (Array.isArray(legacy) && legacy.length > 0) fallback69 = legacy;
    } catch {}
    recordsByYear = { '69': fallback69 };
  }

  const allYears = Array.from(new Set([...years, ...Object.keys(recordsByYear)])).sort();
  return {
    years: allYears,
    recordsByYear: Object.fromEntries(allYears.map((y) => [y, recordsByYear![y] || []])),
  };
}

export default function App() {
  return (
    <ThemeProvider>
      <CursorProvider>
        <AppContent />
      </CursorProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  // Always enforce starting at login screen whenever entering or opening the site
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {}
  }, []);

  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('dashboard');
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_USER) || 'Mustang';
    } catch {
      return 'Mustang';
    }
  });

  const [availableYears, setAvailableYears] = useState<string[]>(['69']);

  const [selectedYear, setSelectedYear] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED_YEAR);
    if (saved === '2569') return '69';
    return saved || '69';
  });

  const [recordsByYear, setRecordsByYear] = useState<Record<string, BusinessRecord[]>>({});

  const { data: remoteData, error: loadError } = useSWR<AppData>('/api/data', fetchAppData, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const [isDataReady, setIsDataReady] = useState(false);
  const lastSavedSnapshot = useRef<string>('');

  useEffect(() => {
    if (!remoteData || isDataReady) return;

    const hasRemoteData = remoteData.years.length > 0;
    const initial = hasRemoteData ? remoteData : loadLegacyLocalData();
    if (hasRemoteData) {
      lastSavedSnapshot.current = JSON.stringify(remoteData);
    }

    setAvailableYears(initial.years);
    setRecordsByYear(initial.recordsByYear);
    setSelectedYear((current) => (initial.years.includes(current) ? current : initial.years[0]));
    setIsDataReady(true);
  }, [remoteData, isDataReady]);

  // Current year active records
  const currentRecords = recordsByYear[selectedYear] || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State for Import Conflict Modal
  const [pendingImportFile, setPendingImportFile] = useState<string>('');
  const [conflictDuplicates, setConflictDuplicates] = useState<DuplicateConflictItem[]>([]);
  const [conflictNewItems, setConflictNewItems] = useState<Partial<BusinessRecord>[]>([]);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  const showToast = (message: string, title?: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast: ToastMessage = {
      id,
      title,
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 2.2 seconds so it briefly appears and disappears automatically
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!isDataReady) return;

    const snapshot = JSON.stringify({ years: availableYears, recordsByYear });
    if (snapshot === lastSavedSnapshot.current) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: snapshot,
        });
        if (!res.ok) throw new Error(`Save failed with status ${res.status}`);
        lastSavedSnapshot.current = snapshot;
      } catch (e) {
        console.error(e);
        showToast('ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้ กรุณาลองใหม่', 'บันทึกไม่สำเร็จ', 'error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [availableYears, recordsByYear, isDataReady]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SELECTED_YEAR, selectedYear);
    } catch (e) {
      console.error(e);
    }
  }, [selectedYear]);

  const handleLogin = (user: string) => {
    if (user) {
      setUserName(user);
      try {
        localStorage.setItem(STORAGE_KEY_USER, user);
      } catch {}
    }
    setIsLoggedIn(true);
    showToast(`ยินดีต้อนรับคุณ ${user || 'ผู้ใช้งาน'}`, 'เข้าสู่ระบบสำเร็จ');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'แจ้งเตือน', 'info');
  };

  // Year Management
  const handleSelectYear = (year: string) => {
    setSelectedYear(year);
    if (!availableYears.includes(year)) {
      setAvailableYears((prev) => [...prev, year].sort());
    }
    showToast(`สลับการทำงานไปยัง "ปี ${year}"`, 'เปลี่ยนรอบปี');
  };

  const handleAddYear = (newYear: string, copyFromYear?: string) => {
    if (!availableYears.includes(newYear)) {
      setAvailableYears((prev) => [...prev, newYear].sort());
    }

    let initialDataForNewYear: BusinessRecord[] = [];
    if (copyFromYear && recordsByYear[copyFromYear]) {
      // Deep copy records from source year, reset status to 'pending' for new accounting cycle
      initialDataForNewYear = recordsByYear[copyFromYear].map((r, idx) => ({
        ...r,
        id: `yr-${newYear}-${Date.now()}-${idx}`,
        status: 'pending',
        auditorDate: '',
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

  if (!isDataReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <p role="status" aria-live="polite" className="text-sm">
          {loadError ? 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณารีเฟรชหน้าอีกครั้ง' : 'กำลังโหลดข้อมูล...'}
        </p>
      </main>
    );
  }

  if (!isLoggedIn) {
  return (
      <>
        <LoginScreen onLogin={handleLogin} defaultUserName={userName} />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  return (
    <div className="bg-white text-[#18181b] font-body antialiased flex h-screen w-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        totalCompaniesCount={currentRecords.length}
        userName={userName}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Top Header Bar with Year Switcher */}
        <Header
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onFileSelect={handleHeaderFileSelect}
          selectedYear={selectedYear}
          availableYears={availableYears}
          recordsByYear={recordsByYear}
          onSelectYear={handleSelectYear}
          onOpenYearModal={() => setIsYearModalOpen(true)}
          onShowToast={showToast}
        />

        {/* Dynamic Screen View */}
        {currentScreen === 'dashboard' && (
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
            onImportRecords={(items) => processImportRecords(items, 'นำเข้าไฟล์')}
          />
        )}

        {currentScreen === 'business-list' && (
          <BusinessListView
            records={currentRecords}
            selectedYear={selectedYear}
            onEditRecord={setEditingRecord}
            onDeleteRecord={handleDeleteRecord}
            onShowToast={showToast}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsView
            records={currentRecords}
            onShowToast={showToast}
            onLogout={handleLogout}
            onRestoreRecords={(newRecords) => {
              updateActiveYearRecords(() => newRecords);
            }}
          />
        )}


      </div>

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
      <EditBusinessModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdateRecord}
        onShowToast={showToast}
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
