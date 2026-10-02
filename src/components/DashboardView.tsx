import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { AddBusinessModal } from './AddBusinessModal';
import { EditBusinessModal } from './EditBusinessModal';
import { BusinessDetailModal } from './BusinessDetailModal';
import {
  XpAddDocIcon,
  XpFloppyIcon,
  XpSearchIcon,
  XpTrashIcon,
  XpKeyIcon,
  XpBuildingIcon,
  XpShieldIcon,
  XpEditIcon,
  XpStatusSphere,
  XpFolderIcon,
} from './ClassicIcons';

interface DashboardViewProps {
  records: BusinessRecord[];
  userName: string;
  selectedYear?: string;
  availableYears?: string[];
  recordsByYear?: Record<string, BusinessRecord[]>;
  onCopyFromOtherYear?: (fromYear: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  selectedTopic?: string;
  onSelectTopic?: (topic: string) => void;
  onEditRecord: (record: BusinessRecord) => void;
  onDeleteRecord: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onAddRecord: (record: BusinessRecord) => void;
  onShowToast: (msg: string, title?: string) => void;
  onImportRecords?: (records: Partial<BusinessRecord>[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  selectedYear = '69',
  availableYears = [],
  recordsByYear = {},
  onCopyFromOtherYear,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onEditRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onAddRecord,
  onShowToast,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalOnSearchChange || setLocalSearchQuery;

  const [statusFilter, setStatusFilter] = useState<'all' | BusinessStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<BusinessRecord | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<'seq' | 'name' | 'taxId' | 'status' | 'date'>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Copied item feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active status dropdown row
  const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null);

  // Keyboard shortcut for Ctrl+K or / to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Statistics
  const totalCount = records.length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  const completedCount = records.filter((r) => r.status === 'completed').length;

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const copyToClipboard = (text: string, label: string, keyId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(keyId);
    onShowToast(`คัดลอก ${label} "${text}" เรียบร้อย`, 'คัดลอกสำเร็จ');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleQuickStatusChange = (record: BusinessRecord, newStatus: BusinessStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = {
      ...record,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    onEditRecord(updated);
    setOpenStatusRowId(null);
    if (selectedDetailRecord && selectedDetailRecord.id === record.id) {
      setSelectedDetailRecord(updated);
    }
    const statusLabel = newStatus === 'completed' ? 'เสร็จสิ้น' : newStatus === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ';
    onShowToast(`เปลี่ยนสถานะเป็น "${statusLabel}" เรียบร้อย`, 'อัปเดตสถานะ');
  };

  // Filter & Search & Sort
  const filteredRecords = useMemo(() => {
    let list = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/[-\s]/g, '');

      list = list.filter((r) => {
        const cleanTax = r.taxId.replace(/[-\s]/g, '').toLowerCase();
        return (
          r.companyName.toLowerCase().includes(q) ||
          r.taxId.toLowerCase().includes(q) ||
          cleanTax.includes(cleanQ) ||
          r.sequenceNo.toLowerCase().includes(q) ||
          r.auditorDate.toLowerCase().includes(q) ||
          r.eFilingCode.toLowerCase().includes(q) ||
          r.ssoCode.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q) ||
          (r.topic && r.topic.toLowerCase().includes(q))
        );
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      list = list.filter((r) => r.type === typeFilter);
    }

    // Sort
    const modifier = sortOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === 'seq') {
        const numA = parseInt(a.sequenceNo.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.sequenceNo.replace(/\D/g, '') || '0', 10);
        return (numA - numB) * modifier;
      }
      if (sortBy === 'name') {
        return a.companyName.localeCompare(b.companyName, 'th') * modifier;
      }
      if (sortBy === 'taxId') {
        return a.taxId.localeCompare(b.taxId) * modifier;
      }
      if (sortBy === 'status') {
        const priority: Record<BusinessStatus, number> = { pending: 1, in_progress: 2, completed: 3 };
        return (priority[a.status] - priority[b.status]) * modifier;
      }
      return (new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) * modifier;
    });

    return list;
  }, [records, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  const effectiveItemsPerPage = itemsPerPage === -1 ? filteredRecords.length || 1 : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / effectiveItemsPerPage));
  
  const currentRecords = useMemo(() => {
    if (itemsPerPage === -1) return filteredRecords;
    const start = (currentPage - 1) * effectiveItemsPerPage;
    return filteredRecords.slice(start, start + effectiveItemsPerPage);
  }, [filteredRecords, currentPage, effectiveItemsPerPage, itemsPerPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export Data to Excel
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredRecords.map((r) => ({
        'ลำดับ': r.sequenceNo,
        'เลขประจำตัวผู้เสียภาษี': r.taxId,
        'ชื่อบริษัท / ห้างหุ้นส่วนจำกัด': r.companyName,
        'ประเภท': r.type === 'company' ? 'บริษัทจำกัด' : r.type === 'partnership' ? 'ห้างหุ้นส่วนจำกัด' : 'บุคคลธรรมดา/ร้านค้า',
        'วันที่แจ้งผู้สอบ': r.auditorDate,
        'รหัสผ่าน': r.password,
        'หมายเหตุ': r.remark,
        'รหัสยื่น e-filing': r.eFilingCode,
        'ประกันสังคม': r.ssoCode,
        'สถานะ': r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
        'หัวข้อ': r.topic || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `ทะเบียนกิจการ_${selectedYear}`);
      XLSX.writeFile(workbook, `Mustang_Directory_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast(`ส่งออกข้อมูล ${filteredRecords.length} รายการสำเร็จ`, 'ส่งออกข้อมูล');
      setShowExportMenu(false);
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการส่งออกไฟล์', 'ข้อผิดพลาด');
    }
  };

  // Export Data to JSON Backup
  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Mustang_Backup_${selectedYear}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      onShowToast('สำรองข้อมูลเรียบร้อยแล้ว', 'สำรองข้อมูล');
      setShowExportMenu(false);
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการสำรองข้อมูล', 'ข้อผิดพลาด');
    }
  };

  const isAllSelected = currentRecords.length > 0 && currentRecords.every((r) => selectedIds.includes(r.id));

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      {/* Page Title & Top Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <XpFolderIcon size={22} />
          <h1 className="text-xl font-bold text-[#18181b] font-headline tracking-tight">
            ทะเบียนกิจการ
          </h1>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
            ปี {selectedYear}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            <XpAddDocIcon size={15} />
            <span>เพิ่มกิจการ</span>
          </button>

          {/* Export Menu */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-8 px-2.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] text-[#27272a] text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="ส่งออก / สำรองข้อมูล"
            >
              <XpFloppyIcon size={15} />
              <span>ส่งออก</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-[#e4e4e7] py-1 z-30 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full px-3 py-2 text-left text-xs text-[#18181b] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                >
                  <XpFloppyIcon size={16} />
                  <span>ส่งออก Excel (.xlsx)</span>
                </button>
                <div className="my-1 border-t border-[#f4f4f5]" />
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-left text-xs text-[#18181b] hover:bg-[#f4f4f5] flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-sky-600">data_object</span>
                  <span>สำรองข้อมูล (JSON)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="border border-[#e4e4e7] rounded-xl bg-white grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#e4e4e7] overflow-hidden shadow-2xs">
        {/* ทั้งหมด */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 sm:p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#f4f4f5]/80 ring-2 ring-inset ring-neutral-900'
              : 'hover:bg-[#fafafa]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">ทั้งหมด</span>
            <XpBuildingIcon size={16} />
          </div>
          <div className="text-2xl font-bold text-[#18181b] font-mono mt-2">
            {totalCount.toLocaleString()}
          </div>
        </button>

        {/* รอดำเนินการ */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending');
            setCurrentPage(1);
          }}
          className={`p-3.5 sm:p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-50/80 ring-2 ring-inset ring-amber-600'
              : 'hover:bg-[#fafafa]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">รอดำเนินการ</span>
            <XpStatusSphere status="pending" size={14} />
          </div>
          <div className="text-2xl font-bold text-[#b45309] font-mono mt-2">
            {pendingCount.toLocaleString()}
          </div>
        </button>

        {/* กำลังดำเนินการ */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress');
            setCurrentPage(1);
          }}
          className={`p-3.5 sm:p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'bg-sky-50/80 ring-2 ring-inset ring-sky-600'
              : 'hover:bg-[#fafafa]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">กำลังทำ</span>
            <XpStatusSphere status="in_progress" size={14} />
          </div>
          <div className="text-2xl font-bold text-[#0284c7] font-mono mt-2">
            {inProgressCount.toLocaleString()}
          </div>
        </button>

        {/* เสร็จสิ้น */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed');
            setCurrentPage(1);
          }}
          className={`p-3.5 sm:p-4 flex flex-col justify-between text-left transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-50/80 ring-2 ring-inset ring-emerald-600'
              : 'hover:bg-[#fafafa]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">เสร็จสิ้น</span>
            <XpStatusSphere status="completed" size={14} />
          </div>
          <div className="text-2xl font-bold text-[#16a34a] font-mono mt-2">
            {completedCount.toLocaleString()}
          </div>
        </button>
      </div>

      {/* Quick Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-white border border-[#e4e4e7] rounded-xl shadow-2xs overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#18181b] text-white shadow-2xs'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${statusFilter === 'all' ? 'bg-neutral-700 text-white' : 'bg-[#f4f4f5] text-[#71717a]'}`}>
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('pending');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-amber-50/50'
            }`}
          >
            <XpStatusSphere status="pending" size={10} />
            <span>รอดำเนินการ</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${statusFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800'}`}>
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('in_progress');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'in_progress'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-sky-50/50'
            }`}
          >
            <XpStatusSphere status="in_progress" size={10} />
            <span>กำลังทำ</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${statusFilter === 'in_progress' ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-800'}`}>
              {inProgressCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter('completed');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-emerald-50/50'
            }`}
          >
            <XpStatusSphere status="completed" size={10} />
            <span>เสร็จสิ้น</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${statusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-800'}`}>
              {completedCount}
            </span>
          </button>
        </div>

        {/* Search Bar & Type Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <XpSearchIcon size={16} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="ค้นหากิจการ, เลขภาษี... (/)"
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-neutral-900 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#18181b] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="appearance-none bg-white border border-[#e4e4e7] rounded-xl pl-3 pr-7 py-1.5 text-xs text-[#18181b] font-medium focus:outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
            >
              <option value="all">ทุกประเภท</option>
              <option value="company">บริษัทจำกัด</option>
              <option value="partnership">ห้างหุ้นส่วน</option>
              <option value="individual">บุคคลธรรมดา</option>
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[#71717a] text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Batch Selection Banner */}
      {selectedIds.length > 0 && (
        <div className="p-2.5 bg-white border border-neutral-900/20 rounded-xl flex items-center justify-between text-xs animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2 text-[#18181b]">
            <span className="material-symbols-outlined text-neutral-900 text-[17px]">
              check_circle
            </span>
            <span>
              เลือกอยู่ <strong>{selectedIds.length}</strong> รายการ
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length < filteredRecords.length && (
              <button
                type="button"
                onClick={() => setSelectedIds(filteredRecords.map((r) => r.id))}
                className="text-neutral-900 font-semibold underline hover:text-black cursor-pointer mr-2"
              >
                เลือกทั้งหมด ({filteredRecords.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => onDeleteMultiple(selectedIds)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <XpTrashIcon size={14} />
              <span>ลบที่เลือก</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 rounded-lg bg-[#fafafa] border border-[#e4e4e7] text-[#71717a] hover:text-[#18181b] cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-[#e4e4e7] rounded-xl bg-white overflow-hidden shadow-2xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e4e4e7] bg-[#fafafa] text-[#71717a] font-medium select-none">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    title="เลือกทั้งหมด"
                    className="w-4 h-4 rounded border-[#d4d4d8] text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                </th>
                
                <th
                  onClick={() => handleSort('seq')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900 w-16"
                >
                  <div className="flex items-center gap-1">
                    <span>ลำดับ</span>
                    {sortBy === 'seq' && (
                      <span className="material-symbols-outlined text-[13px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อกิจการ</span>
                    {sortBy === 'name' && (
                      <span className="material-symbols-outlined text-[13px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('taxId')}
                  className="py-3 px-3 font-mono cursor-pointer hover:text-neutral-900"
                >
                  <div className="flex items-center gap-1">
                    <span>เลขผู้เสียภาษี</span>
                    {sortBy === 'taxId' && (
                      <span className="material-symbols-outlined text-[13px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                <th className="py-3 px-3">ประเภท</th>
                <th className="py-3 px-3">แจ้งผู้สอบ</th>
                <th className="py-3 px-3 font-mono">รหัสผ่าน</th>
                <th className="py-3 px-3 font-mono">รหัส e-Filing</th>

                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer hover:text-neutral-900"
                >
                  <div className="flex items-center gap-1">
                    <span>สถานะ</span>
                    {sortBy === 'status' && (
                      <span className="material-symbols-outlined text-[13px]">
                        {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>

                <th className="py-3 px-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f4f5]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#71717a]">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                currentRecords.map((record) => {
                  const isSelected = selectedIds.includes(record.id);
                  const cleanTax = record.taxId ? record.taxId.replace(/\D/g, '') : '';
                  const isStatusMenuOpen = openStatusRowId === record.id;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedDetailRecord(record)}
                      className={`hover:bg-[#fafafa] transition-colors group cursor-pointer ${
                        isSelected ? 'bg-neutral-50/80' : ''
                      }`}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                           type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(record.id)}
                          className="rounded border-[#d4d4d8] text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#71717a]">
                        {record.sequenceNo}
                      </td>

                      <td className="py-2.5 px-3 font-medium text-[#18181b]">
                        <span className="truncate max-w-64 block">{record.companyName}</span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#52525b]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span>{record.taxId || '-'}</span>
                          {record.taxId && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(record.taxId, 'เลขภาษี', `tax-${record.id}`, e)}
                                title="คัดลอกเลขภาษี"
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 text-[#71717a] hover:text-[#18181b] transition-all cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {copiedId === `tax-${record.id}` ? 'check' : 'content_copy'}
                                </span>
                              </button>
                              {cleanTax.length === 13 && (
                                <a
                                  href={`https://datawarehouse.dbd.go.th/company/profile/${cleanTax}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="เปิดดูใน DBD"
                                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sky-100 text-[#71717a] hover:text-[#0284c7] transition-all"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    open_in_new
                                  </span>
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[#71717a]">
                        {record.type === 'company'
                          ? 'บริษัทจำกัด'
                          : record.type === 'partnership'
                          ? 'ห้างหุ้นส่วน'
                          : 'บุคคลธรรมดา'}
                      </td>

                      <td className="py-2.5 px-3 text-[#71717a]">
                        {record.auditorDate || '-'}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#52525b]" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <span>{record.password || '-'}</span>
                          {record.password && (
                            <button
                              type="button"
                              onClick={(e) => copyToClipboard(record.password, 'รหัสผ่าน', `pass-${record.id}`, e)}
                              title="คัดลอกรหัสผ่าน"
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 text-[#71717a] hover:text-[#18181b] transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedId === `pass-${record.id}` ? 'check' : 'content_copy'}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[#52525b]">
                        {record.eFilingCode || '-'}
                      </td>

                      {/* Status Tag */}
                      <td className="py-2.5 px-3 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenStatusRowId(isStatusMenuOpen ? null : record.id)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                            record.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : record.status === 'in_progress'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                          }`}
                          title="เปลี่ยนสถานะ"
                        >
                          <XpStatusSphere status={record.status} size={10} />
                          <span>
                            {record.status === 'completed'
                              ? 'เสร็จสิ้น'
                              : record.status === 'in_progress'
                              ? 'กำลังทำ'
                              : 'รอดำเนินการ'}
                          </span>
                        </button>

                        {/* Quick Status Dropdown */}
                        {isStatusMenuOpen && (
                          <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-[#e4e4e7] py-1 z-30 animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={(e) => handleQuickStatusChange(record, 'pending', e)}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-amber-50 flex items-center gap-2 text-amber-800"
                            >
                              <XpStatusSphere status="pending" size={10} />
                              <span>รอดำเนินการ</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleQuickStatusChange(record, 'in_progress', e)}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-sky-50 flex items-center gap-2 text-sky-800"
                            >
                              <XpStatusSphere status="in_progress" size={10} />
                              <span>กำลังทำ</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleQuickStatusChange(record, 'completed', e)}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 flex items-center gap-2 text-emerald-800"
                            >
                              <XpStatusSphere status="completed" size={10} />
                              <span>เสร็จสิ้น</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord(record)}
                            title="ดูรายละเอียด"
                            className="p-1 rounded text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRecord(record)}
                            title="แก้ไข"
                            className="p-1 rounded text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 transition-colors cursor-pointer"
                          >
                            <XpEditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(record.id)}
                            title="ลบ"
                            className="p-1 rounded text-[#71717a] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <XpTrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#fafafa] border-t border-[#e4e4e7] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#71717a]">
          <div className="flex items-center gap-3">
            <span>
              {filteredRecords.length === 0 ? 0 : (currentPage - 1) * effectiveItemsPerPage + 1} -{' '}
              {Math.min(currentPage * effectiveItemsPerPage, filteredRecords.length)} จาก {filteredRecords.length.toLocaleString()} รายการ
            </span>

            <div className="flex items-center gap-1 pl-2 border-l border-[#e4e4e7]">
              <span>แสดง:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#e4e4e7] rounded px-1.5 py-0.5 text-xs text-[#18181b] focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={12}>12</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={-1}>ทั้งหมด</option>
              </select>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded border border-[#e4e4e7] bg-white text-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f4f4f5] cursor-pointer"
              >
                ก่อนหน้า
              </button>
              <span className="px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded border border-[#e4e4e7] bg-white text-[#18181b] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f4f4f5] cursor-pointer"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Business Modal */}
      {isAddModalOpen && (
        <AddBusinessModal
          allRecords={records}
          nextSequenceNo={String(records.length + 1)}
          onShowToast={(msg) => onShowToast(msg)}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(newRec) => {
            onAddRecord(newRec);
            setIsAddModalOpen(false);
            onShowToast(`เพิ่มกิจการ "${newRec.companyName}" สำเร็จ`, 'บันทึกเรียบร้อย');
          }}
        />
      )}

      {/* Detail Modal */}
      {selectedDetailRecord && (
        <BusinessDetailModal
          record={selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
          onEdit={(rec) => {
            setSelectedDetailRecord(null);
            onEditRecord(rec);
          }}
          onDelete={(id) => {
            setSelectedDetailRecord(null);
            onDeleteRecord(id);
          }}
          onStatusChange={handleQuickStatusChange}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
