import React, { useState, useMemo } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType, FilterStatus, ViewMode } from '../types';
import { parseDocumentFile } from '../utils/excelHelper';
import { AddBusinessModal } from './AddBusinessModal';
import { EditBusinessModal } from './EditBusinessModal';

interface DashboardViewProps {
  records: BusinessRecord[];
  userName: string;
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
  userName,
  searchQuery: externalSearchQuery,
  onSearchChange: externalOnSearchChange,
  selectedTopic: externalSelectedTopic,
  onSelectTopic: externalOnSelectTopic,
  onEditRecord,
  onDeleteRecord,
  onDeleteMultiple,
  onAddRecord,
  onShowToast,
  onImportRecords
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalOnSearchChange || setLocalSearchQuery;

  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [localSelectedTopic, setLocalSelectedTopic] = useState<string>('all');
  const selectedTopic = externalSelectedTopic !== undefined ? externalSelectedTopic : localSelectedTopic;
  const setSelectedTopic = externalOnSelectTopic || setLocalSelectedTopic;
  const [sortBy, setSortBy] = useState<'recent' | 'seq' | 'name' | 'status' | 'taxId' | 'auditorDate' | 'password' | 'remark' | 'eFilingCode' | 'ssoCode'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<BusinessRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [previewRecords, setPreviewRecords] = useState<Partial<BusinessRecord>[] | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, activeFilter, sortBy, sortOrder]);

  // Statistics
  const totalCount = records.length;
  const verifiedCount = records.filter((r) => r.isVerifiedDbd).length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const doingCount = records.filter((r) => r.status === 'in_progress').length;
  const unfinishedCount = doingCount + pendingCount;
  const doneCount = records.filter((r) => r.status === 'completed').length;
  const companyCount = records.filter((r) => r.type === 'company').length;
  const partnershipCount = records.filter((r) => r.type === 'partnership').length;
  const individualCount = records.filter((r) => r.type === 'individual').length;

  // Extract all unique recorded topics
  const allTopics = useMemo(() => {
    const list: string[] = [];
    records.forEach((r) => {
      const t = r.topic || 'บันทึกข้อมูลเอง';
      if (!list.includes(t)) list.push(t);
    });
    return list;
  }, [records]);

  const verifiedPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  // Filter and Sort across ALL manual and uploaded file records
  const filteredRecords = useMemo(() => {
    let list = [...records];

    // Search query matching (supports normalized Tax ID, partial names, codes, remarks, topics)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/[-\s]/g, '');

      list = list.filter((r) => {
        const cleanTax = r.taxId.replace(/[-\s]/g, '').toLowerCase();
        const cleanSeq = r.sequenceNo.replace(/^[0]+/, '').toLowerCase();
        const rawSeq = r.sequenceNo.toLowerCase();

        return (
          r.companyName.toLowerCase().includes(q) ||
          r.taxId.toLowerCase().includes(q) ||
          cleanTax.includes(cleanQ) ||
          rawSeq.includes(q) ||
          cleanSeq === q ||
          r.auditorDate.toLowerCase().includes(q) ||
          r.eFilingCode.toLowerCase().includes(q) ||
          r.ssoCode.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q) ||
          (r.topic && r.topic.toLowerCase().includes(q)) ||
          (r.type === 'company' && 'บริษัทจำกัด'.includes(q)) ||
          (r.type === 'partnership' && 'ห้างหุ้นส่วนจำกัด'.includes(q)) ||
          (r.type === 'individual' && 'บุคคลธรรมดา ร้านค้า'.includes(q)) ||
          (r.status === 'completed' && 'เสร็จแล้ว'.includes(q)) ||
          (r.status === 'in_progress' && 'กำลังทำ'.includes(q)) ||
          (r.status === 'pending' && 'ยังไม่ได้ทำ'.includes(q))
        );
      });
    }

    // Filter by Topic
    if (selectedTopic !== 'all') {
      list = list.filter((r) => (r.topic || 'บันทึกข้อมูลเอง') === selectedTopic);
    }

    // Filter status / type
    if (activeFilter === 'company') {
      list = list.filter((r) => r.type === 'company');
    } else if (activeFilter === 'partnership') {
      list = list.filter((r) => r.type === 'partnership');
    } else if (activeFilter === 'individual') {
      list = list.filter((r) => r.type === 'individual');
    } else if (activeFilter === 'pending') {
      list = list.filter((r) => r.status === 'pending');
    } else if (activeFilter === 'in_progress') {
      list = list.filter((r) => r.status === 'in_progress');
    } else if (activeFilter === 'completed') {
      list = list.filter((r) => r.status === 'completed');
    }

    // Sort
    const modifier = sortOrder === 'asc' ? 1 : -1;

    if (sortBy === 'seq') {
      list.sort((a, b) => {
        const seqA = a.sequenceNo || '';
        const seqB = b.sequenceNo || '';
        const numA = parseInt(seqA.replace(/\D/g, ''), 10);
        const numB = parseInt(seqB.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return (numA - numB) * modifier;
        }
        return seqA.localeCompare(seqB, undefined, { numeric: true }) * modifier;
      });
    } else if (sortBy === 'name') {
      list.sort((a, b) => {
        const nameCompare = a.companyName.localeCompare(b.companyName, 'th');
        if (nameCompare !== 0) return nameCompare * modifier;
        const seqA = a.sequenceNo || '';
        const seqB = b.sequenceNo || '';
        const numA = parseInt(seqA.replace(/\D/g, ''), 10);
        const numB = parseInt(seqB.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * modifier;
        return seqA.localeCompare(seqB, undefined, { numeric: true }) * modifier;
      });
    } else if (sortBy === 'status') {
      const order: Record<BusinessStatus, number> = { in_progress: 1, pending: 2, completed: 3 };
      list.sort((a, b) => {
        const statusCompare = order[a.status] - order[b.status];
        if (statusCompare !== 0) return statusCompare * modifier;
        const seqA = a.sequenceNo || '';
        const seqB = b.sequenceNo || '';
        const numA = parseInt(seqA.replace(/\D/g, ''), 10);
        const numB = parseInt(seqB.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return (numA - numB) * modifier;
        return seqA.localeCompare(seqB, undefined, { numeric: true }) * modifier;
      });
    } else if (sortBy === 'recent') {
      list.sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        
        // If they have the exact same timestamp (e.g. imported together in the same file)
        if (Math.abs(timeA - timeB) < 1000) {
          const seqA = a.sequenceNo || '';
          const seqB = b.sequenceNo || '';
          const numA = parseInt(seqA.replace(/\D/g, ''), 10);
          const numB = parseInt(seqB.replace(/\D/g, ''), 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return (numA - numB) * modifier;
          }
          return seqA.localeCompare(seqB, undefined, { numeric: true }) * modifier;
        }
        return (timeB - timeA) * modifier;
      });
    } else {
      // General field sorting (taxId, auditorDate, password, remark, eFilingCode, ssoCode)
      list.sort((a, b) => {
        const valA = String(a[sortBy] || '').trim();
        const valB = String(b[sortBy] || '').trim();
        
        // Thai locale comparison for name / notes etc.
        return valA.localeCompare(valB, 'th', { numeric: true }) * modifier;
      });
    }

    return list;
  }, [records, searchQuery, selectedTopic, activeFilter, sortBy, sortOrder]);

  // Pagination configuration: exactly 12 items per page
  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseDocumentFile(file, `ไฟล์: ${file.name}`);
      if (parsed.length > 0) {
        setPreviewRecords(parsed);
        setPreviewFileName(file.name);
        onShowToast(`เตรียมข้อมูลพรีวิวสำเร็จ ${parsed.length} รายการ กรุณาตรวจสอบก่อนกดนำเข้า`, 'พรีวิวข้อมูลนำเข้า');
      } else {
        onShowToast(`ไม่พบข้อมูลกิจการในไฟล์ ${file.name}`, 'แจ้งเตือน');
      }
    } catch (err) {
      onShowToast(`เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}`, 'ข้อผิดพลาด');
    }
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (previewRecords && onImportRecords) {
      onImportRecords(previewRecords);
      onShowToast(`นำเข้าสำเร็จ ${previewRecords.length} รายการจากไฟล์ ${previewFileName}`, 'นำเข้าข้อมูลสำเร็จ');
      setPreviewRecords(null);
      setPreviewFileName(null);
    }
  };

  const handleResetPreview = () => {
    setPreviewRecords(null);
    setPreviewFileName(null);
    onShowToast(`ยกเลิกและรีเซ็ตการพรีวิวไฟล์เรียบร้อยแล้ว`);
  };

  const handleAddRecord = (newRecord: BusinessRecord) => {
    if (onAddRecord) {
      onAddRecord(newRecord);
    }
    onShowToast(`เพิ่มกิจการ "${newRecord.companyName}" สำเร็จ`);
    setIsAddModalOpen(false);
  };

  // Copy Tax ID
  const handleCopyTaxId = (taxId: string) => {
    navigator.clipboard?.writeText(taxId);
    onShowToast(`คัดลอกเลขประจำตัวผู้เสียภาษีแล้ว: ${taxId}`);
  };

  // Copy general text
  const handleCopyText = (text: string, label: string) => {
    if (!text || text === '-') return;
    navigator.clipboard?.writeText(text);
    onShowToast(`คัดลอก${label}แล้ว: ${text}`);
  };

  // Toggle Password Mask
  const togglePasswordMask = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Select all toggle
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Select single row
  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Confirm delete single
  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      onDeleteRecord(recordToDelete.id);
      onShowToast(`ลบรายการ "${recordToDelete.companyName}" สำเร็จ`);
      setRecordToDelete(null);
    }
  };

  // Confirm delete batch
  const handleBatchDeleteConfirm = () => {
    if (selectedIds.length > 0) {
      onDeleteMultiple(selectedIds);
      onShowToast(`ลบ ${selectedIds.length} รายการที่เลือกเรียบร้อยแล้ว`);
      setSelectedIds([]);
      setIsDeletingBatch(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
      {/* ================= TOP COMMAND BAR (CLEAN & MINIMALIST) ================= */}
      <div className="bg-white rounded-2xl p-4 border border-[#dce8e1] shadow-xs flex items-center justify-between gap-4">
        {/* Left: Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <span className="material-symbols-outlined text-[16px] text-emerald-700">corporate_fare</span>
            <div className="text-xs font-medium text-emerald-900">
               ทั้งหมด: <span className="font-bold font-mono text-emerald-700">{totalCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-100">
            <span className="material-symbols-outlined text-[16px] text-teal-700">task_alt</span>
            <div className="text-xs font-medium text-teal-900">
               ยืนยัน DBD: <span className="font-bold font-mono text-teal-700">{verifiedCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
            <span className="material-symbols-outlined text-[16px] text-amber-700">pending_actions</span>
            <div className="text-xs font-medium text-amber-900">
               รอดำเนินการ: <span className="font-bold font-mono text-amber-700">{unfinishedCount}</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Add Business Action */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-800 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-all border border-[#dce8e1] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span>เพิ่มกิจการ</span>
          </button>

          {/* Import Action */}
          <label className="flex items-center gap-2 bg-[#2d6a59] hover:bg-[#215244] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all border border-emerald-700 cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>นำเข้าข้อมูล (Excel/CSV)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
        </div>
      </div>

      {/* ================= MODAL: ADD BUSINESS ================= */}
      {isAddModalOpen && (() => {
        const maxSeq = records.reduce((max, r) => Math.max(max, parseInt(r.sequenceNo || '0', 10)), 0);
        return (
          <AddBusinessModal
            allRecords={records}
            nextSequenceNo={String(maxSeq + 1).padStart(2, '0')}
            onClose={() => setIsAddModalOpen(false)}
            onSave={handleAddRecord}
            onShowToast={onShowToast}
          />
        );
      })()}

      {/* ================= MODAL: INTERACTIVE FILE IMPORT PREVIEW POPUP ================= */}
      {previewRecords && previewRecords.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-emerald-100 max-w-4xl w-full flex flex-col shadow-2xl overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#113a2d] to-[#1c5040] p-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-emerald-300">
                  find_in_page
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-headline flex items-center gap-2">
                    <span>ตรวจสอบและยืนยันข้อมูลนำเข้า</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 border border-emerald-600 text-emerald-300 text-xs font-bold font-mono">
                      {previewRecords.length} กิจการ
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-emerald-200/80 font-medium mt-0.5">
                    ชื่อไฟล์: <span className="font-mono font-bold text-white">{previewFileName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetPreview}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                title="ปิดหน้าต่างพรีวิว"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body Info Alert */}
            <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-2.5 text-amber-900 text-[11px] font-medium flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">
                info
              </span>
              <span>
                กรุณาเลื่อนดูคอลัมน์และลำดับแถวด้านล่างเพื่อยืนยันว่าข้อมูลนำเข้าจาก Excel/CSV ได้รับการจัดเรียงโครงสร้างอย่างสมบูรณ์แบบ
              </span>
            </div>

            {/* Scrollable Preview Table Container */}
            <div className="overflow-auto flex-1 max-h-[50vh] p-4 bg-[#fbfdfc]">
              <div className="rounded-xl border border-[#dce8e1] bg-white overflow-hidden shadow-2xs">
                <table className="min-w-full text-[11.5px] text-[#2c3d36] table-auto">
                  <thead className="sticky top-0 z-10 bg-[#f3f9f5] border-b border-[#dce8e1] text-[#3e6657] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14 bg-[#f3f9f5]">ลำดับ</th>
                      <th className="py-2.5 px-3 text-left w-36 bg-[#f3f9f5]">เลขผู้เสียภาษี</th>
                      <th className="py-2.5 px-4 text-left bg-[#f3f9f5]">ชื่อนิติบุคคล / บริษัท / ห้างหุ้นส่วน</th>
                      <th className="py-2.5 px-3 text-left w-28 bg-[#f3f9f5]">วันที่แจ้งผู้สอบ</th>
                      <th className="py-2.5 px-3 text-left w-32 bg-[#f3f9f5]">PASSWORD</th>
                      <th className="py-2.5 px-3 text-left w-36 bg-[#f3f9f5]">หมายเหตุ/รหัสใหม่</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-50/70">
                    {previewRecords.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f3faf6] transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800">
                          {item.sequenceNo || idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#143c30]">
                          {item.taxId || (
                            <span className="text-gray-400 font-normal italic">ไม่มีข้อมูล</span>
                          )}
                        </td>
                        <td className="py-2 px-4 font-bold text-emerald-950">
                          {item.companyName || (
                            <span className="text-gray-400 font-normal italic">ไม่มีข้อมูล</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[#4f6e62]">
                          {item.auditorDate || '-'}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#4f6e62]">
                          {item.password || '-'}
                        </td>
                        <td className="py-2 px-3 text-[#4f6e62] max-w-[200px] truncate" title={item.remark || ''}>
                          {item.remark || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="text-[10.5px] text-[#426c5c] font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">swap_vertical_circle</span>
                <span>สามารถเลื่อนตารางขึ้น-ลงเพื่อตรวจสอบทุกลำดับอย่างละเอียด</span>
              </div>
              
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleResetPreview}
                  className="px-4 py-2 rounded-xl border border-gray-200 hover:border-rose-200 text-gray-700 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="รีเซ็ตและล้างข้อมูลไฟล์นำเข้านี้"
                >
                  <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
                  <span>ยกเลิก / รีเซ็ต</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-900/10 transition-all cursor-pointer flex items-center gap-1.5"
                  title="กดยืนยันเพื่อบันทึกข้อมูลกิจการทั้งหมดเข้าสู่ระบบอย่างถาวร"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>ยืนยันบันทึกข้อมูลเข้าระบบ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REMOVED STAT METRIC CARDS ================= */}

      {/* ================= FILTER & COMMAND CONTROLS ================= */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-[#dce8e1] shadow-xs flex flex-col gap-2.5">
        <div className="flex flex-col lg:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#688e80] text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อบริษัท, เลขผู้เสียภาษี, ผู้สอบ, หรือรหัสยื่น..."
              className="w-full pl-10 pr-10 py-2 bg-[#f6fbf8] rounded-xl text-xs text-[#192823] placeholder:text-[#6a9083] border border-[#d4e4db] focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c9e92] hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  cancel
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end shrink-0 flex-wrap">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  activeFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-[#192823] border-[#dce8e1] hover:border-emerald-200'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  activeFilter === 'pending'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-[#192823] border-[#dce8e1] hover:border-rose-200'
                }`}
              >
                รอดำเนินการ
              </button>
              <button
                onClick={() => setActiveFilter('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  activeFilter === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-[#192823] border-[#dce8e1] hover:border-emerald-200'
                }`}
              >
                เสร็จแล้ว
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-[#f6fbf8] px-2.5 py-1.5 rounded-xl border border-[#d4e4db]">
              <span className="material-symbols-outlined text-[15px] text-[#5f8677]">
                sort
              </span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                }}
                className="bg-transparent text-[#192823] font-semibold text-xs border-none focus:ring-0 p-0 pr-1 cursor-pointer outline-none"
              >
                <option value="recent">เรียงตามไฟล์เดิมที่นำเข้า (ล่าสุด)</option>
                <option value="seq">ลำดับเลข (01 → 99)</option>
                <option value="name">ชื่อบริษัท / นิติบุคคล</option>
                <option value="taxId">เลขประจำตัวผู้เสียภาษี</option>
                <option value="auditorDate">วันที่แจ้งผู้สอบ</option>
                <option value="password">PASSWORD</option>
                <option value="remark">หมายเหตุ/รหัสใหม่</option>
                <option value="eFilingCode">รหัสยื่น e-filing</option>
                <option value="ssoCode">ประกันสังคม</option>
                <option value="status">สถานะความสมบูรณ์</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-emerald-100 text-emerald-800 transition-colors ml-1"
                title={sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก (คลิกเพื่อเปลี่ยน)' : 'เรียงจากมากไปน้อย (คลิกเพื่อเปลี่ยน)'}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              </button>
            </div>

            {/* View Switcher */}
            <div className="flex items-center bg-[#edf6f1] p-0.5 rounded-xl border border-[#d3e5dc]">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#195240] shadow-xs border border-[#cbe1d5]'
                    : 'text-[#557e70] hover:text-[#164335]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  grid_view
                </span>
                <span>การ์ด</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#195240] shadow-xs border border-[#cbe1d5]'
                    : 'text-[#557e70] hover:text-[#164335]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  table_rows
                </span>
                <span>ตาราง</span>
              </button>
            </div>

            {/* Delete Batch Button (If selected) */}
            {selectedIds.length > 0 && (
              <button
                onClick={() => setIsDeletingBatch(true)}
                type="button"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[15px]">
                  delete_forever
                </span>
                <span>ลบ ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= VIEW MODE: TABLE VIEW ================= */}
        <div className="bg-white rounded-2xl border border-[#dce8e1] shadow-xs flex flex-col overflow-hidden">
              {/* Table Header Bar */}
              <div className="px-5 py-3.5 border-b border-[#edf4f0] flex items-center justify-between bg-gradient-to-r from-white via-[#f8fbf9] to-white flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-[18px]">
                      table_chart_view
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-sm font-bold text-[#143c2f] font-headline">
                        แถบข้อมูลกิจการ
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-800 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          {pendingCount}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-900 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          {doingCount}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {doneCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#527568] font-mono bg-[#f2f8f5] px-2.5 py-0.5 rounded-lg border border-[#d4e6dd]">
                    ปีภาษี: 2569
                  </span>
                </div>
              </div>

          {/* View Content: Table or Cards */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left min-w-[1050px]">
                <thead>
                  <tr className="bg-[#f5faf7] border-b border-[#dce8e1] text-[#2c5b4b] font-semibold text-[11px] tracking-wide font-headline">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredRecords.length > 0 &&
                          selectedIds.length === filteredRecords.length
                        }
                        onChange={handleSelectAll}
                        title="เลือกทั้งหมด"
                        className="rounded border-[#b8d2c6] text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </th>
                    <th 
                      onClick={() => handleSort('seq')}
                      className={`py-3 px-3 w-16 text-center whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'seq' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามลำดับเลข"
                    >
                      <div className="flex items-center gap-1 justify-center">
                        <span>ลำดับ</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'seq' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('taxId')}
                      className={`py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'taxId' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามเลขผู้เสียภาษี"
                    >
                      <div className="flex items-center gap-1">
                        <span>เลขประจำตัวผู้เสียภาษี</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'taxId' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('name')}
                      className={`py-3 px-4 min-w-[220px] cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'name' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามชื่อบริษัท"
                    >
                      <div className="flex items-center gap-1">
                        <span>ชื่อบริษัท / ห้างหุ้นส่วนจำกัด</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'name' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('auditorDate')}
                      className={`py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'auditorDate' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามวันที่แจ้งผู้สอบ"
                    >
                      <div className="flex items-center gap-1">
                        <span>วันที่แจ้งผู้สอบ</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'auditorDate' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('password')}
                      className={`py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'password' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตาม PASSWORD"
                    >
                      <div className="flex items-center gap-1">
                        <span>PASSWORD</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'password' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('remark')}
                      className={`py-3 px-3 min-w-[140px] cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'remark' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามหมายเหตุ"
                    >
                      <div className="flex items-center gap-1">
                        <span>หมายเหตุ/รหัสใหม่</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'remark' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('eFilingCode')}
                      className={`py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'eFilingCode' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามรหัสยื่น e-filing"
                    >
                      <div className="flex items-center gap-1">
                        <span>รหัสยื่น e-filing</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'eFilingCode' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('ssoCode')}
                      className={`py-3 px-3 whitespace-nowrap cursor-pointer hover:bg-[#e8f3ec] select-none transition-colors ${sortBy === 'ssoCode' ? 'bg-[#ebf5ef] font-bold text-[#143c2f]' : ''}`} 
                      scope="col"
                      title="คลิกเพื่อเรียงตามประกันสังคม"
                    >
                      <div className="flex items-center gap-1">
                        <span>ประกันสังคม</span>
                        <span className="material-symbols-outlined text-[13px] opacity-75">
                          {sortBy === 'ssoCode' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center whitespace-nowrap w-20" scope="col">
                      จัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf5f0] text-xs">
                  {currentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                          <span className="text-sm font-headline font-semibold text-slate-600">ไม่พบข้อมูลกิจการที่ค้นหา</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentRecords.map((r, idx) => {
                      const isRevealed = !!revealedPasswords[r.id];
                      const isSelected = selectedIds.includes(r.id);

                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-[#f5faf7] transition-colors group ${
                            isSelected ? 'bg-emerald-50/60' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectRow(r.id)}
                              className="rounded border-[#b8d2c6] text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                            />
                          </td>

                          {/* 1. ลำดับ */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-mono font-bold text-xs bg-[#eaf4ef] text-[#1c5544] px-2.5 py-0.5 rounded-md border border-[#cbe1d5] inline-block">
                                {r.sequenceNo}
                              </span>
                            </div>
                          </td>

                          {/* 2. เลขประจำตัวผู้เสียภาษี */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-semibold text-xs text-[#173e32] bg-[#f2f8f5] px-2.5 py-1 rounded border border-[#d2e4db]">
                                {r.taxId}
                              </span>
                              <button
                                onClick={() => handleCopyTaxId(r.taxId)}
                                type="button"
                                className="text-[#557e70] hover:text-emerald-700 transition-colors p-1 hover:bg-[#e4f1eb] rounded cursor-pointer"
                                title="คัดลอกเลขประจำตัวผู้เสียภาษี"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  content_copy
                                </span>
                              </button>
                            </div>
                          </td>

                          {/* 3. ชื่อบริษัท / ห้างหุ้นส่วนจำกัด */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#143d30] text-xs group-hover:text-emerald-800 transition-colors">
                                  {r.companyName}
                                </span>
                                {r.status === 'completed' && (
                                  <span className="material-symbols-outlined text-[14px] text-emerald-600 shrink-0" title="ยืนยันข้อมูลแล้ว">
                                    check_circle
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9.5px] font-semibold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 inline-block w-fit">
                                  {r.type === 'partnership'
                                    ? 'ห้างหุ้นส่วน'
                                    : r.type === 'individual'
                                    ? 'บุคคลธรรมดา'
                                    : 'บริษัทจำกัด'}
                                </span>
                                {/* Status Badge */}
                                {r.status === 'in_progress' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.1 rounded text-[9.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    กำลังทำ
                                  </span>
                                ) : r.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.1 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    เสร็จแล้ว
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.1 rounded text-[9.5px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    ยังไม่ทำ
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 4. วันที่แจ้งผู้สอบ */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-[#3b6254] font-medium">
                              <span className="material-symbols-outlined text-[14px] text-[#699081]">
                                event
                              </span>
                              <span>{r.auditorDate || '-'}</span>
                            </div>
                          </td>

                          {/* 5. PASSWORD */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1 bg-[#f2f8f5] px-2 py-1 rounded-lg border border-[#d2e4db] w-fit">
                              <span className="font-mono text-xs text-[#285747]">
                                {isRevealed ? (
                                  <span className="font-semibold">{r.password || '-'}</span>
                                ) : (
                                  <span className="tracking-widest">••••••••</span>
                                )}
                              </span>
                              <button
                                onClick={() => togglePasswordMask(r.id)}
                                type="button"
                                className="text-[#578173] hover:text-emerald-800 transition-colors p-0.5 rounded cursor-pointer"
                                title={isRevealed ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {isRevealed ? 'visibility_off' : 'visibility'}
                                </span>
                              </button>
                              {isRevealed && r.password && (
                                <button
                                  onClick={() => handleCopyText(r.password, 'รหัสผ่าน')}
                                  type="button"
                                  className="text-[#578173] hover:text-emerald-800 transition-colors p-0.5 rounded cursor-pointer"
                                  title="คัดลอกรหัสผ่าน"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    content_copy
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 6. หมายเหตุ/รหัสใหม่ */}
                          <td className="py-3 px-3">
                            {r.remark ? (
                              <span className="text-[11px] text-[#2c5849] bg-[#eef6f2] px-2 py-0.5 rounded-md font-medium inline-block border border-[#d4e6dd] max-w-[180px] truncate" title={r.remark}>
                                {r.remark}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* 7. รหัสยื่น e-filing */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {r.eFilingCode && r.eFilingCode !== '-' ? (
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 inline-flex items-center gap-1 font-mono">
                                  <span className="material-symbols-outlined text-[12px]">
                                    cloud_done
                                  </span>
                                  {r.eFilingCode}
                                </span>
                                <button
                                  onClick={() => handleCopyText(r.eFilingCode, 'รหัส e-Filing')}
                                  type="button"
                                  className="text-[#557e70] hover:text-emerald-700 transition-colors p-1 hover:bg-[#e4f1eb] rounded cursor-pointer"
                                  title="คัดลอกรหัส e-Filing"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    content_copy
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* 8. ประกันสังคม */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {r.ssoCode && r.ssoCode !== '-' ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs font-semibold text-[#1f4a3d] bg-[#f2f8f5] px-2 py-0.5 rounded border border-[#d2e4db] inline-block">
                                  {r.ssoCode}
                                </span>
                                <button
                                  onClick={() => handleCopyText(r.ssoCode, 'รหัสประกันสังคม')}
                                  type="button"
                                  className="text-[#557e70] hover:text-emerald-700 transition-colors p-1 hover:bg-[#e4f1eb] rounded cursor-pointer"
                                  title="คัดลอกรหัสประกันสังคม"
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    content_copy
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">-</span>
                            )}
                          </td>

                          {/* จัดการ (Edit & Delete) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditRecord(r)}
                                className="p-1.5 rounded-lg text-[#527d6f] hover:text-emerald-700 hover:bg-[#e7f4ee] transition-colors cursor-pointer"
                                title="แก้ไขข้อมูล"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>
                              <button
                                onClick={() => setRecordToDelete(r)}
                                className="p-1.5 rounded-lg text-[#527d6f] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="ลบรายการ"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
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
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-250px)] overflow-y-auto">
              {currentRecords.map((r, idx) => (
                <div key={r.id} className="bg-white border border-[#dce8e1] rounded-xl p-4 shadow-sm hover:border-emerald-200 transition-all flex flex-col gap-2 relative">
                  <div className="absolute top-4 right-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={() => handleSelectRow(r.id)}
                      className="rounded border-[#b8d2c6] text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {r.status === 'completed' ? 'เสร็จแล้ว' : 'ยังไม่ทำ'}
                    </span>
                  </div>
                  <h3 className="font-bold text-[#143d30] text-sm">{r.companyName}</h3>
                  <div className="text-xs text-[#527d6f]">ภาษี: {r.taxId}</div>
                  <div className="text-xs text-[#527d6f]">ผู้สอบ: {r.auditorDate || '-'}</div>
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button onClick={() => onEditRecord(r)} className="text-emerald-700 text-xs font-semibold">แก้ไข</button>
                    <button onClick={() => setRecordToDelete(r)} className="text-rose-600 text-xs font-semibold">ลบ</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Dock */}
          <div className="p-3.5 bg-[#f8fbf9] border-t border-[#edf4f0] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#4a7263]">
                แสดง{' '}
                <span className="font-bold text-[#143c2f] font-mono">
                  {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
                </span>{' '}
                ถึง{' '}
                <span className="font-bold text-[#143c2f] font-mono">
                  {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
                </span>{' '}
                จาก{' '}
                <span className="font-bold text-[#143c2f] font-mono">
                  {filteredRecords.length}
                </span>{' '}
                รายการที่กรอง (ทั้งหมด {records.length} รายการในระบบ)
              </span>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg border border-[#dce8e1] bg-white flex items-center justify-center text-[#2c5b4b] hover:bg-[#edf5f1] transition-all disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  type="button"
                  title="หน้าก่อนหน้า"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_left
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg border text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? 'bg-[#143c2f] text-white border-[#143c2f]'
                            : 'bg-white text-[#2c5b4b] border-[#dce8e1] hover:bg-[#edf5f1]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-[#dce8e1] bg-white flex items-center justify-center text-[#2c5b4b] hover:bg-[#edf5f1] transition-all disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  type="button"
                  title="หน้าถัดไป"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_right
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

      {/* ================= CONFIRM DELETE SINGLE MODAL ================= */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0f2d24]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#dbe8e1] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <span className="material-symbols-outlined text-[22px]">
                  delete_forever
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#143c2f] font-headline">
                  ยืนยันการลบรายการ
                </h3>
                <p className="text-xs text-[#527d6f] mt-0.5">
                  คุณต้องการลบข้อมูลกิจการนี้ใช่หรือไม่?
                </p>
              </div>
            </div>
            <div className="p-3 bg-[#f5faf7] rounded-xl border border-[#dce8e1] text-xs font-mono text-[#1a5544]">
              {recordToDelete.companyName} ({recordToDelete.sequenceNo})
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#487062] hover:bg-[#edf5f0] transition-colors cursor-pointer"
                type="button"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM BATCH DELETE MODAL ================= */}
      {isDeletingBatch && (
        <div className="fixed inset-0 z-50 bg-[#0f2d24]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#dbe8e1] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <span className="material-symbols-outlined text-[22px]">
                  delete_sweep
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#143c2f] font-headline">
                  ยืนยันการลบแบบกลุ่ม
                </h3>
                <p className="text-xs text-[#527d6f] mt-0.5">
                  คุณต้องการลบ {selectedIds.length} รายการที่เลือกใช่หรือไม่?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeletingBatch(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#487062] hover:bg-[#edf5f0] transition-colors cursor-pointer"
                type="button"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBatchDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
                type="button"
              >
                ยืนยันลบ {selectedIds.length} รายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
