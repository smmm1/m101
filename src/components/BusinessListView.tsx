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

interface BusinessListViewProps {
  records: BusinessRecord[];
  selectedYear?: string;
  onEditRecord?: (record: BusinessRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onShowToast?: (msg: string, title?: string) => void;
}

export const BusinessListView: React.FC<BusinessListViewProps> = ({
  records,
  selectedYear = '69',
  onEditRecord,
  onDeleteRecord,
  onShowToast,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'seq' | 'name' | 'taxId'>('seq');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('table');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<BusinessRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
          label: 'เสร็จสิ้น',
        };
      case 'in_progress':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'กำลังทำ',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'รอดำเนินการ',
        };
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <XpFolderIcon size={22} />
          <h1 className="text-xl font-bold text-[#18181b] font-headline tracking-tight">
            ทะเบียนกิจการทั้งหมด
          </h1>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-[#f4f4f5] text-[#18181b] border border-[#e4e4e7]">
            ปี {selectedYear}
          </span>
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
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="in_progress">กำลังทำ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="company">บริษัทจำกัด</option>
            <option value="partnership">ห้างหุ้นส่วน</option>
            <option value="individual">บุคคลธรรมดา</option>
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
                  className="p-4 bg-white border border-[#e4e4e7] hover:border-neutral-400 rounded-xl shadow-2xs transition-all flex flex-col justify-between cursor-pointer group"
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

                    <div className="space-y-1 text-xs bg-[#fafafa] p-2.5 rounded-lg border border-[#f4f4f5]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717a]">เลขภาษี:</span>
                        <span className="font-mono font-medium text-[#18181b]">{record.taxId || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#71717a]">e-Filing:</span>
                        <span className="font-mono text-[#52525b]">{record.eFilingCode || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="border border-[#e4e4e7] rounded-xl bg-white overflow-hidden shadow-2xs flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#e4e4e7] bg-[#fafafa] text-[#71717a] font-medium">
                  <th className="py-2.5 px-3 w-16">ลำดับ</th>
                  <th className="py-2.5 px-3">ชื่อกิจการ</th>
                  <th className="py-2.5 px-3 font-mono">เลขผู้เสียภาษี</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">แจ้งผู้สอบ</th>
                  <th className="py-2.5 px-3 font-mono">รหัส e-Filing</th>
                  <th className="py-2.5 px-3">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4f4f5]">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#71717a]">
                      ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => {
                    const badge = getStatusBadge(record.status);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelectedDetailRecord(record)}
                        className="hover:bg-[#fafafa] transition-colors cursor-pointer group"
                      >
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
                              <button
                                type="button"
                                onClick={(e) => copyToClipboard(record.taxId, 'เลขภาษี', `tax-${record.id}`, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-[#18181b] cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {copiedKey === `tax-${record.id}` ? 'check' : 'content_copy'}
                                </span>
                              </button>
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
                        <td className="py-2.5 px-3 font-mono text-[#52525b]">
                          {record.eFilingCode || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}>
                            <XpStatusSphere status={record.status} size={10} />
                            <span>{badge.label}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedDetailRecord(record)}
                              className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 rounded cursor-pointer"
                              title="ดูรายละเอียด"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                            </button>
                            {onEditRecord && (
                              <button
                                type="button"
                                onClick={() => onEditRecord(record)}
                                className="p-1 text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 rounded cursor-pointer"
                                title="แก้ไข"
                              >
                                <XpEditIcon size={14} />
                              </button>
                            )}
                            {onDeleteRecord && (
                              <button
                                type="button"
                                onClick={() => onDeleteRecord(record.id)}
                                className="p-1 text-[#71717a] hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="ลบ"
                              >
                                <XpTrashIcon size={14} />
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
