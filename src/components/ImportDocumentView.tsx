import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { BusinessRecord } from '../types';
import { parseDocumentFile } from '../utils/excelHelper';

interface ImportDocumentViewProps {
  selectedYear: string;
  existingRecords: BusinessRecord[];
  onImportRecords: (records: Partial<BusinessRecord>[]) => void;
  onShowToast: (message: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ImportDocumentView: React.FC<ImportDocumentViewProps> = ({
  selectedYear,
  existingRecords,
  onImportRecords,
  onShowToast,
}) => {
  const [parsedRows, setParsedRows] = useState<Partial<BusinessRecord>[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    try {
      const rows = await parseDocumentFile(file, `ไฟล์: ${file.name}`);
      setParsedRows(rows);
      setSelectedRowIndices(rows.map((_, i) => i)); // Select all by default
      onShowToast(`อ่านไฟล์ ${file.name} สำเร็จ ${rows.length} รายการ`, 'อัปโหลดสำเร็จ', 'success');
    } catch (err) {
      onShowToast(`เกิดข้อผิดพลาดในการอ่านไฟล์ ${file.name}`, 'ข้อผิดพลาด', 'error');
      setParsedRows([]);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIndices.length === parsedRows.length) {
      setSelectedRowIndices([]);
    } else {
      setSelectedRowIndices(parsedRows.map((_, i) => i));
    }
  };

  const handleToggleRow = (index: number) => {
    if (selectedRowIndices.includes(index)) {
      setSelectedRowIndices(selectedRowIndices.filter((i) => i !== index));
    } else {
      setSelectedRowIndices([...selectedRowIndices, index]);
    }
  };

  const handleConfirmImport = () => {
    if (selectedRowIndices.length === 0) {
      onShowToast('กรุณาเลือกรายการที่ต้องการนำเข้าอย่างน้อย 1 รายการ', 'แจ้งเตือน', 'info');
      return;
    }

    const itemsToImport = parsedRows.filter((_, idx) => selectedRowIndices.includes(idx));
    onImportRecords(itemsToImport);
    onShowToast(`นำเข้าข้อมูลสำเร็จ ${itemsToImport.length} รายการ เข้าสู่รอบปี ${selectedYear}`, 'นำเข้าสำเร็จ', 'success');
    setParsedRows([]);
    setFileName('');
    setSelectedRowIndices([]);
  };

  const filteredParsedRows = parsedRows.filter((row) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (row.companyName || '').toLowerCase().includes(q) ||
      (row.taxId || '').toLowerCase().includes(q) ||
      (row.sequenceNo || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 sm:p-8 gap-6 bg-[#f8f9fc] dark:bg-[#090a0f]">
      {/* Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-mono font-bold backdrop-blur-md border border-white/10">
              SCHOOLHUB DOCUMENT IMPORT HUB
            </span>
            <span className="text-xs text-indigo-200 font-medium">รอบปีบัญชี {selectedYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-headline tracking-tight">
            ระบบนำเข้าและตรวจสอบเอกสาร (Document Import & Preview)
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-2xl font-body">
            อัปโหลดไฟล์ Excel (.xlsx, .xls) หรือ CSV เพื่อตรวจสอบข้อมูลนิติบุคคลและกิจการก่อนนำเข้าสู่ฐานข้อมูลระบบหลักอย่างปลอดภัย
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 rounded-2xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
            <span>เลือกไฟล์เอกสาร (Excel / CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Drag & Drop or Table Preview */}
      {parsedRows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Upload Card */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[380px]">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[36px]">folder_open</span>
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-headline">
                ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลด
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                รองรับไฟล์ฟอร์แมต .xlsx, .xls, .csv พร้อมระบบตรวจสอบความถูกต้องอัตโนมัติ
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
            >
              อัปโหลดไฟล์ทันที
            </button>
          </div>

          {/* Right Guide Card */}
          <div className="rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-sm">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
              โครงสร้างไฟล์ที่รองรับ
            </h4>
            <div className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5">check_circle</span>
                <div>
                  <strong className="text-slate-900 dark:text-white">คอลัมน์ที่ 1:</strong> ลำดับ หรือ Sequence No
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5">check_circle</span>
                <div>
                  <strong className="text-slate-900 dark:text-white">คอลัมน์ที่ 2:</strong> เลขประจำตัวผู้เสียภาษี 13 หลัก
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5">check_circle</span>
                <div>
                  <strong className="text-slate-900 dark:text-white">คอลัมน์ที่ 3:</strong> ชื่อกิจการ / บริษัท / ห้างหุ้นส่วน
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-indigo-600 text-[18px] mt-0.5">check_circle</span>
                <div>
                  <strong className="text-slate-900 dark:text-white">คอลัมน์ที่ 4+:</strong> รหัสผ่าน, ผู้สอบบัญชี, สถานะ
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200">
              💡 <strong>คำแนะนำ:</strong> หลังจากอัปโหลดแล้ว ระบบจะแสดงตารางพรีวิวข้อมูลทั้งหมด คุณสามารถเลือกติ๊กตรวจสอบและกดยืนยันการนำเข้าได้ทันที
            </div>
          </div>
        </div>
      ) : (
        /* Document Import Preview Table */
        <div className="rounded-3xl bg-white dark:bg-[#131B2E] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">table_view</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-headline">
                    ตารางพรีวิวข้อมูลจากไฟล์: {fileName}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 font-mono">
                    เลือก {selectedRowIndices.length} / {parsedRows.length} รายการ
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ตรวจสอบความถูกต้องของข้อมูลนิติบุคคลก่อนบันทึกเข้าสู่รอบปี {selectedYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative min-w-[220px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ค้นหาในรายการพรีวิว..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setParsedRows([]);
                  setFileName('');
                  setSelectedRowIndices([]);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">file_download</span>
                <span>ยืนยันนำเข้า ({selectedRowIndices.length}) รายการ</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase font-mono tracking-wider sticky top-0 z-10 backdrop-blur-sm">
                  <th className="p-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowIndices.length === parsedRows.length && parsedRows.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-4 w-16">ลำดับ</th>
                  <th className="p-4">เลขประจำตัวผู้เสียภาษี</th>
                  <th className="p-4">ชื่อกิจการ / บริษัท</th>
                  <th className="p-4">ประเภท</th>
                  <th className="p-4">รหัสผ่าน / ข้อมูล</th>
                  <th className="p-4">ผู้สอบบัญชี</th>
                  <th className="p-4 text-center">สถานะความพร้อม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                {filteredParsedRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลในพรีวิวที่ตรงกับการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredParsedRows.map((row, idx) => {
                    const originalIndex = parsedRows.indexOf(row);
                    const isSelected = selectedRowIndices.includes(originalIndex);

                    return (
                      <tr
                        key={originalIndex}
                        onClick={() => handleToggleRow(originalIndex)}
                        className={`hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(originalIndex)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {row.sequenceNo || String(originalIndex + 1).padStart(2, '0')}
                        </td>
                        <td className="p-4 font-mono">{row.taxId || '-'}</td>
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {row.companyName || 'ไม่มีชื่อกิจการ'}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {row.type === 'company' ? 'บริษัทจำกัด' : row.type === 'partnership' ? 'หจก.' : 'บุคคล'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{row.password || '-'}</td>
                        <td className="p-4">{row.auditorDate || '-'}</td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                            พร้อมนำเข้า
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              แสดงข้อมูลทั้งหมดในไฟล์ {parsedRows.length} รายการ (เลือกแล้ว {selectedRowIndices.length} รายการ)
            </span>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20"
            >
              ยืนยันนำเข้าข้อมูลเข้าสู่ระบบ ({selectedRowIndices.length} รายการ)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
