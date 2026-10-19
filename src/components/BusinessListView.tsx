import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { BusinessDetailModal } from './BusinessDetailModal';
import { useSystemConfig } from '../context/SystemConfigContext';

interface BusinessListViewProps {
  records: BusinessRecord[];
  selectedYear?: string;
  onEditRecord?: (record: BusinessRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onShowToast?: (msg: string, title?: string) => void;
  onOpenAddModal?: () => void;
}

export const BusinessListView: React.FC<BusinessListViewProps> = ({
  records,
  selectedYear = '69',
  onEditRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onShowToast,
  onOpenAddModal,
}) => {
  const { config } = useSystemConfig();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BusinessStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');
  const [sortBy, setSortBy] = useState<'seq' | 'name' | 'taxId' | 'status'>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<BusinessRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl/Cmd + K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Counts for Paperpillar KPI stat cards
  const totalCount = records.length;
  const pendingCount = useMemo(() => records.filter((r) => r.status === 'pending').length, [records]);
  const inProgressCount = useMemo(() => records.filter((r) => r.status === 'in_progress').length, [records]);
  const completedCount = useMemo(() => records.filter((r) => r.status === 'completed').length, [records]);

  // Legal Type Counts
  const companyCount = useMemo(() => records.filter((r) => r.type === 'company').length, [records]);
  const partnershipCount = useMemo(() => records.filter((r) => r.type === 'partnership').length, [records]);
  const individualCount = useMemo(() => records.filter((r) => r.type === 'individual').length, [records]);

  // Keep selectedDetailRecord in sync
  useEffect(() => {
    if (selectedDetailRecord) {
      const latest = records.find((r) => r.id === selectedDetailRecord.id);
      if (latest && latest !== selectedDetailRecord) {
        setSelectedDetailRecord(latest);
      }
    }
  }, [records, selectedDetailRecord]);

  // Reset to page 1 when filter/search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, sortBy, sortOrder, itemsPerPage]);

  const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (onShowToast) onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ');
  };

  const handleQuickStatusChange = (record: BusinessRecord, newStatus: BusinessStatus) => {
    if (onEditRecord) {
      onEditRecord({ ...record, status: newStatus });
      const label =
        newStatus === 'completed'
          ? config.statusCompleted || 'เสร็จสิ้น'
          : newStatus === 'in_progress'
          ? config.statusInProgress || 'กำลังทำ'
          : config.statusPending || 'รอดำเนินการ';
      if (onShowToast) onShowToast(`เปลี่ยนสถานะเป็น "${label}"`, 'อัปเดตสถานะ');
    }
  };

  const handleSort = (field: 'seq' | 'name' | 'taxId' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((r) => r.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/[-\s]/g, '');
      result = result.filter((r) => {
        const cleanTax = (r.taxId || '').replace(/[-\s]/g, '').toLowerCase();
        return (
          r.companyName.toLowerCase().includes(q) ||
          (r.taxId && r.taxId.toLowerCase().includes(q)) ||
          cleanTax.includes(cleanQ) ||
          r.sequenceNo.includes(q) ||
          (r.password && r.password.toLowerCase().includes(q)) ||
          (r.eFilingCode && r.eFilingCode.toLowerCase().includes(q)) ||
          (r.topic && r.topic.toLowerCase().includes(q)) ||
          (r.remark && r.remark.toLowerCase().includes(q))
        );
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'seq') {
        const numA = parseInt(a.sequenceNo.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.sequenceNo.replace(/\D/g, '') || '0', 10);
        comparison = numA - numB;
      } else if (sortBy === 'name') {
        comparison = a.companyName.localeCompare(b.companyName, 'th');
      } else if (sortBy === 'taxId') {
        comparison = (a.taxId || '').localeCompare(b.taxId || '');
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, statusFilter, typeFilter, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = useMemo(() => {
    if (itemsPerPage >= 9999) return filteredAndSortedRecords;
    return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRecords, startIndex, itemsPerPage]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string, e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleExecuteBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (onDeleteMultiple) {
      onDeleteMultiple(selectedIds);
      if (onShowToast) onShowToast(`ลบข้อมูลที่เลือก ${selectedIds.length} รายการแล้ว`, 'ลบสำเร็จ');
      setSelectedIds([]);
      setConfirmBulkDelete(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const dataToExport = records.map((r, idx) => ({
        'ลำดับ': r.sequenceNo || idx + 1,
        'ชื่อกิจการ': r.companyName,
        'ประเภท': r.type === 'company' ? 'บริษัทจำกัด' : r.type === 'partnership' ? 'ห้างหุ้นส่วน' : 'บุคคลธรรมดา',
        'เลขผู้เสียภาษี': r.taxId,
        'รหัสผ่าน': r.password,
        'รหัส e-Filing': r.eFilingCode,
        'ประกันสังคม': r.ssoCode,
        'วันที่ผู้สอบ': r.auditorDate,
        'สถานะ':
          r.status === 'completed'
            ? 'เสร็จสิ้น'
            : r.status === 'in_progress'
            ? 'กำลังทำ'
            : 'รอดำเนินการ',
        'หมายเหตุ': r.remark,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Directory_Year_${selectedYear}`);
      XLSX.writeFile(wb, `Mustang_Directory_Year_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      if (onShowToast) onShowToast('ส่งออกไฟล์ Excel สำเร็จ', 'ดาวน์โหลดสำเร็จ');
      setShowExportMenu(false);
    } catch {
      if (onShowToast) onShowToast('เกิดข้อผิดพลาดในการส่งออกไฟล์', 'ข้อผิดพลาด');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#f8f9fc] dark:bg-[#090a0f] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors">
      
      {/* 1. SchoolHub Signature Hero Banner for Business Directory */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-800 text-white shadow-xl shadow-indigo-950/15 relative overflow-hidden border border-indigo-700/50">
        {/* Background Decorative Rings */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-56 h-56 rounded-full bg-violet-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-indigo-200 border border-white/20 font-mono">
              DIRECTORY · FISCAL YEAR {selectedYear}
            </span>
            <span className="text-xs text-indigo-200/90 font-medium">
              · ทะเบียนกิจการและข้อมูลนิติบุคคล SchoolHub
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-headline tracking-tight">
            {config.businessListTitle || 'ทะเบียนกิจการและข้อมูลนิติบุคคล'}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/80 mt-1 max-w-xl leading-relaxed">
            {config.businessListSubtitle || 'จัดการข้อมูล รายละเอียด และรหัสผ่านการยื่นภาษีของแต่ละกิจการประจำรอบปี'} {selectedYear}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:self-center">
          {/* View Mode Toggle Button */}
          <div className="p-1 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl flex items-center shadow-xs">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'table'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
              title="มุมมองตาราง (Table View)"
            >
              <span className="material-symbols-outlined text-[16px]">table_rows</span>
              <span>ตาราง</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewLayout === 'grid'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
              title="มุมมองการ์ด (Grid View)"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>การ์ด</span>
            </button>
          </div>

          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="h-11 px-4 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-900 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-900/20 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] text-indigo-600">add</span>
              <span>เพิ่มกิจการใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SchoolHub Signature 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: All Businesses */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-3xl bg-white dark:bg-[#131B2E] border transition-all text-left flex flex-col justify-between cursor-pointer shadow-xs hover:shadow-md group ${
            statusFilter === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20'
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">กิจการทั้งหมด / Total</span>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-[22px]">apartment</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {totalCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">กิจการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>ทั้งหมดในรอบปี {selectedYear}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">100%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
          </div>
        </button>

        {/* Card 2: Pending */}
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-5 rounded-2xl bg-white dark:bg-[#12141c] border transition-all text-left flex flex-col justify-between cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.025)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] group ${
            statusFilter === 'pending'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">รอดำเนินการ / Pending</span>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-[22px]">hourglass_empty</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {pendingCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">กิจการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>ยังไม่ได้เริ่มทำ</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono">
              {totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalCount ? (pendingCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </button>

        {/* Card 3: In Progress */}
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`p-5 rounded-2xl bg-white dark:bg-[#12141c] border transition-all text-left flex flex-col justify-between cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.025)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] group ${
            statusFilter === 'in_progress'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">กำลังทำ / In Progress</span>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {inProgressCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">กิจการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>กำลังดำเนินการ</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
              {totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalCount ? (inProgressCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </button>

        {/* Card 4: Completed */}
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`p-5 rounded-2xl bg-white dark:bg-[#12141c] border transition-all text-left flex flex-col justify-between cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.025)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] group ${
            statusFilter === 'completed'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">เสร็จสิ้น / Completed</span>
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-teal-600 dark:text-teal-400 font-mono tracking-tight">
              {completedCount}
            </span>
            <span className="text-xs text-slate-400 font-mono">กิจการ</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>ยื่นเสร็จสิ้นแล้ว</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400 font-mono">
              {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
        </button>
      </div>

      {/* 3. Paperpillar Property Status Distribution & Entity Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution Visual Bar */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">pie_chart</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-headline">
                ความคืบหน้าสถานะการยื่นภาษี (Tax Filing Progress)
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              รวม {totalCount} รายการ
            </span>
          </div>

          {/* Multi-segment Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden flex">
            <div
              className="bg-teal-500 h-full transition-all duration-500"
              style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
              title={`เสร็จสิ้น: ${completedCount} รายการ`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${totalCount ? (inProgressCount / totalCount) * 100 : 0}%` }}
              title={`กำลังทำ: ${inProgressCount} รายการ`}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${totalCount ? (pendingCount / totalCount) * 100 : 0}%` }}
              title={`รอดำเนินการ: ${pendingCount} รายการ`}
            />
          </div>

          {/* Legend Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-slate-600 dark:text-slate-400">
                เสร็จสิ้น: <strong className="text-slate-900 dark:text-white font-mono">{completedCount}</strong> ({totalCount ? Math.round((completedCount / totalCount) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">
                กำลังทำ: <strong className="text-slate-900 dark:text-white font-mono">{inProgressCount}</strong> ({totalCount ? Math.round((inProgressCount / totalCount) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-600 dark:text-slate-400">
                รอดำเนินการ: <strong className="text-slate-900 dark:text-white font-mono">{pendingCount}</strong> ({totalCount ? Math.round((pendingCount / totalCount) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Entity Type Breakdown Chips */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-headline">
              ประเภทนิติบุคคล (Entity Types)
            </span>
            <span className="material-symbols-outlined text-[18px] text-slate-400">category</span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto">
            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'company' ? 'all' : 'company')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                typeFilter === 'company'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 block font-mono">บจก.</span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{companyCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'partnership' ? 'all' : 'partnership')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                typeFilter === 'partnership'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 block font-mono">หจก.</span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{partnershipCount}</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter(typeFilter === 'individual' ? 'all' : 'individual')}
              className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                typeFilter === 'individual'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-100 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 block font-mono">บุคคล</span>
              <span className="text-base font-black text-slate-900 dark:text-white font-mono">{individualCount}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 text-center mt-1">
            คลิกเพื่อกรองตามประเภทนิติบุคคล
          </div>
        </div>
      </div>

      {/* 4. Paperpillar Search & Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar with Keyboard Shortcut */}
        <div className="relative w-full sm:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหากิจการ, เลขผู้เสียภาษี, หรือรหัส... (⌘K)"
            className="w-full h-11 pl-10 pr-10 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Controls & Bulk Action Toolbar */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-11 px-3.5 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-11 px-3.5 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
          >
            <option value="all">ประเภททั้งหมด</option>
            <option value="company">บริษัทจำกัด</option>
            <option value="partnership">ห้างหุ้นส่วน</option>
            <option value="individual">บุคคลธรรมดา</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-11 px-3.5 bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer shadow-xs"
          >
            <option value="seq">เรียงตามลำดับ</option>
            <option value="name">เรียงตามชื่อ</option>
            <option value="taxId">เรียงตามเลขภาษี</option>
            <option value="status">เรียงตามสถานะ</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="h-11 w-11 flex items-center justify-center bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-xs cursor-pointer transition-colors"
            title={sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </button>

          {/* Bulk Delete Button when items selected */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              className="h-11 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200 shadow-2xs animate-in fade-in"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>ลบที่เลือก ({selectedIds.length})</span>
            </button>
          )}

          {/* Export to Excel Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-11 px-4 bg-white dark:bg-[#12141c] hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[17px] text-emerald-600">download</span>
              <span>ส่งออก Excel</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-30 py-1.5 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">table_view</span>
                  <span>ดาวน์โหลดไฟล์ .xlsx</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Bulk Delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#12141c] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <span className="material-symbols-outlined text-[22px]">warning</span>
              <span>ยืนยันการลบ {selectedIds.length} รายการ?</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ข้อมูลกิจการที่เลือกทั้งหมด {selectedIds.length} รายการจะถูกลบออกจากรอบปี {selectedYear} ทันที
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer"
              >
                ยืนยันลบทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Content Layout (Table View vs Card Grid View) */}
      {viewLayout === 'grid' ? (
        /* Paperpillar Grid View with Checkbox on each card */
        <div className="flex flex-col gap-3">
          {/* Grid View Header & Select All */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                onChange={toggleSelectAll}
                className="rounded cursor-pointer accent-emerald-600 w-4 h-4"
                id="gridSelectAll"
              />
              <label htmlFor="gridSelectAll" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                เลือกทั้งหมด ({selectedIds.length}/{paginatedRecords.length})
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>แสดง:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={15}>15 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
                <option value={9999}>ทั้งหมด</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedRecords.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-3xl text-xs text-slate-400">
                ไม่พบข้อมูลกิจการที่ตรงกับเงื่อนไขการค้นหา
              </div>
            ) : (
              paginatedRecords.map((record) => {
                const isSelected = selectedIds.includes(record.id);

                return (
                  <div
                    key={record.id}
                    onClick={() => setSelectedDetailRecord(record)}
                    className={`p-5 bg-white dark:bg-[#12141c] border rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.025)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between cursor-pointer group relative ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200/80 dark:border-zinc-800 hover:border-emerald-500/50'
                    }`}
                  >
                    <div>
                      {/* Card Top: Checkbox, Sequence & Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOne(record.id, e)}
                            className="rounded cursor-pointer accent-emerald-600 w-4 h-4"
                          />
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                            #{record.sequenceNo}
                          </span>
                          {record.type === 'company' ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60">
                              บจ.
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold border border-purple-200/60">
                              หจก.
                            </span>
                          )}
                        </div>

                        {/* Status Dropdown inside Card */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={record.status}
                            onChange={(e) => handleQuickStatusChange(record, e.target.value as BusinessStatus)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border outline-none cursor-pointer transition-colors shadow-2xs ${
                              record.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80'
                                : record.status === 'in_progress'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80'
                            }`}
                          >
                            <option value="pending">รอดำเนินการ</option>
                            <option value="in_progress">กำลังทำ</option>
                            <option value="completed">เสร็จสิ้น</option>
                          </select>
                        </div>
                      </div>

                      {/* Company Name with Icon Avatar */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[18px]">domain</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-1 font-headline">
                          {record.companyName}
                        </h3>
                      </div>

                      {/* Information Box */}
                      <div className="space-y-2 text-xs bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">เลขผู้เสียภาษี:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <span>{record.taxId || '-'}</span>
                            {record.taxId && (
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(record.taxId, 'เลขภาษี', e)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded cursor-pointer"
                                title="คัดลอกเลขภาษี"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">รหัสผ่าน:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <span className="truncate max-w-[120px]">{record.password || '-'}</span>
                            {record.password && (
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(record.password, 'รหัสผ่าน', e)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded cursor-pointer"
                                title="คัดลอกรหัสผ่าน"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">e-Filing:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                            <span className="truncate max-w-[120px]">{record.eFilingCode || '-'}</span>
                            {record.eFilingCode && (
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(record.eFilingCode, 'e-Filing', e)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors p-0.5 rounded cursor-pointer"
                                title="คัดลอก e-Filing"
                              >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-[11px]">
                        {record.auditorDate ? `ผู้สอบ: ${record.auditorDate}` : 'ไม่มีวันที่ผู้สอบ'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDetailRecord(record)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title="ดูรายละเอียด"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                        </button>
                        {onEditRecord && (
                          <button
                            type="button"
                            onClick={() => onEditRecord(record)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-[17px]">edit</span>
                          </button>
                        )}
                        {onDeleteRecord && (
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(record.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Paperpillar Enclosed Data Table (Identical to DashboardView) */
        <div className="bg-white dark:bg-[#12141c] border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.025)] overflow-hidden flex flex-col">
          {/* Table Top Banner */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-headline tracking-tight">
                รายชื่อกิจการในทะเบียนนิติบุคคล
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 font-mono">
                {filteredAndSortedRecords.length} กิจการ
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>แสดง:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value={15}>15 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
                <option value={9999}>ทั้งหมด (เลื่อนดูยาว)</option>
              </select>
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                      onChange={toggleSelectAll}
                      className="rounded cursor-pointer accent-emerald-600 w-4 h-4"
                    />
                  </th>
                  <th onClick={() => handleSort('seq')} className="py-3.5 px-3 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                    <div className="flex items-center gap-1">
                      <span>{config.colSeq || 'ลำดับ'}</span>
                      {sortBy === 'seq' && (
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('name')} className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                    <div className="flex items-center gap-1">
                      <span>{config.colName || 'ชื่อกิจการ'}</span>
                      {sortBy === 'name' && (
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('taxId')} className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                    <div className="flex items-center gap-1">
                      <span>{config.colTaxId || 'เลขผู้เสียภาษี'}</span>
                      {sortBy === 'taxId' && (
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">{config.colPassword || 'รหัสผ่าน / e-Filing'}</th>
                  <th onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200">
                    <div className="flex items-center gap-1">
                      <span>{config.colStatus || 'สถานะ'}</span>
                      {sortBy === 'status' && (
                        <span className="material-symbols-outlined text-[13px] text-emerald-600">
                          {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right">{config.colAction || 'การจัดการ'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลกิจการในรอบปี {selectedYear} ตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedDetailRecord(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleSelectOne(item.id, e as any)}
                            className="rounded-md cursor-pointer accent-emerald-600 w-4 h-4"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                            #{item.sequenceNo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{item.companyName}</span>
                            {item.type === 'company' ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/60">
                                บจ.
                              </span>
                            ) : item.type === 'partnership' ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-bold border border-purple-200/60">
                                หจก.
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200/60">
                                บุคคล
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span>{item.taxId || '-'}</span>
                            {item.taxId && (
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(item.taxId, 'เลขผู้เสียภาษี', e)}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="คัดลอกเลขผู้เสียภาษี"
                              >
                                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]">{item.password || item.eFilingCode || '-'}</span>
                            {(item.password || item.eFilingCode) && (
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(item.password || item.eFilingCode, 'รหัสผ่าน', e)}
                                className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="คัดลอกรหัสผ่าน"
                              >
                                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <select
                              value={item.status}
                              onChange={(e) => handleQuickStatusChange(item, e.target.value as BusinessStatus)}
                              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-colors shadow-2xs ${
                                item.status === 'completed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80'
                                  : item.status === 'in_progress'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80'
                              }`}
                            >
                              <option value="pending">{config.statusPending || 'รอดำเนินการ'}</option>
                              <option value="in_progress">{config.statusInProgress || 'กำลังทำ'}</option>
                              <option value="completed">{config.statusCompleted || 'เสร็จสิ้น'}</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailRecord(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                              title="ดูรายละเอียด"
                            >
                              <span className="material-symbols-outlined text-[17px]">visibility</span>
                            </button>
                            {onEditRecord && (
                              <button
                                type="button"
                                onClick={() => onEditRecord(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title="แก้ไข"
                              >
                                <span className="material-symbols-outlined text-[17px]">edit</span>
                              </button>
                            )}
                            {onDeleteRecord && (
                              <button
                                type="button"
                                onClick={() => onDeleteRecord(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="ลบ"
                              >
                                <span className="material-symbols-outlined text-[17px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-4 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#12141c]">
            <span>
              แสดง <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, filteredAndSortedRecords.length)}</span> จาก <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredAndSortedRecords.length}</span> รายการ
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
                >
                  ก่อนหน้า
                </button>
                <span className="font-mono px-2 font-semibold">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-medium disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors shadow-2xs"
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <BusinessDetailModal
        record={selectedDetailRecord}
        onClose={() => setSelectedDetailRecord(null)}
        onEdit={(rec) => {
          setSelectedDetailRecord(null);
          onEditRecord?.(rec);
        }}
        onDelete={(id) => {
          setSelectedDetailRecord(null);
          onDeleteRecord?.(id);
        }}
        onStatusChange={handleQuickStatusChange}
        onShowToast={onShowToast || (() => {})}
      />
    </div>
  );
};
