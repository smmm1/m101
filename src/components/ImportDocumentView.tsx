import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BusinessRecord } from '../types';

interface ImportDocumentViewProps {
  selectedYear: string;
  onImportRecords: (records: Partial<BusinessRecord>[]) => void;
  onShowToast: (message: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

type ImportField = 'sequenceNo' | 'taxId' | 'companyName' | 'auditorDate' | 'password' | 'remark' | 'eFilingCode' | 'ssoCode';
const FIELD_OPTIONS: { key: ImportField; label: string; required?: boolean; aliases: string[] }[] = [
  { key: 'sequenceNo', label: 'ลำดับ', aliases: ['ลำดับ', 'ลำดับที่', 'sequence', 'seq', 'no'] },
  { key: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี', required: true, aliases: ['เลขประจำตัวผู้เสียภาษี', 'เลขผู้เสียภาษี', 'เลขประจำตัว', 'taxid', 'tax_id', 'registrationno'] },
  { key: 'companyName', label: 'ชื่อบริษัท / ห้างหุ้นส่วน', required: true, aliases: ['ชื่อบริษัท', 'ชื่อบริษัท/ห้างหุ้นส่วนจำกัด', 'ชื่อนิติบุคคล', 'ชื่อกิจการ', 'companyname', 'company_name'] },
  { key: 'auditorDate', label: 'วันที่ผู้สอบ / วันที่แจ้ง', aliases: ['วันที่ผู้สอบ', 'วันที่แจ้งผู้สอบ', 'ผู้สอบบัญชี', 'auditor', 'auditordate'] },
  { key: 'password', label: 'รหัสผ่าน / e-Filing', aliases: ['รหัสผ่าน', 'password', 'pass', 'พาสเวิร์ด'] },
  { key: 'remark', label: 'หมายเหตุ', aliases: ['หมายเหตุ', 'remark', 'remarks'] },
  { key: 'eFilingCode', label: 'รหัสยื่น e-Filing', aliases: ['รหัสยื่น e-filing', 'efiling', 'e-filing', 'efilingcode'] },
  { key: 'ssoCode', label: 'รหัสประกันสังคม', aliases: ['ประกันสังคม', 'รหัสประกันสังคม', 'sso', 'ssocode'] },
];
const LETTERS = (index: number) => {
  let n = index + 1;
  let label = '';
  while (n > 0) { const r = (n - 1) % 26; label = String.fromCharCode(65 + r) + label; n = Math.floor((n - 1) / 26); }
  return label;
};
const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[\s\-_/\\()[\].:]/g, '');
const guessHeader = (row: unknown[]) => row.filter((cell) => {
  const value = normalize(cell);
  return FIELD_OPTIONS.some((field) => field.aliases.some((alias) => normalize(alias) === value || (value.length >= 4 && (normalize(alias).includes(value) || value.includes(normalize(alias)))));
}).length >= 2;
const suggestMapping = (headers: unknown[], hasHeader: boolean): Record<ImportField, number> => {
  const result = {} as Record<ImportField, number>;
  FIELD_OPTIONS.forEach((field) => {
    result[field.key] = hasHeader ? headers.findIndex((header) => field.aliases.some((alias) => normalize(alias) === normalize(header) || (normalize(header).length >= 4 && (normalize(alias).includes(normalize(header)) || normalize(header).includes(normalize(alias))))) : -1;
  });
  return result;
};

export const ImportDocumentView: React.FC<ImportDocumentViewProps> = ({ selectedYear, onImportRecords, onShowToast }) => {
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [fileName, setFileName] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<ImportField, number>>({} as Record<ImportField, number>);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columnCount = useMemo(() => Math.max(0, ...rawRows.map((row) => row.length)), [rawRows]);
  const headers = useMemo(() => rawRows[0] || [], [rawRows]);
  const dataStartIndex = hasHeader ? 1 : 0;
  const dataRows = useMemo(() => rawRows.slice(dataStartIndex).map((row, index) => ({ row, sourceIndex: index + dataStartIndex })), [rawRows, dataStartIndex]);
  const visibleRows = useMemo(() => dataRows.filter(({ row }) => !searchFilter || row.some((cell) => String(cell ?? '').toLowerCase().includes(searchFilter.toLowerCase()))), [dataRows, searchFilter]);
  const validRowsCount = useMemo(() => dataRows.filter(({ row }) => {
    const tax = mapping.taxId >= 0 ? String(row[mapping.taxId] ?? '').trim() : '';
    const name = mapping.companyName >= 0 ? String(row[mapping.companyName] ?? '').trim() : '';
    return Boolean(tax && name);
  }).length, [dataRows, mapping]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let rows: unknown[][] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const result = await new Promise<Papa.ParseResult<unknown[]>>((resolve, reject) => Papa.parse<unknown[]>(file, { skipEmptyLines: 'greedy', complete: resolve, error: reject }));
        rows = result.data.map((row) => Array.isArray(row) ? row : [row]);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
      }
      rows = rows.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
      if (!rows.length) throw new Error('ไม่พบข้อมูลในไฟล์');
      const detectedHeader = guessHeader(rows[0]);
      setRawRows(rows);
      setFileName(file.name);
      setHasHeader(detectedHeader);
      setMapping(suggestMapping(rows[0], detectedHeader));
      setSelectedRowIndices(rows.map((_, index) => index).filter((index) => index >= (detectedHeader ? 1 : 0)));
      setSearchFilter('');
      onShowToast(`อ่านไฟล์สำเร็จ พบ ${rows.length - (detectedHeader ? 1 : 0)} แถวข้อมูล`, 'อ่านไฟล์สำเร็จ', 'success');
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'ไม่สามารถอ่านไฟล์นี้ได้', 'อ่านไฟล์ไม่สำเร็จ', 'error');
      setRawRows([]);
    } finally {
      event.target.value = '';
    }
  };

  const changeHeaderMode = (checked: boolean) => {
    setHasHeader(checked);
    setMapping(suggestMapping(rawRows[0] || [], checked));
    setSelectedRowIndices(rawRows.map((_, index) => index).filter((index) => index >= (checked ? 1 : 0)));
  };

  const toggleRow = (index: number) => setSelectedRowIndices((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  const toggleAll = () => setSelectedRowIndices((current) => current.length === dataRows.length ? [] : dataRows.map(({ sourceIndex }) => sourceIndex));

  const handleImport = () => {
    if (mapping.taxId < 0 || mapping.companyName < 0) {
      onShowToast('กรุณาเลือกคอลัมน์เลขผู้เสียภาษีและชื่อกิจการก่อนนำเข้า', 'ยังจับคู่ข้อมูลไม่ครบ', 'error');
      return;
    }
    const selected = dataRows.filter(({ sourceIndex }) => selectedRowIndices.includes(sourceIndex));
    const records: Partial<BusinessRecord>[] = selected.map(({ row }, index) => {
      const value = (field: ImportField) => mapping[field] >= 0 ? String(row[mapping[field]] ?? '').trim() : '';
      const companyName = value('companyName');
      const type: BusinessRecord['type'] = /ห้างหุ้นส่วน|หจก|หสน|partnership/i.test(companyName) ? 'partnership' : /บริษัท|บจก|co\.,?\s*ltd|company/i.test(companyName) ? 'company' : 'individual';
      return {
        sequenceNo: value('sequenceNo') || String(index + 1).padStart(2, '0'),
        taxId: value('taxId').replace(/\.0$/, ''),
        companyName,
        type,
        auditorDate: value('auditorDate'),
        password: value('password'),
        remark: value('remark'),
        eFilingCode: value('eFilingCode'),
        ssoCode: value('ssoCode'),
        status: 'pending',
        topic: `นำเข้าจากไฟล์: ${fileName}`,
        sourceType: 'excel',
        sourceFileName: fileName,
      };
    });
    const validRecords = records.filter((record) => record.taxId && record.companyName);
    if (!validRecords.length) {
      onShowToast('ไม่พบรายการที่มีทั้งเลขผู้เสียภาษีและชื่อกิจการ กรุณาตรวจสอบการจับคู่คอลัมน์', 'ไม่มีข้อมูลที่นำเข้าได้', 'error');
      return;
    }
    if (validRecords.length !== records.length) {
      onShowToast(`ข้าม ${records.length - validRecords.length} แถวที่ไม่มีเลขผู้เสียภาษีหรือชื่อกิจการ`, 'ตรวจพบแถวข้อมูลไม่ครบ', 'info');
    }
    onImportRecords(validRecords);
    setRawRows([]);
    setFileName('');
    setSelectedRowIndices([]);
    onShowToast(`ส่งข้อมูล ${validRecords.length} รายการเข้าสู่ขั้นตอนตรวจสอบและบันทึก ปี ${selectedYear}`, 'พร้อมนำเข้า', 'success');
  };

  const columnLabel = (index: number) => hasHeader && String(headers[index] ?? '').trim() ? `${LETTERS(index)} · ${String(headers[index])}` : `คอลัมน์ ${LETTERS(index)}`;

  return (
    <div className="flex-1 flex min-w-0 flex-col gap-5 overflow-y-auto bg-[#f8f9fc] p-4 dark:bg-[#090a0f] sm:p-8">
      <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:p-8">
        <div className="min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">M101 · DOCUMENT IMPORT</span>
          <h1 className="mt-2 text-xl font-extrabold sm:text-2xl">นำเข้าเอกสาร</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">เลือกเฉพาะคอลัมน์และรายการที่ต้องการนำเข้าได้ แม้ไฟล์ต้นฉบับไม่มีหัวตาราง</p>
        </div>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-900 shadow-lg hover:bg-indigo-50">
          <span className="material-symbols-outlined">upload_file</span>{rawRows.length ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์ Excel / CSV'}
        </button>
      </section>

      {!rawRows.length ? (
        <section className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-[#131B2E]">
          <span className="material-symbols-outlined text-5xl text-indigo-500">table_view</span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">อัปโหลดไฟล์เพื่อเริ่มเลือกคอลัมน์</h2>
          <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">ระบบจะอ่านข้อมูลดิบจากไฟล์ แล้วให้คุณกำหนดว่าคอลัมน์ใดจะลงในช่องไหนของฟอร์มเพิ่มกิจการ โดยไม่บังคับให้ไฟล์ต้องมีหัวตาราง</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700">อัปโหลดไฟล์</button>
        </section>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#131B2E] sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0"><h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{fileName}</h2><p className="mt-1 text-xs text-slate-500">{dataRows.length} แถวข้อมูล · {columnCount} คอลัมน์ · รอบปี {selectedYear}</p></div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><input type="checkbox" checked={hasHeader} onChange={(event) => changeHeaderMode(event.target.checked)} className="h-4 w-4 rounded accent-indigo-600" /> แถวแรกเป็นหัวตาราง</label>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-900 dark:text-white">จับคู่คอลัมน์กับฟอร์มเพิ่มกิจการ</h3><span className="text-xs text-slate-500">เลือก “ไม่ใช้” เพื่อข้ามคอลัมน์</span></div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FIELD_OPTIONS.map((field) => (
                <label key={field.key} className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</span>
                  <select value={mapping[field.key] ?? -1} onChange={(event) => setMapping((current) => ({ ...current, [field.key]: Number(event.target.value) }))} className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    <option value={-1}>ไม่ใช้คอลัมน์นี้</option>
                    {Array.from({ length: columnCount }, (_, index) => <option key={index} value={index}>{columnLabel(index)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className={mapping.taxId >= 0 && mapping.companyName >= 0 ? 'rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700'}>{mapping.taxId >= 0 && mapping.companyName >= 0 ? 'จับคู่ช่องจำเป็นแล้ว' : 'ต้องเลือกเลขผู้เสียภาษีและชื่อกิจการ'}</span>
              <span className="text-slate-500">พบ {validRowsCount} แถวที่มีข้อมูลจำเป็นครบ</span>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131B2E]">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:p-5">
              <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">เลือกแถวที่จะนำเข้า</h3><p className="mt-1 text-xs text-slate-500">เลือกเฉพาะรายการที่ต้องการ หรือเลือกทั้งหมด</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={searchFilter} onChange={(event) => setSearchFilter(event.target.value)} placeholder="ค้นหาข้อมูลในไฟล์..." className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                <button type="button" onClick={toggleAll} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-slate-700 dark:text-white">เลือก / ไม่เลือกทั้งหมด</button>
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr><th className="p-3"><input type="checkbox" checked={selectedRowIndices.length === dataRows.length && dataRows.length > 0} onChange={toggleAll} /></th><th className="whitespace-nowrap p-3">แถว</th>{Array.from({ length: columnCount }, (_, index) => <th key={index} className="min-w-36 whitespace-nowrap p-3">{columnLabel(index)}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.slice(0, 150).map(({ row, sourceIndex }) => <tr key={sourceIndex} onClick={() => toggleRow(sourceIndex)} className={selectedRowIndices.includes(sourceIndex) ? 'cursor-pointer bg-indigo-50/60 dark:bg-indigo-950/30' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'}><td className="p-3"><input type="checkbox" checked={selectedRowIndices.includes(sourceIndex)} onChange={() => toggleRow(sourceIndex)} onClick={(event) => event.stopPropagation()} /></td><td className="p-3 font-mono text-slate-400">{sourceIndex + 1}</td>{Array.from({ length: columnCount }, (_, index) => <td key={index} className="max-w-64 truncate whitespace-nowrap p-3 text-slate-700 dark:text-slate-200">{String(row[index] ?? '')}</td>)}</tr>)}
                </tbody>
              </table>
              {visibleRows.length > 150 && <p className="p-3 text-center text-xs text-slate-500">แสดงตัวอย่าง 150 จาก {visibleRows.length} แถว แต่ระบบจะนำเข้าตามรายการที่เลือกทั้งหมด</p>}
            </div>
            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40 sm:flex-row sm:items-center">
              <span className="text-xs text-slate-500">เลือก {selectedRowIndices.length} / {dataRows.length} แถว · จะนำเข้าได้จริง {validRowsCount} แถวก่อนคัดตามรายการที่เลือก</span>
              <div className="flex gap-2"><button type="button" onClick={() => { setRawRows([]); setFileName(''); setSelectedRowIndices([]); }} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">ยกเลิก</button><button type="button" onClick={handleImport} disabled={!selectedRowIndices.length || mapping.taxId < 0 || mapping.companyName < 0} className="min-h-10 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">นำเข้า {selectedRowIndices.length} รายการ</button></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
