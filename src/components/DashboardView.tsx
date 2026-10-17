import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { AddBusinessModal } from './AddBusinessModal';
import { BusinessDetailModal } from './BusinessDetailModal';
import { useSystemConfig } from '../context/SystemConfigContext';

interface DashboardViewProps {
  records: BusinessRecord[];
  userName?: string;
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
  userName = 'Mustang',
  selectedYear = '69',
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onShowToast,
}) => {
  const { config } = useSystemConfig();
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalOnSearchChange || setLocalSearchQuery;

  const [statusFilter, setStatusFilter] = useState<'all' | BusinessStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | BusinessType>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<BusinessRecord | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState<number>(12);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting state
  const [sortBy, setSortBy] = useState<'seq' | 'name' | 'taxId' | 'status' | 'date'>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Copied item feedback
  const [, setCopiedId] = useState<string | null>(null);
  const [lastUpdatedId, setLastUpdatedId] = useState<string | null>(null);

  // Keep selectedDetailRecord in sync
  useEffect(() => {
    if (selectedDetailRecord) {
      const latest = records.find((r) => r.id === selectedDetailRecord.id);
      if (latest && latest !== selectedDetailRecord) {
        setSelectedDetailRecord(latest);
      }
    }
  }, [records, selectedDetailRecord]);

  const prevCountRef = useRef(records.length);
  useEffect(() => {
    if (records.length > prevCountRef.current) {
      setCurrentPage(1);
      const newlyAdded = records[0];
      if (newlyAdded?.id) {
        setLastUpdatedId(newlyAdded.id);
      }
    }
    prevCountRef.current = records.length;
  }, [records]);

  useEffect(() => {
    if (lastUpdatedId) {
      const timer = setTimeout(() => setLastUpdatedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdatedId]);

  // Statistics
  const totalCount = records.length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const inProgressCount = records.filter((r) => r.status === 'in_progress').length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleQuickStatusChange = (record: BusinessRecord, newStatus: BusinessStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = {
      ...record,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    onEditRecord(updated);
    setLastUpdatedId(record.id);
    onShowToast(`อัปเดตสถานะของ "${record.companyName}" เรียบร้อย`, 'อัปเดตสำเร็จ');
  };

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesSearch =
        item.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.taxId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sequenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.password.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.eFilingCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, searchQuery, statusFilter, typeFilter]);

  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (sortBy === 'seq') {
        valA = parseInt(a.sequenceNo, 10) || 0;
        valB = parseInt(b.sequenceNo, 10) || 0;
      } else if (sortBy === 'name') {
        valA = a.companyName;
        valB = b.companyName;
      } else if (sortBy === 'taxId') {
        valA = a.taxId;
        valB = b.taxId;
      } else if (sortBy === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortBy === 'date') {
        valA = a.auditorDate;
        valB = b.auditorDate;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedRecords.slice(start, start + itemsPerPage);
  }, [sortedRecords, currentPage, itemsPerPage]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const dataToExport = records.map((r, idx) => ({
        'ลำดับ': r.sequenceNo || idx + 1,
        'ชื่อกิจการ': r.companyName,
        'เลขผู้เสียภาษี': r.taxId,
        'ประเภท': r.type === 'company' ? 'บริษัทจำกัด' : 'ห้างหุ้นส่วน/บุคคล',
        'เลขผู้เสียภาษี / รหัสผ่าน': r.password,
        'รหัส e-Filing': r.eFilingCode,
        'ประกันสังคม': r.ssoCode,
        'วันที่ผู้สอบ': r.auditorDate,
        'สถานะ': r.status === 'completed' ? 'เสร็จสิ้น' : r.status === 'in_progress' ? 'กำลังทำ' : 'รอดำเนินการ',
        'หมายเหตุ': r.remark,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `BusinessList_Year_${selectedYear}`);
      XLSX.writeFile(wb, `Mustang_Directory_Year_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      onShowToast('ส่งออกไฟล์ Excel สำเร็จ', 'ดาวน์โหลดสำเร็จ');
      setShowExportMenu(false);
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการส่งออกไฟล์', 'ข้อผิดพลาด');
    }
  };

  return (
    <div className="bg-[#f8f9fc] dark:bg-[#090a0f] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors">
      
      {/* 1. Top Header & Reference SaaS Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-headline tracking-tight">
            {config.dashboardTitle || 'Reports'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {config.dashboardSubtitle || 'ติดตามสถานะการดำเนินงานและภาพรวมทะเบียนนิติบุคคล'}
          </p>
        </div>

      </div>

      {/* 2. Reference SaaS Grid of 3 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Active Businesses */}
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl bg-transparent border border-transparent transition-all text-left flex flex-col justify-between cursor-pointer ${
            statusFilter === 'all'
              ? 'border-blue-500 bg-white/50 dark:bg-zinc-800/30'
              : 'hover:border-zinc-200 dark:hover:border-zinc-800'
          }`}
        >
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Active Businesses</span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
              {totalCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">กิจการ</span>
          </div>
          <div className="w-full bg-zinc-200/50 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(totalCount, 100)}%` }} />
          </div>
        </button>

        {/* Card 2: Completed Tasks */}
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`p-4 rounded-2xl bg-transparent border border-transparent transition-all text-left flex flex-col justify-between cursor-pointer ${
            statusFilter === 'completed'
              ? 'border-emerald-500 bg-white/50 dark:bg-zinc-800/30'
              : 'hover:border-zinc-200 dark:hover:border-zinc-800'
          }`}
        >
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Completed</span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {completedCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">กิจการ</span>
          </div>
          <div className="w-full bg-zinc-200/50 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
        </button>

        {/* Card 3: In Progress */}
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`p-4 rounded-2xl bg-transparent border border-transparent transition-all text-left flex flex-col justify-between cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'border-amber-500 bg-white/50 dark:bg-zinc-800/30'
              : 'hover:border-zinc-200 dark:hover:border-zinc-800'
          }`}
        >
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">In Progress</span>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {inProgressCount}
            </span>
            <span className="text-xs text-zinc-400 font-mono">กิจการ</span>
          </div>
          <div className="w-full bg-zinc-200/50 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalCount ? (inProgressCount / totalCount) * 100 : 0}%` }} />
          </div>
        </button>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[18px]">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหากิจการ, เลขผู้เสียภาษี, หรือรหัส (Ctrl+K)..."
            className="w-full h-10 pl-10 pr-4 bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 px-3 bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-10 px-3 bg-white dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">ประเภทกิจการทั้งหมด</option>
            <option value="company">บริษัทจำกัด</option>
            <option value="partnership">ห้างหุ้นส่วน/บุคคล</option>
          </select>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onDeleteMultiple(selectedIds)}
              className="h-10 px-3.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>ลบที่เลือก ({selectedIds.length})</span>
            </button>
          )}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-10 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-30 py-1.5">
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">table_view</span>
                  <span>ดาวน์โหลดไฟล์ Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Modern SaaS Data Table */}
      <div className="overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedRecords.length > 0 && selectedIds.length === paginatedRecords.length}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th onClick={() => handleSort('seq')} className="py-3.5 px-3 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
                  {config.colSeq || 'ลำดับ'}
                </th>
                <th onClick={() => handleSort('name')} className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
                  {config.colName || 'ชื่อกิจการ'}
                </th>
                <th className="py-3.5 px-4">{config.colTaxId || 'เลขผู้เสียภาษี'}</th>
                <th className="py-3.5 px-4">{config.colPassword || 'รหัสผ่าน / e-Filing'}</th>
                <th onClick={() => handleSort('status')} className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200">
                  {config.colStatus || 'สถานะ'}
                </th>
                <th className="py-3.5 px-4 text-right">{config.colAction || 'การจัดการ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    ไม่พบข้อมูลกิจการในรอบปี {selectedYear} ตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isHighlighted = lastUpdatedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailRecord(item)}
                      className={`transition-colors cursor-pointer ${
                        isHighlighted
                          ? 'bg-blue-50/80 dark:bg-blue-950/40'
                          : isSelected
                          ? 'bg-zinc-50 dark:bg-zinc-800/40'
                          : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
                      }`}
                    >
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectOne(item.id, e as any)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-zinc-500">
                        {item.sequenceNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span>{item.companyName}</span>
                          {item.type === 'company' ? (
                            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/50">
                              บจ.
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200/50">
                              หจก.
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span>{item.taxId || '-'}</span>
                          {item.taxId && (
                            <button
                              type="button"
                              onClick={(e) => copyToClipboard(item.taxId, 'เลขผู้เสียภาษี', `tax-${item.id}`, e)}
                              className="text-zinc-400 hover:text-blue-600 transition-colors"
                              title="คัดลอกเลขผู้เสียภาษี"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[140px]">{item.password || item.eFilingCode || '-'}</span>
                          {(item.password || item.eFilingCode) && (
                            <button
                              type="button"
                              onClick={(e) => copyToClipboard(item.password || item.eFilingCode, 'รหัสผ่าน', `pass-${item.id}`, e)}
                              className="text-zinc-400 hover:text-blue-600 transition-colors"
                              title="คัดลอกรหัสผ่าน"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={item.status}
                            onChange={(e) => handleQuickStatusChange(item, e.target.value as BusinessStatus)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                              item.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                                : item.status === 'in_progress'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200'
                                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200'
                            }`}
                          >
                            <option value="pending">{config.statusPending || 'รอดำเนินการ'}</option>
                            <option value="in_progress">{config.statusInProgress || 'กำลังทำ'}</option>
                            <option value="completed">{config.statusCompleted || 'เสร็จสิ้น'}</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailRecord(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                            title="ดูรายละเอียด"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditRecord(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(item.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>
            แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, sortedRecords.length)} จาก {sortedRecords.length} รายการ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              ก่อนหน้า
            </button>
            <span className="px-2 font-mono font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddBusinessModal
          allRecords={records}
          onClose={() => setIsAddModalOpen(false)}
          onSave={onAddRecord}
          onShowToast={onShowToast}
          nextSequenceNo={String(records.length + 1)}
        />
      )}

      {selectedDetailRecord && (
        <BusinessDetailModal
          record={selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
          onEdit={onEditRecord}
          onDelete={onDeleteRecord}
          onStatusChange={handleQuickStatusChange}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
