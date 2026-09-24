import React, { useState, useMemo } from 'react';
import { BusinessRecord, FilterStatus } from '../types';

interface BusinessListViewProps {
  records: BusinessRecord[];
}

export const BusinessListView: React.FC<BusinessListViewProps> = ({ records }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'seq' | 'name' | 'taxId'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const itemsPerPage = 15;

  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    // Filter by Status/Type
    if (activeFilter !== 'all') {
      result = result.filter((r) => {
        if (activeFilter === 'company' || activeFilter === 'partnership' || activeFilter === 'individual') {
          return r.type === activeFilter;
        }
        return r.status === activeFilter;
      });
    }

    // Search Query
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
          (r.topic && r.topic.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'seq') {
        comparison = a.sequenceNo.localeCompare(b.sequenceNo, undefined, { numeric: true });
      } else if (sortBy === 'name') {
        comparison = a.companyName.localeCompare(b.companyName, 'th');
      } else if (sortBy === 'taxId') {
        comparison = a.taxId.localeCompare(b.taxId);
      } else {
        // recent (by timestamp if possible, otherwise id)
        comparison = (a.createdAt || a.id).localeCompare(b.createdAt || b.id);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, activeFilter, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  const handleFilterChange = (filter: FilterStatus) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-6 bg-[#f8faf9]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#dce8e1] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#2d6a59] flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-[28px]">description</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#143c2f] font-headline">เอกสารทะเบียนกิจการ</h1>
            <p className="text-xs text-[#527d6f]">แสดงข้อมูลกิจการทั้งหมดในรูปแบบบัญชีรายชื่อ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col items-end">
            <span className="text-[10px] text-[#557e70] font-bold uppercase tracking-wider">Filtered / Total</span>
            <span className="text-sm font-bold text-emerald-800 font-mono leading-none">
              {filteredAndSortedRecords.length.toLocaleString()} / {records.length.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#dce8e1] shadow-xs flex flex-col lg:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อ, เลขภาษี, ลำดับ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-600 focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0 w-full lg:w-auto">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => handleFilterChange('pending')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'pending' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            รอดำเนินการ
          </button>
          <button
            onClick={() => handleFilterChange('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'in_progress' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            กำลังทำ
          </button>
          <button
            onClick={() => handleFilterChange('completed')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'completed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            เสร็จแล้ว
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <button
            onClick={() => handleFilterChange('company')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'company' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            บริษัท
          </button>
          <button
            onClick={() => handleFilterChange('partnership')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all whitespace-nowrap ${
              activeFilter === 'partnership' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            หจก.
          </button>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="material-symbols-outlined text-[16px] text-slate-500">sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[11px] font-bold text-slate-700 border-none outline-none focus:ring-0 p-0 pr-4"
            >
              <option value="recent">ล่าสุด</option>
              <option value="seq">ลำดับเลข</option>
              <option value="name">ชื่อกิจการ</option>
              <option value="taxId">เลขภาษี</option>
            </select>
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">
              {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-[#dce8e1] shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f1f6f3] border-b border-[#dce8e1]">
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider w-16 text-center">ลำดับ</th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider w-24">รหัส</th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider">ชื่อกิจการ</th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider w-40">เลขประจำตัวผู้เสียภาษี</th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider w-32">ประเภท</th>
                <th className="py-3.5 px-4 text-[11px] font-bold text-[#3d5a4e] uppercase tracking-wider w-32 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf5f0]">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <span className="material-symbols-outlined text-5xl block mb-2 opacity-20">find_in_page</span>
                    <p className="text-sm font-medium">ไม่พบข้อมูลในหน้านี้</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-[#f9fcfb] transition-colors group">
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-[#527d6f] font-mono">
                        {startIndex + index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                        {record.sequenceNo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#143d30] group-hover:text-emerald-700 transition-colors">
                          {record.companyName}
                        </span>
                        {record.topic && (
                          <span className="text-[10px] text-slate-400 italic">
                            หมวดหมู่: {record.topic}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono text-[#4a635a] font-medium tracking-tight">
                        {record.taxId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-[#527d6f]">
                        {record.type === 'partnership' ? 'ห้างหุ้นส่วน' : record.type === 'individual' ? 'บุคคลธรรมดา' : 'บริษัทจำกัด'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        record.status === 'completed' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                          : record.status === 'in_progress'
                          ? 'bg-amber-50 text-amber-800 border-amber-100'
                          : 'bg-rose-50 text-rose-800 border-rose-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          record.status === 'completed' ? 'bg-emerald-500' : record.status === 'in_progress' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        {record.status === 'completed' ? 'เสร็จแล้ว' : record.status === 'in_progress' ? 'กำลังทำ' : 'ยังไม่ทำ'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 bg-[#fbfdfc] border-t border-[#dce8e1] flex items-center justify-between">
          <div className="text-xs text-[#527d6f] font-medium">
            แสดง {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedRecords.length)} จากทั้งหมด {filteredAndSortedRecords.length} รายการ
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-[#dce8e1] flex items-center justify-center text-slate-500 hover:bg-white hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(pageNum => {
                  if (totalPages <= 7) return true;
                  if (pageNum === 1 || pageNum === totalPages) return true;
                  return Math.abs(pageNum - currentPage) <= 1;
                })
                .map((pageNum, index, array) => {
                  const showEllipsis = index > 0 && pageNum - array[index - 1] > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && <span className="text-slate-400 text-[10px]">...</span>}
                      <button
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          currentPage === pageNum 
                            ? 'bg-[#2d6a59] text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 rounded-lg border border-[#dce8e1] flex items-center justify-center text-slate-500 hover:bg-white hover:text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Scroll to Top Button */}
      <button 
        onClick={() => {
          const container = document.querySelector('.overflow-y-auto');
          container?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-8 right-8 w-12 h-12 bg-white rounded-full shadow-lg border border-emerald-100 text-emerald-800 flex items-center justify-center hover:bg-emerald-50 transition-all z-20"
        title="เลื่อนขึ้นบนสุด"
      >
        <span className="material-symbols-outlined">arrow_upward</span>
      </button>
    </div>
  );
};
