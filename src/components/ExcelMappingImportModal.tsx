import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { BusinessRecord } from '../types';

type ImportField = 'sequenceNo' | 'taxId' | 'companyName' | 'type' | 'auditorDate' | 'password' | 'remark' | 'eFilingCode' | 'ssoCode';

interface TableRegion {
  id: string;
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  rows: string[][];
  headerIndex: number;
}

interface Props {
  isOpen: boolean;
  selectedYear: string;
  onClose: () => void;
  onImportRecords: (records: Partial<BusinessRecord>[]) => void;
  onShowToast: (message: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

const FIELD_OPTIONS: Array<{ value: ImportField; label: string }> = [
  { value: 'sequenceNo', label: 'ลำดับ' },
  { value: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี' },
  { value: 'companyName', label: 'ชื่อกิจการ' },
  { value: 'type', label: 'ประเภทกิจการ' },
  { value: 'auditorDate', label: 'ผู้สอบบัญชี / วันที่แจ้ง' },
  { value: 'password', label: 'รหัสผ่าน' },
  { value: 'remark', label: 'หมายเหตุ' },
  { value: 'eFilingCode', label: 'รหัส E-Filing' },
  { value: 'ssoCode', label: 'รหัสประกันสังคม' },
];

const clean = (value: unknown) => String(value ?? '').trim();
const normalize = (value: unknown) => clean(value).toLowerCase().replace(/[\s\u00a0\-_/.\\()[\]]/g, '');

function guessField(header: string): ImportField | '' {
  const h = normalize(header);
  if (!h) return '';
  if (['ลำดับ', 'ลำดับที่', 'seq', 'sequence', 'no', 'sequenceno'].some((v) => h === normalize(v))) return 'sequenceNo';
  if (['เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษี', 'taxid', 'tax_id', 'registrationno', 'เลขทะเบียน'].some((v) => h.includes(normalize(v)))) return 'taxId';
  if (['ชื่อบริษัท', 'ชื่อกิจการ', 'ชื่อนิติบุคคล', 'companyname', 'ชื่อ'].some((v) => h.includes(normalize(v)))) return 'companyName';
  if (['ประเภท', 'ประเภทธุรกิจ', 'type'].some((v) => h === normalize(v))) return 'type';
  if (['ผู้สอบบัญชี', 'วันที่แจ้งผู้สอบ', 'auditor', 'auditordate'].some((v) => h.includes(normalize(v)))) return 'auditorDate';
  if (['password', 'รหัสผ่าน', 'พาสเวิร์ด'].some((v) => h.includes(normalize(v)))) return 'password';
  if (['หมายเหตุ', 'remark', 'remarks'].some((v) => h.includes(normalize(v)))) return 'remark';
  if (['efiling', 'รหัสยื่น'].some((v) => h.includes(normalize(v)))) return 'eFilingCode';
  if (['ประกันสังคม', 'sso', 'รหัสสปส'].some((v) => h.includes(normalize(v)))) return 'ssoCode';
  return '';
}

function detectRegions(matrix: unknown[][]): TableRegion[] {
  const rows = matrix.map((row) => Array.isArray(row) ? row.map(clean) : []);
  const bands: Array<{ start: number; end: number }> = [];
  let bandStart = -1;
  rows.forEach((row, index) => {
    const hasValue = row.some((cell) => cell !== '');
    if (hasValue && bandStart < 0) bandStart = index;
    if (!hasValue && bandStart >= 0) {
      bands.push({ start: bandStart, end: index - 1 });
      bandStart = -1;
    }
  });
  if (bandStart >= 0) bands.push({ start: bandStart, end: rows.length - 1 });

  const regions: TableRegion[] = [];
  bands.forEach((band) => {
    const maxCol = Math.max(0, ...rows.slice(band.start, band.end + 1).map((row) => row.length - 1));
    const occupied = Array.from({ length: maxCol + 1 }, (_, col) =>
      rows.slice(band.start, band.end + 1).some((row) => clean(row[col]) !== '')
    );
    const colGroups: Array<{ start: number; end: number }> = [];
    let start = -1;
    occupied.forEach((used, col) => {
      if (used && start < 0) start = col;
      if (!used && start >= 0) {
        colGroups.push({ start, end: col - 1 });
        start = -1;
      }
    });
    if (start >= 0) colGroups.push({ start, end: occupied.length - 1 });

    colGroups.forEach((cols) => {
      const tableRows = rows.slice(band.start, band.end + 1).map((row) =>
        row.slice(cols.start, cols.end + 1)
      );
      if (tableRows.filter((row) => row.some(Boolean)).length < 2) return;
      const headerIndex = tableRows.slice(0, Math.min(12, tableRows.length)).reduce((best, row, index, all) => {
        const score = row.filter(Boolean).length + row.filter((cell) => guessField(cell)).length * 2;
        const bestScore = all[best].filter(Boolean).length + all[best].filter((cell) => guessField(cell)).length * 2;
        return score > bestScore ? index : best;
      }, 0);
      regions.push({
        id: `table-${regions.length + 1}`,
        startRow: band.start,
        endRow: band.end,
        startCol: cols.start,
        endCol: cols.end,
        rows: tableRows,
        headerIndex,
      });
    });
  });
  return regions;
}

export const ExcelMappingImportModal: React.FC<Props> = ({
  isOpen, selectedYear, onClose, onImportRecords, onShowToast,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [regions, setRegions] = useState<TableRegion[]>([]);
  const [regionId, setRegionId] = useState('');
  const [mapping, setMapping] = useState<Record<number, ImportField | ''>>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [step, setStep] = useState<'sheet' | 'mapping'>('sheet');

  const selectedRegion = regions.find((region) => region.id === regionId) ?? null;
  const headers = selectedRegion?.rows[selectedRegion.headerIndex] ?? [];
  const dataRows = selectedRegion ? selectedRegion.rows.slice(selectedRegion.headerIndex + 1).filter((row) => row.some(Boolean)) : [];

  const reset = () => {
    setFileName('');
    setWorkbook(null);
    setSheetName('');
    setRegions([]);
    setRegionId('');
    setMapping({});
    setSelectedRows([]);
    setStep('sheet');
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => { reset(); onClose(); };

  const loadSheet = (book: XLSX.WorkBook, name: string) => {
    const sheet = book.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
    const found = detectRegions(matrix);
    setSheetName(name);
    setRegions(found);
    setRegionId(found.length === 1 ? found[0].id : '');
    setMapping({});
    setSelectedRows([]);
    setStep('sheet');
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: 'array', cellDates: false });
      if (!book.SheetNames.length) throw new Error('ไม่พบ Sheet ในไฟล์');
      setFileName(file.name);
      setWorkbook(book);
      loadSheet(book, book.SheetNames[0]);
      onShowToast(`อ่านไฟล์ ${file.name} แล้ว กรุณาเลือก Sheet ที่ต้องการ`, 'อ่านไฟล์สำเร็จ', 'success');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'อ่านไฟล์ไม่สำเร็จ', 'นำเข้า Excel ใหม่', 'error');
    } finally {
      event.target.value = '';
    }
  };

  const beginMapping = () => {
    if (!selectedRegion) {
      onShowToast('กรุณาเลือกตารางที่ต้องการนำเข้า', 'ยังไม่ได้เลือกตาราง', 'info');
      return;
    }
    const next: Record<number, ImportField | ''> = {};
    const used = new Set<ImportField>();
    headers.forEach((header, index) => {
      const guessed = guessField(header);
      next[index] = guessed && !used.has(guessed) ? guessed : '';
      if (next[index]) used.add(next[index] as ImportField);
    });
    setMapping(next);
    const companyColumn = Object.entries(next).find(([, field]) => field === 'companyName')?.[0];
    setSelectedRows(companyColumn === undefined
      ? []
      : dataRows.map((row, index) => ({ row, index })).filter(({ row }) => clean(row[Number(companyColumn)]) !== '').map(({ index }) => index));
    setStep('mapping');
  };

  const preview = useMemo(() => dataRows, [dataRows]);
  const mappedFields = Object.values(mapping).filter(Boolean);
  const hasCompanyName = mappedFields.includes('companyName');

  const toggleAll = () => {
    setSelectedRows((current) => current.length === dataRows.length ? [] : dataRows.map((_, index) => index));
  };

  const confirmImport = () => {
    if (!selectedRegion || !hasCompanyName) {
      onShowToast('กรุณาจับคู่คอลัมน์ชื่อกิจการก่อนนำเข้า', 'ข้อมูลยังไม่ครบ', 'error');
      return;
    }
    if (!selectedRows.length) {
      onShowToast('กรุณาเลือกรายการอย่างน้อย 1 แถว', 'ยังไม่ได้เลือกรายการ', 'info');
      return;
    }
    const now = new Date().toISOString();
    const rowsWithNames = selectedRows.filter((rowIndex) => {
      const companyColumn = Object.entries(mapping).find(([, field]) => field === 'companyName')?.[0];
      return companyColumn !== undefined && clean(dataRows[rowIndex]?.[Number(companyColumn)]) !== '';
    });
    if (rowsWithNames.length !== selectedRows.length) {
      onShowToast('มีแถวที่ไม่มีชื่อกิจการ ระบบจะข้ามแถวเหล่านั้น', 'ตรวจสอบข้อมูล', 'info');
    }
    const output: Partial<BusinessRecord>[] = rowsWithNames.map((rowIndex, index) => {
      const source = dataRows[rowIndex] ?? [];
      const record: Partial<BusinessRecord> = {
        sequenceNo: '',
        taxId: '',
        companyName: '',
        type: 'company',
        auditorDate: '',
        password: '',
        remark: '',
        eFilingCode: '',
        ssoCode: '',
        status: 'pending',
        isVerifiedDbd: false,
        topic: `นำเข้าจาก ${fileName} · Sheet ${sheetName}`,
        sourceType: 'excel',
        sourceFileName: fileName,
        createdAt: now,
        updatedAt: now,
      };
      Object.entries(mapping).forEach(([column, field]) => {
        if (field) (record as Record<string, unknown>)[field] = clean(source[Number(column)]);
      });
      const company = clean(record.companyName);
      if (company.includes('ห้างหุ้นส่วน') || company.includes('หจก') || /partnership/i.test(company)) record.type = 'partnership';
      else if (company.includes('บริษัท') || company.includes('บจก') || /company|co\.,?ltd/i.test(company)) record.type = 'company';
      else if (company) record.type = 'individual';
      return record;
    });
    onImportRecords(output);
    onShowToast(`นำเข้าข้อมูล ${output.length} รายการ จาก ${sheetName} สำเร็จ`, 'นำเข้าสำเร็จ', 'success');
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="excel-mapping-title">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#111827] flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="excel-mapping-title" className="text-base font-extrabold text-slate-900 dark:text-white">นำเข้า Excel ใหม่</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">เลือก Sheet และจับคู่คอลัมน์ก่อนบันทึก · ปีบัญชี {selectedYear}</p>
          </div>
          <button type="button" onClick={close} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">ปิด</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!workbook ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <span className="material-symbols-outlined text-4xl text-amber-500">upload_file</span>
              <div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">เลือกไฟล์ Excel หรือ CSV</p><p className="mt-1 text-xs text-slate-500">รองรับ .xlsx, .xls และ .csv · ไฟล์เดิมไม่ถูกแก้ไข</p></div>
              <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-900">เลือกไฟล์</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="min-w-0"><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{fileName}</p><p className="text-[11px] text-slate-500">{workbook.SheetNames.length} Sheet · เลือก Sheet ที่ต้องการเองได้</p></div>
                <button type="button" onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">เปลี่ยนไฟล์</button>
              </div>
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <section className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">1. เลือก Sheet</h3>
                  <div className="space-y-1 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    {workbook.SheetNames.map((name) => (
                      <button key={name} type="button" onClick={() => loadSheet(workbook, name)} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${sheetName === name ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                        <span className="material-symbols-outlined mr-2 align-middle text-[15px]">table_view</span>{name}
                      </button>
                    ))}
                  </div>
                </section>
                <section className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">2. เลือกตารางใน Sheet นี้</h3><span className="text-[11px] text-slate-500">พบ {regions.length} ตาราง</span></div>
                  {regions.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">ไม่พบตารางข้อมูลที่มีอย่างน้อย 2 แถวใน Sheet นี้</p> : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {regions.map((region, index) => (
                        <button key={region.id} type="button" onClick={() => setRegionId(region.id)} className={`rounded-xl border p-3 text-left transition ${regionId === region.id ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/30' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}>
                          <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-800 dark:text-slate-100">ตาราง {index + 1}</span>{regionId === region.id && <span className="material-symbols-outlined text-[17px] text-amber-600">check_circle</span>}</div>
                          <p className="mt-1 text-[11px] text-slate-500">แถว {region.startRow + 1}–{region.endRow + 1} · คอลัมน์ {region.startCol + 1}–{region.endCol + 1} · {region.rows.length} แถว</p>
                          <p className="mt-2 truncate text-[11px] text-slate-600 dark:text-slate-300">{region.rows[region.headerIndex]?.filter(Boolean).join(' · ')}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedRegion && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full min-w-[420px] text-left text-[11px]">
                        <tbody>{selectedRegion.rows.slice(0, 4).map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0 dark:border-slate-800">{row.map((cell, col) => <td key={col} className="max-w-[180px] truncate px-3 py-2 text-slate-600 dark:text-slate-300">{cell || '—'}</td>)}</tr>)}</tbody>
                      </table>
                    </div>
                  )}
                  <div className="flex justify-end"><button type="button" disabled={!selectedRegion} onClick={beginMapping} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-500 dark:text-slate-900">เลือกตารางนี้และจับคู่คอลัมน์</button></div>
                </section>
              </div>

              {step === 'mapping' && selectedRegion && (
                <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">3. จับคู่คอลัมน์กับข้อมูล M101</h3><span className="text-[11px] text-slate-500">เลือก “ไม่ใช้” สำหรับคอลัมน์ที่ไม่ต้องการ</span></div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {headers.map((header, index) => (
                      <label key={index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <span className="block truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300">{header || `คอลัมน์ ${index + 1}`}</span>
                        <select value={mapping[index] ?? ''} onChange={(event) => {
                          const nextField = event.target.value as ImportField | '';
                          setMapping((current) => ({ ...current, [index]: nextField }));
                          if (nextField === 'companyName') {
                            setSelectedRows(dataRows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => clean(row[index]) !== '').map(({ rowIndex }) => rowIndex));
                          }
                        }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                          <option value="">ไม่ใช้คอลัมน์นี้</option>
                          {FIELD_OPTIONS.map((field) => <option key={field.value} value={field.value} disabled={field.value !== mapping[index] && Object.entries(mapping).some(([column, value]) => Number(column) !== index && value === field.value)}>{field.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] text-slate-500">แสดงข้อมูลทั้งหมด {preview.length} แถว · ต้องจับคู่ “ชื่อกิจการ” ก่อนนำเข้า</p><button type="button" onClick={toggleAll} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{selectedRows.length === dataRows.length ? 'ไม่เลือกทั้งหมด' : 'เลือกทั้งหมด'}</button></div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full min-w-[600px] text-left text-[11px]">
                      <thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-3 py-2">นำเข้า</th>{headers.map((header, index) => <th key={index} className="px-3 py-2 font-semibold text-slate-500">{header || `คอลัมน์ ${index + 1}`}</th>)}</tr></thead>
                      <tbody>{preview.map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2"><input type="checkbox" checked={selectedRows.includes(index)} onChange={() => setSelectedRows((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /></td>{headers.map((_, col) => <td key={col} className="max-w-[220px] truncate px-3 py-2 text-slate-600 dark:text-slate-300">{row[col] || '—'}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-[11px] text-slate-500">{step === 'mapping' ? `เลือกนำเข้า ${selectedRows.length} / ${dataRows.length} รายการ` : 'ข้อมูลเดิมจะไม่ถูกแก้ไขจนกว่าจะกดยืนยันนำเข้า'}</p>
          <div className="flex items-center gap-2"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">ยกเลิก</button>{step === 'mapping' && <button type="button" onClick={confirmImport} disabled={!hasCompanyName || selectedRows.length === 0} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-500 dark:text-slate-900">ยืนยันนำเข้า ({selectedRows.length})</button>}</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
    </div>
  );
};
