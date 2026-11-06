import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BusinessRecord } from '../types';
import { AnnualTasksView } from './AnnualTasksView';
import { AddBusinessModal } from './AddBusinessModal';
import { BusinessDetailModal } from './BusinessDetailModal';
import { EditBusinessModal } from './EditBusinessModal';
import { SettingsView } from './SettingsView';
import { ImportDocumentView } from './ImportDocumentView';
import { ExcelMappingImportModal } from './ExcelMappingImportModal';
import { DeleteBusinessModal } from './DeleteBusinessModal';
import '../m101-zincesign.css';
import '../m101-business-theme.css';
import { parseDocumentFile } from '../utils/excelHelper';
import { DSBadge, DSButton, DSInput } from '../design-system/components';

function AnimatedCount({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    const target = Number.isFinite(value) ? value : 0;
    if (window.matchMedia('(prefers-zincuced-motion: zincuce)').matches) {
      setDisplayValue(target);
      return;
    }
    let frame = 0;
    let start = 0;
    const duration = 420;
    const tick = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);
  return <>{displayValue.toLocaleString('th-TH')}</>;
}

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
  onRestoreRecords?: (newRecords: BusinessRecord[]) => void;
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
  isLoggedIn: boolean;
  isAdmin?: boolean;
  isVisitor?: boolean;
  onReturnToLogin?: () => void;
  onToggleLogin: () => void;
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
  isLoggedIn,
  isAdmin = false,
  isVisitor = false,
  onReturnToLogin,
  onToggleLogin,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [draggedRecordId, setDraggedRecordId] = useState<string | null>(null);
  const [dragOverRecordId, setDragOverRecordId] = useState<string | null>(null);
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalOnSearchChange || setLocalSearchQuery;

  // Active view tab: 'directory' | 'dashboard' | 'settings' | 'import'
  const [activeTab, setActiveTab] = useState<'directory' | 'dashboard' | 'settings' | 'import' | 'tasks'>('dashboard');
  const [showNavigationProgress, setShowNavigationProgress] = useState(false);
  const navigationProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  const ownerTapRef = useRef<{ count: number; lastTap: number }>({ count: 0, lastTap: 0 });
  const handleOwnerLogoTap = () => {
    if (!isAdmin) return;
    const now = Date.now();
    // Mobile taps are slower than desktop double-clicks; allow a forgiving 6-second window.
    if (now - ownerTapRef.current.lastTap > 6000) ownerTapRef.current.count = 0;
    ownerTapRef.current.lastTap = now;
    ownerTapRef.current.count += 1;
    const remaining = 5 - ownerTapRef.current.count;
    if (remaining > 0) {
      onShowToast(`แตะไอคอน M อีก ${remaining} ครั้งเพื่อเปิดเมนูลับ`, 'เมนูผู้ดูแล', 'info');
      return;
    }
    ownerTapRef.current.count = 0;
    window.dispatchEvent(new Event('m101:mobile-owner-access'));
    onShowToast('กำลังเปิดเมนูผู้ดูแล', 'ยืนยันตัวตนผู้ดูแลแล้ว', 'success');
  };
  const commandItems = [
    { id: 'directory', label: 'ทะเบียนกิจการ', hint: 'เปิดรายการกิจการ', icon: 'folder_open', action: () => navigateToTab('directory') },
    { id: 'dashboard', label: 'ภาพรวม', hint: 'ดูสถิติและสถานะงาน', icon: 'space_dashboard', action: () => navigateToTab('dashboard') },
    ...(isLoggedIn ? [{ id: 'tasks', label: 'งานประจำปี', hint: 'จัดการงานประจำปี', icon: 'task_alt', action: () => navigateToTab('tasks') }] : []),
    ...(isLoggedIn ? [{ id: 'import', label: 'นำเข้าข้อมูล', hint: 'นำเข้า Excel หรือ CSV', icon: 'file_upload', action: () => navigateToTab('import') }] : []),
    ...(isLoggedIn ? [{ id: 'settings', label: 'ตั้งค่าระบบ', hint: 'การตั้งค่าและสำรองข้อมูล', icon: 'settings', action: () => navigateToTab('settings') }] : []),
    { id: 'search', label: 'ค้นหากิจการ', hint: 'ค้นหาจากชื่อ เลขทะเบียน หรือรหัส', icon: 'search', action: () => { navigateToTab('directory'); window.setTimeout(() => document.querySelector<HTMLInputElement>('input[placeholder*="ค้นหา"], input[placeholder*="Search"]')?.focus(), 80); } },
  ];
  const handleMagneticMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
    event.currentTarget.style.transform = `translate3d(${(x * 3).toFixed(1)}px, ${(y * 3).toFixed(1)}px, 0)`;
  };
  const resetMagnetic = (event: React.PointerEvent<HTMLButtonElement>) => { event.currentTarget.style.transform = ''; };
  const updateSpotlight = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  };
  const filtezincCommandItems = commandItems.filter((item) => `${item.label} ${item.hint}`.toLocaleLowerCase('th-TH').includes(commandQuery.trim().toLocaleLowerCase('th-TH')));
  useEffect(() => {
    const handleCommandShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen((open) => !open);
        setCommandQuery('');
      } else if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleCommandShortcut);
    return () => window.removeEventListener('keydown', handleCommandShortcut);
  }, []);
  useEffect(() => {
    if (!commandOpen) return;
    const frame = window.requestAnimationFrame(() => commandInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [commandOpen]);

  // Filter tab: 'all' | 'has_efiling' | 'no_efiling'
  const [filterTab, setFilterTab] = useState<'all' | 'has_efiling' | 'no_efiling'>('all');

  // Selected record for Detail Card View
  const [selectedId, setSelectedId] = useState<string>(() => (records.length > 0 ? records[0].id : ''));
  const [inlineConfirmDelete, setInlineConfirmDelete] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BusinessRecord | null>(null);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExcelMappingOpen, setIsExcelMappingOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const activeTabRef = useRef(activeTab);

  // Save the outgoing tab's scroll position before switching views.
  const navigateToTab = (nextTab: typeof activeTab) => {
    if (nextTab === activeTabRef.current) return;
    const container = mainContentRef.current;
    if (container) scrollPositionsRef.current[activeTabRef.current] = container.scrollTop;
    activeTabRef.current = nextTab;
    setShowNavigationProgress(true);
    if (navigationProgressTimerRef.current) clearTimeout(navigationProgressTimerRef.current);
    navigationProgressTimerRef.current = setTimeout(() => {
      setShowNavigationProgress(false);
      navigationProgressTimerRef.current = null;
    }, 520);
    setActiveTab(nextTab);
  };

  useEffect(() => () => {
    if (navigationProgressTimerRef.current) clearTimeout(navigationProgressTimerRef.current);
  }, []);

  useEffect(() => {
    const handleOwnerNavigate = (event: Event) => {
      if (!isAdmin) return;
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (tab === 'directory' || tab === 'dashboard' || tab === 'tasks' || tab === 'import' || tab === 'settings') navigateToTab(tab);
    };
    window.addEventListener('m101:owner-navigate', handleOwnerNavigate);
    return () => window.removeEventListener('m101:owner-navigate', handleOwnerNavigate);
  }, [isAdmin]);

  // Restore the destination tab's position after React has rendezinc it.
  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;
    container.scrollTo({ top: scrollPositionsRef.current[activeTab] ?? 0, behavior: 'auto' });
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!showProfileDropdown) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfileDropdown(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileDropdown]);

  // Sync selectedId when records change or item is deleted
  useEffect(() => {
    setInlineConfirmDelete(false);
  }, [selectedId]);

  useEffect(() => {
    if (records.length > 0) {
      setSelectedId((prev) => {
        if (!prev || !records.some((r) => r.id === prev)) {
          return records[0].id;
        }
        return prev;
      });
    } else {
      setSelectedId('');
    }
  }, [records]);

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

  // Filtezinc records with strictly numeric sequence sorting (1, 2, 3... 189)
  const filtezincRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (filterTab === 'has_efiling' && (!r.eFilingCode || !r.eFilingCode.trim())) return false;
        if (filterTab === 'no_efiling' && r.eFilingCode && r.eFilingCode.trim()) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const searchableFields = [
            r.companyName,
            r.taxId,
            r.sequenceNo,
            r.eFilingCode,
            r.ssoCode,
            r.remark,
            r.topic,
            r.auditorDate,
            r.type === 'partnership' ? 'หจก ห้างหุ้นส่วน partnership' : 'บจก บริษัท company',
            r.status === 'completed' ? 'เสร็จสิ้น completed' : r.status === 'in_progress' ? 'กำลังทำ กำลังดำเนินการ in progress' : 'รอดำเนินการ pending',
          ];
          const matches = searchableFields.some((field) =>
            String(field ?? '').toLocaleLowerCase('th-TH').includes(q)
          );
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const numA = parseInt((a.sequenceNo || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.sequenceNo || '').replace(/\D/g, '') || '0', 10);
        let comp = numA - numB;
        if (comp === 0) comp = (a.sequenceNo || '').localeCompare(b.sequenceNo || '');
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [records, filterTab, searchQuery, sortOrder]);
  const canReorderRecords = isLoggedIn && Boolean(onRestoreRecords) && !searchQuery?.trim() && filterTab === 'all' && sortOrder === 'asc';
  const reorderRecords = (targetId: string) => {
    if (!draggedRecordId || draggedRecordId === targetId || !canReorderRecords || !onRestoreRecords) return;
    const reordezinc = [...filtezincRecords];
    const from = reordezinc.findIndex((record) => record.id === draggedRecordId);
    const to = reordezinc.findIndex((record) => record.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = reordezinc.splice(from, 1);
    reordezinc.splice(to, 0, moved);
    const withSequence = reordezinc.map((record, index) => ({ ...record, sequenceNo: String(index + 1).padStart(2, '0') }));
    onRestoreRecords(withSequence);
    onShowToast('จัดลำดับกิจการและบันทึกแล้ว', 'เปลี่ยนลำดับสำเร็จ', 'success');
    setDraggedRecordId(null);
    setDragOverRecordId(null);
  };


  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ', 'success');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onShowToast(`กำลังอ่านไฟล์ ${file.name}...`, 'นำเข้าข้อมูล', 'info');
      const parsed = await parseDocumentFile(file, file.name);
      if (parsed.length > 0 && onImportRecords) {
        onImportRecords(parsed);
        logActivity('import', `นำเข้าไฟล์จำนวน ${parsed.length} รายการ (${file.name})`);
        navigateToTab('directory');
      } else {
        onShowToast(`ไม่พบข้อมูลในไฟล์ ${file.name}`, 'แจ้งเตือน', 'error');
      }
    } catch {
      onShowToast(`เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}`, 'ข้อผิดพลาด', 'error');
    }
    e.target.value = '';
  };

  // Overview stats calculation for 2D Bar Chart
  const totalCount = records.length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  // Treat blank/unknown legacy statuses as not completed so the dashboard never overstates progress.
  const pendingCount = records.filter((r) => r.status !== 'completed' && r.status !== 'in_progress').length;
  const completionPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
  const businessTypeBreakdown = [
    { key: 'company', label: 'บริษัท' },
    { key: 'partnership', label: 'ห้างหุ้นส่วน' },
    { key: 'individual', label: 'บุคคลธรรมดา' },
    { key: 'other', label: 'อื่น ๆ / ไม่ระบุ' },
  ].map((group) => {
    const groupRecords = records.filter((record) =>
      group.key === 'other'
        ? !['company', 'partnership', 'individual'].includes(String(record.type))
        : record.type === group.key
    );
    const done = groupRecords.filter((record) => record.status === 'completed').length;
    return {
      ...group,
      total: groupRecords.length,
      done,
      notDone: groupRecords.length - done,
      donePercent: groupRecords.length ? Math.round((done / groupRecords.length) * 100) : 0,
    };
  }).filter((group) => group.total > 0);


  return (
    <div className="m101-app-shell mobile-app-shell m101-workspace-shell flex-1 flex flex-col min-h-screen overflow-y-auto bg-[#f4f5f7] text-slate-900 font-body relative">
      {showNavigationProgress && (
        <div className="m101-top-loading" role="progressbar" aria-label="กำลังเปลี่ยนหน้า" aria-valuemin={0} aria-valuemax={100}>
          <span />
        </div>
      )}
      {commandOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
          <section className="m101-command-palette w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="m101-command-title">
            <h2 id="m101-command-title" className="sr-only">ค้นหาเมนูและคำสั่ง</h2>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input ref={commandInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && filtezincCommandItems[0]) { filtezincCommandItems[0].action(); setCommandOpen(false); } }} placeholder="พิมพ์เพื่อค้นหาเมนู..." className="h-14 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:ring-0 dark:text-white" />
              <kbd className="rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-400 dark:border-slate-700">ESC</kbd>
            </div>
            <div className="max-h-[min(55vh,420px)] overflow-y-auto p-2">
              {filtezincCommandItems.length ? filtezincCommandItems.map((item) => (
                <button key={item.id} type="button" onClick={() => { item.action(); setCommandOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><span className="material-symbols-outlined text-[19px]">{item.icon}</span></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</span><span className="mt-0.5 block text-xs text-slate-400">{item.hint}</span></span>
                  <span className="text-xs text-slate-300">↵</span>
                </button>
              )) : <p className="px-4 py-8 text-center text-sm text-slate-400">ไม่พบเมนูที่ตรงกัน</p>}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800"><span>ค้นหาเมนูใน M101</span><span><kbd className="rounded border px-1.5 py-0.5">Ctrl</kbd> + <kbd className="rounded border px-1.5 py-0.5">K</kbd> เพื่อเปิด</span></div>
          </section>
        </div>
      )}
      
      <aside className="m101-sidebar m101-primary-sidebar" aria-label="เมนูหลัก">
        <div className="m101-sidebar-brand"><button type="button" onClick={handleOwnerLogoTap} aria-label="M101" className="m101-brand-mark">M</button><div><strong>M101</strong><span>Business Directory</span></div></div>
        <div className="m101-nav-section-label">เมนูหลัก</div>
        <button type="button" onClick={() => navigateToTab("dashboard")} className={"m101-side-link " + (activeTab === "dashboard" ? "is-active" : "")}><span className="material-symbols-outlined">space_dashboard</span><span>ภาพรวมระบบ</span><span className="m101-side-count">{records.length}</span></button>
        <button type="button" onClick={() => navigateToTab("directory")} className={"m101-side-link " + (activeTab === "directory" ? "is-active" : "")}><span className="material-symbols-outlined">folder_open</span><span>ทะเบียนกิจการ</span></button>
        {isLoggedIn && <button type="button" onClick={() => navigateToTab("tasks")} className={"m101-side-link " + (activeTab === "tasks" ? "is-active" : "")}><span className="material-symbols-outlined">event_note</span><span>งานประจำปี</span></button>}
        {isLoggedIn && <button type="button" onClick={() => navigateToTab("import")} className={"m101-side-link " + (activeTab === "import" ? "is-active" : "")}><span className="material-symbols-outlined">upload_file</span><span>นำเข้า / ส่งออก</span></button>}
        {isLoggedIn && <button type="button" onClick={() => navigateToTab("settings")} className={"m101-side-link " + (activeTab === "settings" ? "is-active" : "")}><span className="material-symbols-outlined">settings</span><span>ตั้งค่าระบบ</span></button>}
        <div className="m101-sidebar-spacer" /><div className="m101-sidebar-foot"><span className="m101-status-dot" /><div><strong>สถานะฐานข้อมูล</strong><span>Cloudflare D1</span></div></div>
      </aside>
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
        <div className="fixed top-20 right-6 z-50 bg-slate-900 dark:bg-zinc-500 text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700 dark:border-zinc-400">
          <span className="material-symbols-outlined text-[20px] text-zinc-400 dark:text-slate-900 animate-spin">
            notifications_active
          </span>
          <div className="flex flex-col text-xs">
            <span className="font-bold">บันทึกประวัติการแก้ไขระบบ</span>
            <span className="text-[11px] opacity-90">{currentNotification}</span>
          </div>
        </div>
      )}

      {/* 1. DISTINCT NAVBAR AT THE VERY TOP */}
      <nav className="mobile-app-nav m101-topbar min-h-16 bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0 z-30" aria-label="เครื่องมือและการตั้งค่ารอบปี">
        <div className="m101-page-context">
          <strong>{activeTab === "dashboard" ? "ภาพรวมระบบ" : activeTab === "directory" ? "ทะเบียนกิจการ" : activeTab === "tasks" ? "งานประจำปี" : activeTab === "import" ? "นำเข้า / ส่งออกข้อมูล" : "ตั้งค่าระบบ"}</strong>
          <span>จัดการข้อมูลกิจการและเอกสารในที่เดียว</span>
        </div>
        {/* Primary navigation is in the workspace sidebar. */}
        <div className="m101-global-search" role="search">
          <span className="material-symbols-outlined" aria-hidden="true">search</span>
          <input
            type="search"
            aria-label="ค้นหาทะเบียนกิจการ"
            placeholder="ค้นหาชื่อกิจการ เลขทะเบียน…"
            value={searchQuery}
            onChange={(event) => onSearchChange?.(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="mobile-utility-nav m101-topbar-actions flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          
          {/* Fiscal Year Switcher with Add/Delete */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowYearDropdown(!showYearDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
              <span>ปีบัญชี {selectedYear}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {showYearDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                    เลือกรอบปีบัญชี (Fiscal Years)
                  </span>
                  {isLoggedIn && onOpenYearModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowYearDropdown(false);
                        onOpenYearModal();
                      }}
                      className="text-[11px] text-zinc-600 dark:text-zinc-400 font-bold hover:underline"
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
                          ? 'bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
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
                        <span className={`w-2 h-2 rounded-full ${yr === selectedYear ? 'bg-zinc-500' : 'bg-transparent'}`} />
                        <span>ปีบัญชี {yr}</span>
                      </button>

                      {isLoggedIn && availableYears.length > 1 && onDeleteYear && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`ต้องการลบรอบปีบัญชี ${yr} หรือไม่?`)) {
                              onDeleteYear(yr);
                              onShowToast(`ลบรอบปี ${yr} สำเร็จ`, 'ลบสำเร็จ', 'success');
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-zinc-600 transition-colors"
                          title="ลบรอบปีนี้"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {isLoggedIn && (
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
                    className="px-3 py-1.5 bg-slate-900 dark:bg-zinc-500 text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>
                )}
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
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-zinc-500 text-white text-[9px] font-bold flex items-center justify-center font-mono">
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
                    className="text-[10px] text-zinc-500 hover:underline font-bold"
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
                            log.type === 'add' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300' :
                            log.type === 'edit' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300' :
                            log.type === 'delete' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300' :
                            'bg-zinc-100 text-zinc-800 dark:bg-zinc-950 dark:text-zinc-300'
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

          {/* Profile menu */}
          <div className="relative pl-2 border-l border-slate-200 dark:border-slate-800" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={showProfileDropdown}
              aria-label="เปิดเมนูบัญชีผู้ใช้"
              title="เมนูบัญชีผู้ใช้"
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
            >
              <span className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200 font-extrabold text-xs flex items-center justify-center shadow-xs">
                {(userName.trim().charAt(0) || 'U').toUpperCase()}
              </span>
              <span className="hidden lg:flex flex-col items-start min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px]">{userName}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{isVisitor ? 'ผู้เยี่ยมชม · ดูอย่างเดียว' : isAdmin ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</span>
              </span>
              <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">expand_more</span>
            </button>

            {showProfileDropdown && (
              <div role="menu" aria-label="เมนูบัญชีผู้ใช้" className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">บัญชีที่กำลังใช้งาน</p>
                  <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white break-words">{userName}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{isVisitor ? 'โหมดผู้เยี่ยมชม · ดูข้อมูลอย่างเดียว' : isAdmin ? 'ผู้ดูแลระบบ' : 'สมาชิก'}</p>
                </div>
                {isVisitor && onReturnToLogin ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setShowProfileDropdown(false); onReturnToLogin(); }}
                    className="mt-1 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    เข้าสู่ระบบ
                  </button>
                ) : isLoggedIn ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setShowProfileDropdown(false); onToggleLogin(); }}
                    className="mt-1 w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950/30 text-left"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    ออกจากระบบ
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 2. MAIN VIEW SWITCHER / CONTENT */}
      <div ref={mainContentRef} className="mobile-main-content flex-1 min-h-0 overflow-auto flex flex-col p-3 sm:p-5">
        <div key={activeTab} className="m101-tab-transition min-h-full">
        {activeTab === 'directory' && (
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 min-h-[calc(100vh-100px)] max-w-[1800px] w-full mx-auto overflow-visible m101-directory-shell">
            
            {/* LEFT COLUMN: LIST VIEW (~72% - Scrollable with NO row limits) */}
            <div className="min-w-0 min-h-[60vh] xl:min-h-0 flex flex-col bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden m101-directory-list-panel">
              
              {/* Header & Total Counter + Add & Import Buttons */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 shrink-0 m101-directory-toolbar">
                <div className="flex flex-col">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-headline tracking-tight">
                    ทะเบียนกิจการ
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    รายชื่อนิติบุคคลและข้อมูลตรวจสอบความถูกต้อง DBD ประจำปี {selectedYear}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-headline">
                      {records.length}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รายการ</span>
                  </div>

                  {/* Add Item Button */}
                  {isLoggedIn && (
                    <DSButton type="button" variant="primary" onClick={() => setIsAddModalOpen(true)} className="h-10 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>เพิ่มกิจการ</span>
                    </DSButton>
                  )}

                  {isLoggedIn && (
                    <>
                      <DSButton type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="h-10 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        <span>นำเข้าไฟล์</span>
                      </DSButton>
                      <DSButton type="button" variant="secondary" onClick={() => setIsExcelMappingOpen(true)} className="flex items-center gap-1.5" title="นำเข้าไฟล์โดยเลือก Sheet และจับคู่คอลัมน์เอง">
                        <span className="material-symbols-outlined text-[16px]">table_chart</span>
                        <span>จับคู่คอลัมน์</span>
                      </DSButton>
                    </>
                  )}
                  
                  {isLoggedIn && (
                    <DSButton type="button" variant="danger" onClick={() => setIsDeleteModalOpen(true)} className="h-10 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      <span>ลบหลายรายการ</span>
                    </DSButton>
                  )}
                </div>
              </div>


              {/* Directory controls */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                  <div className="relative flex-1 min-w-0">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400"><span className="material-symbols-outlined text-[19px]">search</span></span>
                    <DSInput type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อกิจการ เลขทะเบียน เลขภาษี E-Filing หรือ SSO" aria-label="ค้นหาทะเบียนกิจการ" className="ds-directory-search" />
                  </div>
                  <DSButton type="button" variant="secondary" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="inline-flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">swap_vert</span> ลำดับ {sortOrder === 'asc' ? 'น้อย → มาก' : 'มาก → น้อย'}
                  </DSButton>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2" role="group" aria-label="กรองรายการ">
                    {[
                      { id: 'all', label: 'ทั้งหมด', count: records.length },
                      { id: 'has_efiling', label: 'มี E-Filing', count: records.filter((r) => Boolean(r.eFilingCode?.trim())).length },
                      { id: 'no_efiling', label: 'ไม่มี E-Filing', count: records.filter((r) => !r.eFilingCode?.trim()).length },
                    ].map((tab) => (
                      <DSButton key={tab.id} type="button" variant={filterTab === tab.id ? 'primary' : 'secondary'} onClick={() => setFilterTab(tab.id as any)} className="inline-flex items-center gap-2">
                        {tab.label}<span className={`text-[10px] ${filterTab === tab.id ? 'text-zinc-100' : 'text-slate-400'}`}>{tab.count}</span>
                      </DSButton>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">พบ {filtezincRecords.length.toLocaleString('th-TH')} จาก {records.length.toLocaleString('th-TH')} กิจการ</span>
                </div>
              </div>
              <div className="m101-record-list flex-1 overflow-auto min-h-0 bg-white dark:bg-slate-950">
                {filtezincRecords.length === 0 ? (
                  <div className="min-h-[280px] flex flex-col items-center justify-center text-center px-6">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">search_off</span>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">ไม่พบกิจการที่ตรงกับการค้นหา</p>
                    <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                    <DSButton type="button" variant="ghost" onClick={() => { setSearchQuery(''); setFilterTab('all'); }} className="mt-4">ล้างตัวกรอง</DSButton>
                  </div>
                ) : (
                  <table className="ds-table w-full min-w-[820px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-3 font-bold w-16">ลำดับ</th><th className="px-4 py-3 font-bold">กิจการ / เลขประจำตัวผู้เสียภาษี</th><th className="px-4 py-3 font-bold">E-Filing</th><th className="px-4 py-3 font-bold">ประกันสังคม</th><th className="px-4 py-3 font-bold">สถานะงาน</th><th className="px-4 py-3 font-bold w-16 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtezincRecords.map((r, idx) => {
                        const isSelected = activeRecord?.id === r.id;
                        const seqNum = r.sequenceNo || String(idx + 1).padStart(2, '0');
                        const statusLabel = r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ';
                        
                        return (
                          <tr key={r.id} draggable={canReorderRecords}
                            onDragStart={(event) => { if (!canReorderRecords) { event.preventDefault(); return; } setDraggedRecordId(r.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', r.id); }}
                            onDragOver={(event) => { if (draggedRecordId && canReorderRecords) { event.preventDefault(); setDragOverRecordId(r.id); } }}
                            onDrop={(event) => { event.preventDefault(); reorderRecords(r.id); }}
                            onDragEnd={() => { setDraggedRecordId(null); setDragOverRecordId(null); }}
                            onClick={() => setSelectedId(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(r.id); } }} tabIndex={0} aria-selected={isSelected} className={`group cursor-pointer border-b border-slate-100 dark:border-slate-800/80 transition-colors focus:outline-none focus:bg-zinc-50 dark:focus:bg-zinc-950/30 ${isSelected ? 'bg-zinc-50/80 dark:bg-zinc-950/25' : 'hover:bg-slate-50 dark:hover:bg-slate-900/70'} ${draggedRecordId === r.id ? 'opacity-40' : ''} ${dragOverRecordId === r.id ? 'border-t-2 border-t-zinc-500' : ''}`}>
                            <td className="px-4 py-4 align-middle"><span className={`font-mono text-xs font-bold ${isSelected ? 'text-zinc-700 dark:text-zinc-300' : 'text-slate-400'}`}>{seqNum}</span></td>
                            <td className="px-4 py-4 align-middle"><div className="flex items-center gap-3 min-w-0"><span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${r.type === 'partnership' ? 'bg-zinc-50 text-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300' : r.type === 'individual' ? 'bg-zinc-50 text-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300' : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300'}`}>{r.type === 'partnership' ? 'ห.' : 'บ.'}</span><div className="min-w-0"><div className={`text-sm font-bold truncate max-w-[360px] ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-slate-800 dark:text-slate-100'}`}>{r.companyName}</div><div className="mt-1 text-[11px] text-slate-400 font-mono">{isLoggedIn ? (r.taxId || '—') : (r.taxId ? `${r.taxId.slice(0,4)}*********` : '—')}</div></div></div></td>
                            <td className="px-4 py-4 align-middle"><span className={`text-xs font-mono ${r.eFilingCode ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{r.eFilingCode || '—'}</span></td>
                            <td className="px-4 py-4 align-middle"><span className={`text-xs font-mono ${r.ssoCode ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>{r.ssoCode || '—'}</span></td>
                            <td className="px-4 py-4 align-middle"><DSBadge variant={r.status === 'completed' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'}>{statusLabel}</DSBadge></td>
                            <td className="px-4 py-4 align-middle text-right">{isLoggedIn ? <DSButton type="button" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingRecord(r); }} className="ds-table-action" title="แก้ไขกิจการ" aria-label={`แก้ไขกิจการ ${r.companyName}`}><span className="material-symbols-outlined text-[18px]">edit</span></DSButton> : <span className="text-slate-300">›</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {canReorderRecords && <p className="px-5 py-2 text-[10px] text-slate-400">ลากแถวเพื่อจัดลำดับกิจการใหม่ · ระบบจะบันทึกลำดับให้อัตโนมัติ</p>}
              <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0"><span>กำลังแสดง {filtezincRecords.length.toLocaleString('th-TH')} รายการ</span><span>เลือกแถวเพื่อดูรายละเอียด</span></div>
            </div>
            {/* RIGHT COLUMN: DETAIL CARD VIEW */}
            {/* RIGHT COLUMN: DETAIL CARD VIEW (~28% - Fully visible with no truncation) */}
            <div className="w-full xl:w-[360px] flex flex-col shrink-0 overflow-y-auto no-scrollbar">
              {activeRecord ? (
                <div className="m101-selected-record-card bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/85 dark:border-slate-800 shadow-xl p-5 flex flex-col gap-4">
                  
                  {/* Card Top Tags & Company Name */}
                  <div className="flex flex-col gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {activeRecord.type === 'partnership' ? 'หจก.' : 'บจก.'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-950/60 text-zinc-700 dark:text-zinc-300 font-mono">
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
                      <span className="w-3 h-3 rounded-full bg-zinc-500 animate-pulse" />
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
                        {isLoggedIn 
                          ? (activeRecord.taxId || '0994001000000') 
                          : `${(activeRecord.taxId || '0994001000000').slice(0, 4)}*********`}
                      </span>
                      {isLoggedIn && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(activeRecord.taxId, 'เลขผู้เสียภาษี')}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500/30"
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          <span>คัดลอก</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password / E-Filing Section */}
                  <div className="flex flex-col gap-1 bg-slate-50/60 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      รหัสผ่าน / E-Filing
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tracking-tight truncate">
                        {isLoggedIn ? (activeRecord.password || activeRecord.eFilingCode || '90696285') : '********'}
                      </span>
                      {isLoggedIn && (
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
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="pt-1 flex flex-col gap-2">
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => setEditingRecord(activeRecord)}
                        className="w-full h-11 px-4 rounded-xl bg-zinc-700 hover:bg-zinc-800 active:bg-zinc-900 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/20"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        <span>แก้ไขข้อมูล</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(true)}
                      className="w-full h-11 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-zinc-500/15"
                    >
                      <span className="material-symbols-outlined text-[17px] text-zinc-500">visibility</span>
                      <span>ดูรายละเอียด</span>
                    </button>

                    {isLoggedIn && (inlineConfirmDelete ? (
                      <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 flex flex-col gap-2 animate-in fade-in">
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-center">
                          ยืนยันต้องการลบกิจการนี้?
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setInlineConfirmDelete(false)}
                            className="flex-1 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInlineConfirmDelete(false);
                              onDeleteRecord(activeRecord.id);
                              logActivity('delete', `ลบกิจการ "${activeRecord.companyName}"`);
                              onShowToast(`ลบ ${activeRecord.companyName} เรียบร้อย`, 'ลบสำเร็จ', 'success');
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-zinc-600 hover:bg-zinc-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                          >
                            ยืนยันลบ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setInlineConfirmDelete(true)}
                        className="w-full h-10 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950/40 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        <span>ลบกิจการนี้</span>
                      </button>
                    ))}
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

        {/* Redesigned overview workspace */}
        {activeTab === 'dashboard' && (
          <section className="m101-overview w-full max-w-[1500px] mx-auto flex flex-col gap-6">
            <header className="m101-overview-header">
              <div>
                <p className="m101-eyebrow">WORKSPACE OVERVIEW</p>
                <h1>ภาพรวมทะเบียนกิจการ</h1>
                <p>สรุปสถานะงานและเข้าถึงข้อมูลที่ต้องจัดการในรอบปีบัญชี {selectedYear}</p>
              </div>
              <div className="m101-overview-actions">
                <button type="button" onClick={() => navigateToTab('directory')} className="m101-button-secondary" onPointerMove={handleMagneticMove} onPointerLeave={resetMagnetic}>เปิดทะเบียนทั้งหมด <span aria-hidden="true">→</span></button>
                {isLoggedIn && <button type="button" onClick={() => navigateToTab('import')} className="m101-button-primary" onPointerMove={handleMagneticMove} onPointerLeave={resetMagnetic}>นำเข้าข้อมูล</button>}
              </div>
            </header>

            <div className="m101-overview-metrics" aria-label="สรุปจำนวนกิจการ">
              <article className="m101-metric-card m101-metric-total" onPointerMove={updateSpotlight}>
                <span className="m101-metric-label">กิจการทั้งหมด</span>
                <strong><AnimatedCount value={totalCount} /></strong>
                <span className="m101-metric-foot">รายการในปีบัญชี {selectedYear}</span>
              </article>
              <article className="m101-metric-card" onPointerMove={updateSpotlight}>
                <span className="m101-metric-label">เสร็จสิ้น</span>
                <strong><AnimatedCount value={completedCount} /></strong>
                <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-done" /> ดำเนินการเรียบร้อย</span>
              </article>
              <article className="m101-metric-card">
                <span className="m101-metric-label">กำลังดำเนินการ</span>
                <strong><AnimatedCount value={inProgressCount} /></strong>
                <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-progress" /> อยู่ระหว่างจัดการ</span>
              </article>
              <article className="m101-metric-card">
                <span className="m101-metric-label">รอดำเนินการ</span>
                <strong><AnimatedCount value={pendingCount} /></strong>
                <span className="m101-metric-foot"><i className="m101-status-dot m101-dot-pending" /> ยังไม่เริ่มดำเนินการ</span>
              </article>
            </div>

            {isLoggedIn && <AnnualTasksView records={records} selectedYear={selectedYear} isLoggedIn={isLoggedIn} onShowToast={onShowToast} onOpenTasks={() => navigateToTab('tasks')} mode="summary" />}

            <div className="m101-overview-grid">
              <section className="m101-overview-panel m101-status-panel">
                <div className="m101-panel-heading m101-status-heading">
                  <div><p className="m101-eyebrow">ANNUAL WORK STATUS</p><h2>ความคืบหน้ารอบปีบัญชี</h2><p className="m101-panel-subtitle">ภาพรวมสถานะการจัดการทะเบียนกิจการ</p></div>
                  <div className="m101-status-completion"><strong>{completionPercent}%</strong><span>เสร็จแล้ว</span></div>
                </div>
                <div className="m101-status-total-line"><span>รายการทั้งหมด</span><b>{totalCount.toLocaleString('th-TH')} รายการ</b></div>
                <div className="m101-progress-stack m101-progress-stack-large" role="img" aria-label={`เสร็จสิ้น ${completedCount} กำลังดำเนินการ ${inProgressCount} รอดำเนินการหรือยังไม่ระบุ ${pendingCount}`}>
                  <span className="m101-progress-done" style={{ width: `${totalCount ? completedCount / totalCount * 100 : 0}%` }} />
                  <span className="m101-progress-active" style={{ width: `${totalCount ? inProgressCount / totalCount * 100 : 0}%` }} />
                  <span className="m101-progress-waiting" style={{ width: `${totalCount ? pendingCount / totalCount * 100 : 0}%` }} />
                </div>
                <div className="m101-status-legend m101-status-legend-counts">
                  <span><i className="m101-status-dot m101-dot-done" />เสร็จสิ้น <b>{completedCount.toLocaleString('th-TH')} · {totalCount ? Math.round(completedCount / totalCount * 100) : 0}%</b></span>
                  <span><i className="m101-status-dot m101-dot-progress" />กำลังดำเนินการ <b>{inProgressCount.toLocaleString('th-TH')} · {totalCount ? Math.round(inProgressCount / totalCount * 100) : 0}%</b></span>
                  <span><i className="m101-status-dot m101-dot-pending" />รอดำเนินการ / ยังไม่ระบุ <b>{pendingCount.toLocaleString('th-TH')} · {totalCount ? Math.round(pendingCount / totalCount * 100) : 0}%</b></span>
                </div>
                <div className="m101-category-breakdown">
                  <div className="m101-category-heading"><div><p className="m101-eyebrow">BY BUSINESS TYPE</p><h3>เสร็จแล้วเทียบกับยังไม่เสร็จ</h3></div><div className="m101-category-key"><span><i className="m101-category-done" />เสร็จ</span><span><i className="m101-category-notdone" />ยังไม่เสร็จ</span></div></div>
                  {businessTypeBreakdown.length > 0 ? businessTypeBreakdown.map((group) => (
                    <div className="m101-category-row" key={group.key}>
                      <div className="m101-category-row-head"><b>{group.label}</b><span>{group.done}/{group.total} รายการ <strong>{group.donePercent}%</strong></span></div>
                      <div className="m101-category-bar" role="img" aria-label={`${group.label}: เสร็จ ${group.done} จาก ${group.total} รายการ, ยังไม่เสร็จ ${group.notDone} รายการ`}>
                        <span className="m101-category-done" style={{ width: `${group.donePercent}%` }} />
                        <span className="m101-category-notdone" style={{ width: `${100 - group.donePercent}%` }} />
                      </div>
                    </div>
                  )) : <p className="m101-empty-hint">เพิ่มข้อมูลกิจการเพื่อดูกราฟเปรียบเทียบตามประเภท</p>}
                </div>
                <p className="m101-dashboard-data-note">สถานะส่วนนี้ใช้สรุปความคืบหน้าการจัดการทะเบียนกิจการ ไม่ใช่สถานะการยื่นแบบภาษี</p>
                {totalCount === 0 && <p className="m101-empty-hint">ยังไม่มีข้อมูลในรอบปีนี้ เริ่มต้นด้วยการเพิ่มกิจการหรือนำเข้าไฟล์</p>}
              </section>

              <section className="m101-overview-panel m101-quick-panel">
                <div className="m101-panel-heading"><div><p className="m101-eyebrow">QUICK ACCESS</p><h2>ทางลัดการทำงาน</h2></div></div>
                <button type="button" className="m101-quick-action" onClick={() => navigateToTab('directory')}><span className="m101-quick-icon">▤</span><span><b>ค้นหาทะเบียนกิจการ</b><small>ค้นหาและตรวจสอบข้อมูลนิติบุคคล</small></span><span className="m101-quick-arrow">→</span></button>
                {isLoggedIn && <button type="button" className="m101-quick-action" onClick={() => navigateToTab('import')}><span className="m101-quick-icon">↥</span><span><b>นำเข้าจาก Excel / CSV</b><small>เพิ่มข้อมูลจากไฟล์และตรวจสอบก่อนบันทึก</small></span><span className="m101-quick-arrow">→</span></button>}
                {isLoggedIn && <button type="button" className="m101-quick-action" onClick={() => setIsAddModalOpen(true)}><span className="m101-quick-icon">＋</span><span><b>เพิ่มกิจการใหม่</b><small>สร้างรายการทะเบียนด้วยตนเอง</small></span><span className="m101-quick-arrow">→</span></button>}
              </section>
            </div>

            <section className="m101-overview-panel m101-recent-panel">
              <div className="m101-panel-heading">
                <div><p className="m101-eyebrow">RECENT RECORDS</p><h2>รายการกิจการล่าสุด</h2><p className="m101-panel-subtitle">เลือกกิจการเพื่อเปิดดูรายละเอียด</p></div>
                <button type="button" className="m101-text-action" onClick={() => navigateToTab('directory')}>ดูทะเบียนทั้งหมด →</button>
              </div>
              {records.length === 0 ? (
                <div className="m101-overview-empty"><span>▤</span><b>ยังไม่มีรายการกิจการ</b><p>เพิ่มข้อมูลใหม่หรือนำเข้าไฟล์เพื่อเริ่มใช้งานทะเบียน</p></div>
              ) : (
                <div className="m101-recent-list">
                  {[...records].slice().sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''))).slice(0, 6).map((record) => (
                    <button type="button" key={record.id} className="m101-recent-row" onClick={() => { setSelectedId(record.id); setIsDetailModalOpen(true); }}>
                      <span className="m101-recent-sequence">{record.sequenceNo || '—'}</span>
                      <span className="m101-recent-main"><b>{record.companyName || 'ไม่ระบุชื่อกิจการ'}</b><small>{record.taxId || 'ไม่มีเลขประจำตัวผู้เสียภาษี'}</small></span>
                      <span className={`m101-recent-status status-${record.status || 'pending'}`}>{record.status === 'completed' ? 'เสร็จสิ้น' : record.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ'}</span>
                      <span className="m101-recent-chevron">→</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

        {activeTab === 'tasks' && isLoggedIn && (
          <AnnualTasksView
            records={records}
            selectedYear={selectedYear}
            isLoggedIn={isLoggedIn}
            onShowToast={onShowToast}
            mode="full"
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            records={records}
            selectedYear={selectedYear}
            onShowToast={onShowToast}
            onRestoreRecords={onRestoreRecords}
            isLoggedIn={isLoggedIn}
            isAdmin={isAdmin}
            onToggleLogin={onToggleLogin}
          />
        )}

        {activeTab === 'import' && (
          <ImportDocumentView
            selectedYear={selectedYear}
            onOpenMapping={() => setIsExcelMappingOpen(true)}
          />
        )}
        </div>
      </div>

      {/* Modals */}
      {isLoggedIn && isAddModalOpen && (
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

      {isLoggedIn && editingRecord && (
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
          isLoggedIn={isLoggedIn}
        />
      )}
      {isLoggedIn && isDeleteModalOpen && (
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
      {isLoggedIn && (
        <ExcelMappingImportModal
          isOpen={isExcelMappingOpen}
          selectedYear={selectedYear}
          onClose={() => setIsExcelMappingOpen(false)}
          onImportRecords={(items) => {
            if (onImportRecords) onImportRecords(items);
            logActivity('import', `นำเข้าแบบจับคู่ ${items.length} รายการ`);
            navigateToTab('directory');
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
