import React, { useState, useMemo } from 'react';
import { BusinessRecord, BusinessStatus, FilterStatus } from '../types';
import { BusinessDetailModal } from './BusinessDetailModal';
import {
  XpFolderIcon,
  XpSearchIcon,
  XpStatusSphere,
  XpEditIcon,
  XpTrashIcon,
} from './ClassicIcons';
import { useSystemConfig } from '../context/SystemConfigContext';

interface BusinessListViewProps {
  records: BusinessRecord[];
  selectedYear?: string;
  onEditRecord?: (record: BusinessRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onShowToast?: (msg: string, title?: string) => void;
}

export const BusinessListView: React.FC<BusinessListViewProps> = ({
  records,
  selectedYear = '69',
  onEditRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onShowToast,
}) => {
  const { config } = useSystemConfig();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'seq' | 'name' | 'taxId'>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('table');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<BusinessRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRecords.length) setSelectedIds([]);
    else setSelectedIds(paginatedRecords.map((r) => r.id));
  };
  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Keep selectedDetailRecord in sync with updated records prop immediately
  React.useEffect(() => {
    if (selectedDetailRecord) {
      const latest = records.find((r) => r.id === selectedDetailRecord.id);
      if (latest && latest !== selectedDetailRecord) {
        setSelectedDetailRecord(latest);
      }
    }
  }, [records, selectedDetailRecord]);

  // Jump to page 1 on new record addition
  const prevCountRef = React.useRef(records.length);
  React.useEffect(() => {
    if (records.length > prevCountRef.current) {
      setCurrentPage(1);
    }
    prevCountRef.current = records.length;
  }, [records]);

  const itemsPerPage = 12;

  const copyToClipboard = (text: string, label: string, key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (onShowToast) onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    if (activeFilter !== 'all') {
      result = result.filter((r) => {
        if (activeFilter === 'company' || activeFilter === 'partnership' || activeFilter === 'individual') {
          return r.type === activeFilter;
        }
        return r.status === activeFilter;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/[-\s]/g, '');
      result = result.filter((r) => {
        const cleanTax = r.taxId.replace(/[-\s]/g, '').toLowerCase();
        return (
          r.companyName.toLowerCase().includes(q) || 
          r.taxId.toLowerCase().includes(q) ||
          cleanTax.includes(cleanQ) ||
          r.sequenceNo.includes(q) ||
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
        comparison = a.taxId.localeCompare(b.taxId);
      } else {
        comparison = (new Date(b.updatedAt).getTime() || 0) - (new Date(a.updatedAt).getTime() || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, activeFilter, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status: BusinessStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: config.statusCompleted || 'เสร็จสิ้น',
        };
      case 'in_progress':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: config.statusInProgress || 'กำลังทำ',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: config.statusPending || 'รอดำเนินการ',
        };
    }
  };

  return (
    <div className="bg-[#f8f9fc] dark:bg-[#090a0f] p-4 sm:p-6 lg:p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <XpFolderIcon size={22} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#18181b] font-headline tracking-tight">
                {config.businessListTitle || 'ทะเบียนกิจการทั้งหมด'}
              </h1>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
                ปี {selectedYear}
              </span>
            </div>
            {config.businessListSubtitle && (
              <p className="text-xs text-[#71717a] mt-0.5">{config.businessListSubtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Layout Toggle */}
          <div className="p-1 bg-white border border-[#e4e4e7] rounded-xl flex items-center shadow-2xs">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`p-1 rounded text-xs flex items-center justify-center transition-colors cursor-pointer ${
                viewLayout === 'table' ? 'bg-[#18181b] text-white' : 'text-[#71717a] hover:text-[#18181b]'
              }`}
              title="ตาราง"
            >
              <span className="material-symbols-outlined text-[16px]">view_list</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('grid')}
              className={`p-1 rounded text-xs flex items-center justify-center transition-colors cursor-pointer ${
                viewLayout === 'grid' ? 'bg-[#18181b] text-white' : 'text-[#71717a] hover:text-[#18181b]'
              }`}
              title="การ์ด"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
            </button>
          </div>

          <div className="px-2.5 py-1 rounded-xl border border-[#e4e4e7] bg-white text-xs font-mono font-bold text-[#18181b] shadow-2xs">
            {records.length.toLocaleString()} รายการ
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative flex-1 w-full">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <XpSearchIcon size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหากิจการ, เลขภาษี..."
            className="w-full pl-8 pr-8 py-1.5 bg-white border border-[#e4e4e7] rounded-xl text-xs text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-neutral-900 shadow-2xs transition-colors"
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

        {/* Filter Selection */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value as FilterStatus);
              setCurrentPage(1);
            }}
            className="appearance-none bg-white border border-[#e4e4e7] rounded-xl px-2.5 py-1.5 text-xs text-[#18181b] font-medium focus:outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="completed">เสร็จสิ้น</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setCurrentPage(1);
            }}
            className="appearance-none bg-white border border-[#e4e4e7] rounded-xl px-2.5 py-1.5 text-xs text-[#18181b] font-medium focus:outline-none focus:border-neutral-900 cursor-pointer shadow-2xs"
          >
            <option value="seq">เรียงตามลำดับ</option>
            <option value="name">เรียงตามชื่อ</option>
            <option value="taxId">เรียงตามเลขภาษี</option>
            <option value="recent">อัปเดตล่าสุด</option>
          </select>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => onDeleteMultiple?.(selectedIds)}
              className="h-8 px-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
              <span>ลบที่เลือก ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-1.5 bg-white border border-[#e4e4e7] rounded-xl text-[#71717a] hover:text-[#18181b] shadow-2xs cursor-pointer"
            title="สลับลำดับ"
          >
            <span className="material-symbols-outlined text-[15px]">
              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      {viewLayout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredAndSortedRecords.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white border border-[#e4e4e7] rounded-xl text-xs text-[#71717a]">
              ไม่พบข้อมูลที่ค้นหา
            </div>
          ) : (
            paginatedRecords.map((record) => {
              const badge = getStatusBadge(record.status);

              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedDetailRecord(record)}
                  className="p-4 bg-transparent border border-transparent hover:bg-white/60 dark:hover:bg-zinc-800/40 hover:border-zinc-200 dark:hover:border-zinc-800 rounded-xl transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-semibold text-[#71717a]">
                        #{record.sequenceNo}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${badge.bg}`}>
                        <XpStatusSphere status={record.status} size={10} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs text-[#18181b] group-hover:text-black line-clamp-1 mb-2">
                      {record.companyName}
                    </h3>

                    <div className="space-y-1 text-xs bg-zinc-100/50 dark:bg-zinc-800/30 p-2.5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717a]">เลขภาษี:</span>
                        <span className="font-mono font-medium text-[#18181b]">{record.taxId || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717a]">e-Filing:</span>
                        <span className="font-mono text-[#52525b]">{record.eFilingCode || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717a]">รหัสผ่าน:</span>
                        <span className="font-mono text-[#18181b] font-medium">{record.password || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-transparent">
              <thead>
                <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10"></th>
                  <th className="py-3.5 px-3">ลำดับ</th>
                  <th className="py-3.5 px-4">ชื่อกิจการ</th>
                  <th className="py-3.5 px-4">เลขผู้เสียภาษี</th>
                  <th className="py-3.5 px-4">รหัสผ่าน / e-Filing</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {paginatedRecords.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailRecord(item)}
                      className="transition-colors cursor-pointer hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                    >
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-3 font-mono font-bold text-zinc-500">{item.sequenceNo}</td>
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
                            onClick={() => onEditRecord?.(item)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="แก้ไข"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {onDeleteRecord && (
                            <button
                              type="button"
                              onClick={() => onDeleteRecord(item.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="ลบ"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 bg-[#fafafa] border-t border-[#e4e4e7] flex items-center justify-between text-xs text-[#71717a]">
              <span>
                {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedRecords.length)} จาก{' '}
                {filteredAndSortedRecords.length.toLocaleString()} รายการ
              </span>

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
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetailRecord && (
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
          onStatusChange={(rec, st) => {
            onEditRecord?.({ ...rec, status: st });
            setSelectedDetailRecord({ ...rec, status: st });
          }}
          onShowToast={onShowToast || (() => {})}
        />
      )}
    </div>
  );
};
