import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { AddBusinessModal } from './AddBusinessModal';
import { BusinessDetailModal } from './BusinessDetailModal';
import { EditBusinessModal } from './EditBusinessModal';
import { SettingsView } from './SettingsView';
import { ImportDocumentView } from './ImportDocumentView';
import { DeleteBusinessModal } from './DeleteBusinessModal';
import { useTheme } from '../context/ThemeContext';

interface ActivityLogItem {
  id: string;
  type: 'add' | 'edit' | 'delete' | 'import';
  message: string;
  time: string;
}

interface DashboardViewProps {
  records: BusinessRecord[];
  userName?: string;
  selectedYear?: string;
  availableYears?: string[];
  recordsByYear?: Record<string, BusinessRecord[]>;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onEditRecord: (record: BusinessRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onAddRecord: (record: BusinessRecord) => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
  onImportRecords?: (records: Partial<BusinessRecord>[]) => void;
  onSelectYear?: (year: string) => void;
  onOpenYearModal?: () => void;
  onAddYear?: (year: string) => void;
  onDeleteYear?: (year: string) => void;
  onRestoreRecords?: (newRecords: BusinessRecord[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  userName = 's2mth... Admin',
  selectedYear = '69',
  availableYears = ['69'],
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onEditRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onAddRecord,
  onShowToast,
  onImportRecords,
  onSelectYear,
  onOpenYearModal,
  onAddYear,
  onDeleteYear,
  onRestoreRecords,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalOnSearchChange || setLocalSearchQuery;

  // Active view tab: 'directory' | 'dashboard' | 'settings' | 'import'
  const [activeTab, setActiveTab] = useState<'directory' | 'dashboard' | 'settings' | 'import'>('directory');

  // Filter tab: 'all' | 'has_efiling' | 'no_efiling'
  const [filterTab, setFilterTab] = useState<'all' | 'has_efiling' | 'no_efiling'>('all');

  // Selected record for Detail Card View
  const [selectedId, setSelectedId] = useState<string>(() => (records.length > 0 ? records[0].id : ''));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activity Log & Toast notification state (3 seconds auto dismiss with timer ref)
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [showLogDropdown, setShowLogDropdown] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const logActivity = (type: ActivityLogItem['type'], message: string) => {
    const newItem: ActivityLogItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setActivityLogs((prev) => [newItem, ...prev.slice(0, 49)]);
    setCurrentNotification(message);

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = setTimeout(() => {
      setCurrentNotification(null);
    }, 5000);
  };

  // Currently selected record object
  const activeRecord = useMemo(() => {
    const found = records.find((r) => r.id === selectedId);
    if (found) return found;
    return records.length > 0 ? records[0] : null;
  }, [records, selectedId]);

  // Filtered records with strictly numeric sequence sorting (1, 2, 3... 189)
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (filterTab === 'has_efiling' && (!r.eFilingCode || !r.eFilingCode.trim())) return false;
        if (filterTab === 'no_efiling' && r.eFilingCode && r.eFilingCode.trim()) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (r.companyName || '').toLowerCase().includes(q);
          const matchTax = (r.taxId || '').toLowerCase().includes(q);
          const matchSeq = (r.sequenceNo || '').toLowerCase().includes(q);
          if (!matchName && !matchTax && !matchSeq) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const numA = parseInt(a.sequenceNo || '0', 10);
        const numB = parseInt(b.sequenceNo || '0', 10);
        let comp = numA - numB;
        if (comp === 0) comp = (a.sequenceNo || '').localeCompare(b.sequenceNo || '');
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [records, filterTab, searchQuery, sortOrder]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ', 'success');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportRecords) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result;
          const wb = XLSX.read(buffer, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json<any>(ws);
          if (data.length > 0) {
            const mapped = data.map((item, idx) => ({
              sequenceNo: String(item['ลำดับ'] || idx + 1).padStart(2, '0'),
              taxId: String(item['เลขประจำตัวผู้เสียภาษี'] || item['เลขภาษี'] || '').trim(),
              companyName: String(item['ชื่อกิจการ'] || item['ชื่อบริษัท'] || '').trim(),
              type: String(item['ประเภท'] || '').includes('หจก') ? ('partnership' as BusinessType) : ('company' as BusinessType),
              password: String(item['รหัสผ่าน'] || 'M0b!z2569').trim(),
              eFilingCode: String(item['e-Filing'] || item['รหัสผู้ใช้'] || '').trim(),
              auditorDate: String(item['ผู้ตรวจสอบ/วันที่'] || item['แจ้งผู้สอบบัญชี'] || '').trim(),
              remark: String(item['หมายเหตุ'] || '').trim(),
              status: 'pending' as BusinessStatus,
            }));
            onImportRecords(mapped);
            logActivity('import', `นำเข้าไฟล์จำนวน ${mapped.length} รายการ (${file.name})`);
            onShowToast(`นำเข้าไฟล์สำเร็จ ${mapped.length} รายการ`, 'นำเข้าสำเร็จ', 'success');
            setActiveTab('directory');
          } else {
            onShowToast('ไม่พบข้อมูลในไฟล์ Excel', 'แจ้งเตือน', 'error');
          }
        } catch {
          onShowToast('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel', 'ข้อผิดพลาด', 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  // Overview stats calculation for 2D Bar Chart
  const totalCount = records.length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;

  const maxStatCount = Math.max(1, completedCount, inProgressCount, pendingCount);
  const completedHeight = Math.round((completedCount / maxStatCount) * 100);
  const inProgressHeight = Math.round((inProgressCount / maxStatCount) * 100);
  const pendingHeight = Math.round((pendingCount / maxStatCount) * 100);

  // Overview left side search state with correct numeric sorting (1, 2, 3... 189)
  const [overviewSearch, setOverviewSearch] = useState('');
  const filteredOverviewRecords = useMemo(() => {
    return records
      .map((r, idx) => ({ ...r, originalIndex: idx + 1 }))
      .filter((r) => {
        if (!overviewSearch.trim()) return true;
        const q = overviewSearch.toLowerCase().trim();
        return (
          r.companyName.toLowerCase().includes(q) ||
          r.taxId.toLowerCase().includes(q) ||
          (r.sequenceNo || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const numA = parseInt(a.sequenceNo || '0', 10);
        const numB = parseInt(b.sequenceNo || '0', 10);
        return numA - numB;
      });
  }, [records, overviewSearch]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#f4f5f7] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-body select-none transition-colors relative">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating 3-second Notification Toast */}
      {currentNotification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700 dark:border-amber-400">
          <span className="material-symbols-outlined text-[20px] text-amber-400 dark:text-slate-900 animate-spin">
            notifications_active
          </span>
          <div className="flex flex-col text-xs">
            <span className="font-bold">บันทึกประวัติการแก้ไขระบบ</span>
            <span className="text-[11px] opacity-90">{currentNotification}</span>
          </div>
        </div>
      )}

      {/* 1. DISTINCT NAVBAR AT THE VERY TOP */}
      <nav className="h-16 bg-white dark:bg-[#111827] border-b border-slate-200/80 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-900 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
            <span>ภาพรวม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-amber-500 text-slate-900 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">folder</span>
            <span>ทะเบียนกิจการ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-slate-900 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>การตั้งค่า</span>
          </button>
        </div>

        {/* Right Controls: Fiscal Year + Activity Log + Dark Mode + Profile */}
        <div className="flex items-center gap-3">
          
          {/* Fiscal Year Switcher with Add/Delete */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>ปีบัญชี {selectedYear}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {showYearDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                    เลือกรอบปีบัญชี (Fiscal Years)
                  </span>
                  {onOpenYearModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowYearDropdown(false);
                        onOpenYearModal();
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      จัดการทั้งหมด
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar">
                  {availableYears && availableYears.map((yr) => (
                    <div
                      key={yr}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                        yr === selectedYear
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectYear) onSelectYear(yr);
                          setShowYearDropdown(false);
                          onShowToast(`สลับไปยังปีบัญชี ${yr}`, 'เปลี่ยนรอบปี', 'info');
                        }}
                        className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full ${yr === selectedYear ? 'bg-amber-500' : 'bg-transparent'}`} />
                        <span>ปีบัญชี {yr}</span>
                      </button>

                      {availableYears.length > 1 && onDeleteYear && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`ต้องการลบรอบปีบัญชี ${yr} หรือไม่?`)) {
                              onDeleteYear(yr);
                              onShowToast(`ลบรอบปี ${yr} สำเร็จ`, 'ลบสำเร็จ', 'success');
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบรอบปีนี้"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add new year inline */}
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={newYearInput}
                    onChange={(e) => setNewYearInput(e.target.value)}
                    placeholder="พิมพ์ปีใหม่ (เช่น 70)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newYearInput.trim() && onAddYear) {
                        onAddYear(newYearInput.trim());
                        setNewYearInput('');
                        setShowYearDropdown(false);
                        onShowToast(`เพิ่มรอบปี ${newYearInput.trim()} สำเร็จ`, 'สำเร็จ', 'success');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Activity Log Notification Button (Next to Dark Mode button) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLogDropdown(!showLogDropdown)}
              className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="ประวัติการแก้ไข (Activity Log)"
            >
              <span className="material-symbols-outlined text-[20px]">history</span>
              {activityLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono">
                  {activityLogs.length}
                </span>
              )}
            </button>

            {showLogDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white font-headline">
                    ประวัติการเพิ่ม/ลบ/แก้ไข (Activity Log)
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivityLogs([])}
                    className="text-[10px] text-rose-500 hover:underline font-bold"
                  >
                    ล้างประวัติ
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto no-scrollbar py-1">
                  {activityLogs.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">ยังไม่มีประวัติการแก้ไขในเซสชันนี้</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span className={`font-bold px-1.5 py-0.5 rounded-md ${
                            log.type === 'add' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            log.type === 'edit' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            log.type === 'delete' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                            'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span>{log.time}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{log.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle (Dark Mode) */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
            title={isDark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-900 font-extrabold text-xs flex items-center justify-center shadow-xs">
              S2
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[90px]">{userName}</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Admin</span>
            </div>
          </div>
        </div>
      </nav>

      {/* 2. MAIN VIEW SWITCHER / CONTENT */}
      <div className="flex-1 overflow-hidden flex flex-col p-5">
        {activeTab === 'directory' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 h-[calc(100vh-100px)] max-w-[1700px] w-full mx-auto overflow-hidden">
            
            {/* LEFT COLUMN: LIST VIEW (~72% - Scrollable with NO row limits) */}
            <div className="flex-1 lg:w-[72%] flex flex-col bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              
              {/* Header & Total Counter + Add & Import Buttons */}
              <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-headline tracking-tight">
                    ทะเบียนกิจการ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    รายชื่อนิติบุคคลและข้อมูลตรวจสอบความถูกต้อง DBD ประจำปี {selectedYear}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700 shrink-0">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-headline">
                      {records.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รายการ</span>
                  </div>

                  {/* Add Item Button */}
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span className="hidden sm:inline">เพิ่มรายการ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">upload_file</span>
                    <span className="hidden sm:inline">นำเข้า</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span className="hidden sm:inline">ลบรายการ</span>
                  </button>
                </div>
              </div>

              {/* Search & Sort Bar */}
              <div className="p-3.5 sm:px-5 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="relative flex-1 min-w-[220px]">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[18px]">search</span>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหากิจการ หรือเลขภาษี"
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">sort</span>
                  <span>เรียงตามลำดับ ({sortOrder === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'})</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: 'has_efiling', label: 'มีรหัส E-Filing' },
                  { id: 'no_efiling', label: 'ยังไม่มีรหัส' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id as any)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      filterTab === tab.id
                        ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable List Items container with NO row limits */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-0">
                {filteredRecords.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    ไม่พบรายการนิติบุคคลที่ค้นหา
                  </div>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const isSelected = activeRecord?.id === r.id;
                    const seqNum = r.sequenceNo || String(idx + 1).padStart(2, '0');

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all group ${
                          isSelected
                            ? 'bg-[#0f172a] text-white dark:bg-slate-800 dark:ring-1 dark:ring-amber-500/50'
                            : 'bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0 pr-3">
                          <span
                            className={`font-mono text-xs font-bold w-6 shrink-0 ${
                              isSelected ? 'text-amber-400' : 'text-slate-400'
                            }`}
                          >
                            {seqNum}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate font-headline ${
                                isSelected ? 'text-white dark:text-amber-300' : 'text-slate-900 dark:text-slate-100 group-hover:text-amber-600'
                              }`}
                            >
                              {r.companyName}
                            </h4>
                            <span
                              className={`text-[11px] font-mono truncate ${
                                isSelected ? 'text-slate-300' : 'text-slate-400 dark:text-slate-400'
                              }`}
                            >
                              {r.taxId || '0000000000000'}
                            </span>
                          </div>
                        </div>

                        {/* Status & Quick Edit button on the right - Larger Score Bar */}
                        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold inline-flex items-center gap-2 shadow-xs ${
                              r.status === 'completed'
                                ? isSelected
                                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-700'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
                                : r.status === 'in_progress'
                                ? isSelected
                                  ? 'bg-amber-950 text-amber-200 border border-amber-700'
                                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                                : isSelected
                                ? 'bg-slate-800 text-amber-300 border border-slate-700'
                                : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                            }`}
                          >
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                r.status === 'completed'
                                  ? 'bg-emerald-500 animate-pulse'
                                  : r.status === 'in_progress'
                                  ? 'bg-amber-500 animate-pulse'
                                  : 'bg-rose-500 animate-pulse'
                              }`}
                            />
                            <span>
                              {r.status === 'completed'
                                ? 'เสร็จสิ้น'
                                : r.status === 'in_progress'
                                ? 'กำลังทำ'
                                : 'รอดำเนินการ'}
                            </span>
                          </span>

                          {/* Quick Edit Button on the back of row */}
                          <button
                            type="button"
                            onClick={() => setEditingRecord(r)}
                            className={`p-2 rounded-xl transition-colors ${
                              isSelected
                                ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title="แก้ไขข้อมูล"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* List Footer Info */}
              <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between shrink-0">
                <span>แสดง {filteredRecords.length} จาก {records.length} รายการ</span>
                <span className="font-mono">Mustang Directory v2.5</span>
              </div>
            </div>

            {/* RIGHT COLUMN: DETAIL CARD VIEW (~28% - Fully visible with no truncation) */}
            <div className="w-full lg:w-[28%] flex flex-col shrink-0 overflow-y-auto no-scrollbar">
              {activeRecord ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/85 dark:border-slate-800 shadow-xl p-5 flex flex-col gap-4">
                  
                  {/* Card Top Tags & Company Name */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {activeRecord.type === 'partnership' ? 'หจก.' : 'บจก.'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono">
                        ลำดับ {activeRecord.sequenceNo || '1'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-headline leading-snug">
                      {activeRecord.companyName}
                    </h3>
                  </div>

                  {/* Status Display - Larger Score Bar Style */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {activeRecord.status === 'completed'
                          ? 'เสร็จสิ้น'
                          : activeRecord.status === 'in_progress'
                          ? 'กำลังดำเนินการ'
                          : 'รอดำเนินการ'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">สถานะ</span>
                  </div>

                  {/* Tax ID Section */}
                  <div className="flex flex-col gap-1 bg-slate-50/60 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      เลขผู้เสียภาษี
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tracking-tight truncate">
                        {activeRecord.taxId || '0994001000000'}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeRecord.taxId, 'เลขผู้เสียภาษี')}
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        <span className="material-symbols-outlined text-[13px]">content_copy</span>
                        <span>คัดลอก</span>
                      </button>
                    </div>
                  </div>

                  {/* Password / E-Filing Section */}
                  <div className="flex flex-col gap-1 bg-slate-50/60 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      รหัสผ่าน / E-Filing
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tracking-tight truncate">
                        {activeRecord.password || activeRecord.eFilingCode || '90696285'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            activeRecord.password || activeRecord.eFilingCode || '',
                            'รหัสผ่าน / E-Filing'
                          )
                        }
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        <span className="material-symbols-outlined text-[13px]">content_copy</span>
                        <span>คัดลอก</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-1 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRecord(activeRecord)}
                      className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      <span>แก้ไขข้อมูล</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(true)}
                      className="w-full py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>ดูรายละเอียด</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`ต้องการลบกิจการ "${activeRecord.companyName}" หรือไม่?`)) {
                          onDeleteRecord(activeRecord.id);
                          onShowToast(`ลบ ${activeRecord.companyName} เรียบร้อย`, 'ลบสำเร็จ', 'success');
                        }
                      }}
                      className="w-full py-2 rounded-2xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>ลบกิจการนี้</span>
                    </button>
                  </div>

                </div>
              ) : (
                <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center text-slate-400 text-xs">
                  กรุณาเลือกรายการทางด้านซ้าย
                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. OVERVIEW / ภาพรวม SCREEN WITH WIDER LEFT COMPACT LIST (WITH SEARCH & POPUP MODAL & NUMERICALLY SORTED SEQUENTIAL NUMBERING) AND RIGHT 2D BAR CHART */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] max-w-[1700px] w-full mx-auto overflow-hidden p-1">
            
            {/* LEFT SIDE: Wider Compact List with Search, Numerically Sorted Sequential Numbering & Popup Modal Trigger */}
            <div className="w-full lg:w-[45%] flex flex-col bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className="p-4 px-5 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[20px]">list_alt</span>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-headline">
                      รายการทะเบียนกิจการทั้งหมด ({filteredOverviewRecords.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                    ปี {selectedYear}
                  </span>
                </div>

                {/* Search input for overview compact list */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-[16px]">search</span>
                  </span>
                  <input
                    type="text"
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    placeholder="ค้นหากิจการหรือเลขภาษี..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 p-2">
                {filteredOverviewRecords.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">ไม่พบรายการกิจการ</div>
                ) : (
                  filteredOverviewRecords.map((r, index) => {
                    const seq = r.sequenceNo || String(index + 1).padStart(2, '0');
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedId(r.id);
                          setIsDetailModalOpen(true); // Open popup modal with details
                        }}
                        className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0 w-7">
                            #{seq}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-600">
                              {r.companyName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 truncate">{r.taxId}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'completed'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : r.status === 'in_progress'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {r.status === 'completed' ? 'เสร็จ' : r.status === 'in_progress' ? 'ทำ' : 'รอ'}
                          </span>
                          <span className="material-symbols-outlined text-[14px] text-slate-400 group-hover:text-amber-500">
                            open_in_new
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT SIDE: CLEAN 2D BAR CHART */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-8 justify-between">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white font-headline">
                    สถิติสถานะการดำเนินงาน (2D Analytics Breakdown)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    กราฟแท่ง 2D แสดงสัดส่วนสถานะกิจการรอบปีบัญชี {selectedYear}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">รวมทั้งสิ้น {totalCount} รายการ</span>
                </div>
              </div>

              {/* 2D Bar Chart Area */}
              <div className="flex-1 flex items-end justify-around gap-6 pt-12 pb-8 px-6 relative">
                {/* Background grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-slate-300 dark:border-slate-700 w-full" />
                  <div className="border-b border-slate-300 dark:border-slate-700 w-full" />
                  <div className="border-b border-slate-300 dark:border-slate-700 w-full" />
                  <div className="border-b border-slate-300 dark:border-slate-700 w-full" />
                </div>

                {/* Bar 1: Completed */}
                <div className="flex-1 flex flex-col items-center gap-3 z-10 h-full justify-end group">
                  <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    {completedCount} รายการ
                  </div>
                  <div className="w-full max-w-[100px] bg-emerald-50 dark:bg-emerald-950/20 rounded-t-2xl p-2 h-[260px] flex items-end">
                    <div
                      style={{ height: `${Math.max(15, completedHeight)}%` }}
                      className="w-full bg-emerald-500 rounded-t-xl transition-all duration-300 group-hover:bg-emerald-600 flex items-center justify-center text-white font-bold text-xs"
                    >
                      {completedCount > 0 && `${Math.round((completedCount / totalCount) * 100)}%`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                    <span>เสร็จสิ้นแล้ว</span>
                  </div>
                </div>

                {/* Bar 2: In Progress */}
                <div className="flex-1 flex flex-col items-center gap-3 z-10 h-full justify-end group">
                  <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    {inProgressCount} รายการ
                  </div>
                  <div className="w-full max-w-[100px] bg-amber-50 dark:bg-amber-950/20 rounded-t-2xl p-2 h-[260px] flex items-end">
                    <div
                      style={{ height: `${Math.max(15, inProgressHeight)}%` }}
                      className="w-full bg-amber-500 rounded-t-xl transition-all duration-300 group-hover:bg-amber-600 flex items-center justify-center text-white font-bold text-xs"
                    >
                      {inProgressCount > 0 && `${Math.round((inProgressCount / totalCount) * 100)}%`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                    <span>กำลังดำเนินการ</span>
                  </div>
                </div>

                {/* Bar 3: Pending */}
                <div className="flex-1 flex flex-col items-center gap-3 z-10 h-full justify-end group">
                  <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                    {pendingCount} รายการ
                  </div>
                  <div className="w-full max-w-[100px] bg-rose-50 dark:bg-rose-950/20 rounded-t-2xl p-2 h-[260px] flex items-end">
                    <div
                      style={{ height: `${Math.max(15, pendingHeight)}%` }}
                      className="w-full bg-rose-500 rounded-t-xl transition-all duration-300 group-hover:bg-rose-600 flex items-center justify-center text-white font-bold text-xs"
                    >
                      {pendingCount > 0 && `${Math.round((pendingCount / totalCount) * 100)}%`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shadow-xs" />
                    <span>รอดำเนินการ</span>
                  </div>
                </div>

              </div>

              {/* Overview Summary footer */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>คลิกรายการทางด้านซ้ายเพื่อเปิดดูป็อปอัพข้อมูลรายละเอียด</span>
                <span className="font-mono">Mustang Analytics v2.5</span>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'settings' && (
          <SettingsView
            records={records}
            selectedYear={selectedYear}
            userName={userName}
            onShowToast={onShowToast}
            onRestoreRecords={onRestoreRecords}
          />
        )}

        {activeTab === 'import' && (
          <ImportDocumentView
            selectedYear={selectedYear}
            existingRecords={records}
            onImportRecords={(items) => {
              if (onImportRecords) onImportRecords(items);
              setActiveTab('directory');
            }}
            onShowToast={onShowToast}
          />
        )}
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddBusinessModal
          allRecords={records}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(newRecord) => {
            onAddRecord(newRecord);
            setIsAddModalOpen(false);
            logActivity('add', `เพิ่มกิจการใหม่ "${newRecord.companyName}"`);
            onShowToast(`เพิ่มกิจการ "${newRecord.companyName}" สำเร็จ`, 'เพิ่มสำเร็จ', 'success');
          }}
          onShowToast={(msg) => onShowToast(msg)}
          nextSequenceNo={String(records.length + 1).padStart(2, '0')}
        />
      )}

      {editingRecord && (
        <EditBusinessModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={(updated) => {
            onEditRecord(updated);
            setEditingRecord(null);
            logActivity('edit', `แก้ไขข้อมูลกิจการ "${updated.companyName}"`);
            onShowToast(`อัปเดตข้อมูล ${updated.companyName} เรียบร้อย`, 'บันทึกสำเร็จ', 'success');
          }}
          onShowToast={(msg) => onShowToast(msg)}
        />
      )}

      {isDetailModalOpen && activeRecord && (
        <BusinessDetailModal
          record={activeRecord}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => {
            setIsDetailModalOpen(false);
            setEditingRecord(activeRecord);
          }}
          onDelete={(id) => {
            const recName = activeRecord.companyName;
            onDeleteRecord(id);
            setIsDetailModalOpen(false);
            logActivity('delete', `ลบกิจการ "${recName}"`);
            onShowToast('ลบรายการเรียบร้อย', 'ลบสำเร็จ', 'success');
          }}
          onStatusChange={(rec, newStatus) => {
            const updated = { ...rec, status: newStatus, updatedAt: new Date().toISOString() };
            onEditRecord(updated);
            logActivity('edit', `เปลี่ยนสถานะ "${rec.companyName}" เป็น ${newStatus}`);
          }}
          onShowToast={(msg) => onShowToast(msg)}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteBusinessModal
          records={records}
          onClose={() => setIsDeleteModalOpen(false)}
          onDelete={(ids) => {
            onDeleteMultiple(ids);
            setIsDeleteModalOpen(false);
            logActivity('delete', `ลบรายการจำนวน ${ids.length} รายการ`);
            onShowToast(`ลบรายการสำเร็จ ${ids.length} รายการ`, 'ลบสำเร็จ', 'success');
          }}
        />
      )}
    </div>
  );
};
