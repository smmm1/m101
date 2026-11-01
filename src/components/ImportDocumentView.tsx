import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BusinessRecord } from '../types';

interface ImportDocumentViewProps {
  selectedYear: string;
  onClose?: () => void;
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
const matchesAlias = (value: unknown, alias: string) => {
  const normalizedValue = normalize(value);
  const normalizedAlias = normalize(alias);
  return normalizedAlias === normalizedValue || (
    normalizedValue.length >= 4 &&
    (normalizedAlias.includes(normalizedValue) || normalizedValue.includes(normalizedAlias))
  );
};
const guessHeader = (row: unknown[]) =>
  row.filter((cell) => FIELD_OPTIONS.some((field) =>
    field.aliases.some((alias) => matchesAlias(cell, alias))
  )).length >= 2;
const suggestMapping = (headers: unknown[], hasHeader: boolean): Record<ImportField, number> => {
  const result = {} as Record<ImportField, number>;
  FIELD_OPTIONS.forEach((field) => {
    result[field.key] = hasHeader
      ? headers.findIndex((header) => field.aliases.some((alias) => matchesAlias(header, alias)))
      : -1;
  });
  return result;
};

export const ImportDocumentView: React.FC<ImportDocumentViewProps> = ({ selectedYear, onClose, onImportRecords, onShowToast }) => {
  const [rawRows, setRawRows] = useState<unknown[][]>([]);
  const [fileName, setFileName] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Record<ImportField, number>>({} as Record<ImportField, number>);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
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
  const selectedValidRowsCount = useMemo(() => dataRows.filter(({ row, sourceIndex }) => {
    if (!selectedRowIndices.includes(sourceIndex)) return false;
    const tax = mapping.taxId >= 0 ? String(row[mapping.taxId] ?? '').trim() : '';
    const name = mapping.companyName >= 0 ? String(row[mapping.companyName] ?? '').trim() : '';
    return Boolean(tax && name);
  }).length, [dataRows, mapping, selectedRowIndices]);

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
      setSelectedColumnIndex(0);
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
  const assignSelectedColumn = (fieldKey: string) => {
    setMapping((current) => {
      const next = { ...current };
      (Object.keys(next) as ImportField[]).forEach((key) => { if (next[key] === selectedColumnIndex) next[key] = -1; });
      if (fieldKey) next[fieldKey as ImportField] = selectedColumnIndex;
      return next;
    });
  };
  const selectedColumnField = (Object.keys(mapping) as ImportField[]).find((key) => mapping[key] === selectedColumnIndex) || '';
  const toggleAll = () => setSelectedRowIndices((current) => {
    const visibleIndices = visibleRows.map(({ sourceIndex }) => sourceIndex);
    const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every((index) => current.includes(index));
    return allVisibleSelected ? current.filter((index) => !visibleIndices.includes(index)) : Array.from(new Set([...current, ...visibleIndices]));
  });
  const resetImport = () => {
    setRawRows([]);
    setFileName('');
    setSelectedRowIndices([]);
    setSearchFilter('');
    setMapping({} as Record<ImportField, number>);
    setSelectedColumnIndex(0);
    onClose?.();
  };

  const handleImport = () => {
    if (mapping.taxId < 0 || mapping.companyName < 0) {
      onShowToast('กรุณาเลือกคอลัมน์เลขผู้เสียภาษีและชื่อกิจการก่อนนำเข้า', 'ยังจับคู่ข้อมูลไม่ครบ', 'error');
      return;
    }
    if (!selectedRowIndices.length) {
      onShowToast('กรุณาเลือกแถวข้อมูลอย่างน้อย 1 แถว', 'ยังไม่ได้เลือกรายการ', 'info');
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
    try {
      onImportRecords(validRecords);
      onShowToast(`ส่งข้อมูล ${validRecords.length} รายการเข้าสู่ขั้นตอนตรวจสอบ ปี ${selectedYear}`, 'ส่งข้อมูลเรียบร้อย', 'success');
      setRawRows([]);
      setFileName('');
      setSelectedRowIndices([]);
      setSearchFilter('');
      onClose?.();
    } catch (error) {
      onShowToast(error instanceof Error ? error.message : 'ระบบไม่สามารถส่งข้อมูลเข้าสู่รายการได้ กรุณาลองอีกครั้ง', 'นำเข้าไม่สำเร็จ', 'error');
    }
  };

  const columnLabel = (index: number) => hasHeader && String(headers[index] ?? '').trim() ? `${LETTERS(index)} · ${String(headers[index])}` : `คอลัมน์ ${LETTERS(index)}`;

  return (
    <div className="flex min-h-0 flex-1 min-w-0 flex-col gap-4 overflow-y-auto bg-[#f8f9fc] p-3 dark:bg-[#090a0f] sm:gap-5 sm:p-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 p-5 text-white shadow-xl sm:flex-row sm:items-center sm:p-6">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">M101 · DOCUMENT IMPORT</span>
          <h1 className="mt-2 text-xl font-extrabold sm:text-2xl">นำเข้าเอกสาร</h1>
          <p className="mt-2 max-w-2xl text-sm text-indigo-100">เลือกคอลัมน์และแถวที่จะนำเข้าได้เอง แม้ไฟล์ต้นฉบับไม่มีหัวตาราง</p>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างนำเข้า" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20"><span className="material-symbols-outlined">close</span></button>}
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
          <section className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-[#131B2E]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#f3f5f8] px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
              <div className="min-w-0"><div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><span className="material-symbols-outlined text-emerald-700">table_view</span> ตัวอย่างเวิร์กชีต</div><p className="mt-1 truncate text-xs text-slate-500">{fileName} · {dataRows.length} แถวข้อมูล · {columnCount} คอลัมน์ · รอบปี {selectedYear}</p></div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"><input type="checkbox" checked={hasHeader} onChange={(event) => changeHeaderMode(event.target.checked)} className="h-4 w-4 rounded accent-emerald-600" /> แถวแรกเป็นหัวตาราง</label>
            </div>
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#131B2E] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2"><span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-800">fx</span><span className="shrink-0 text-xs font-semibold text-slate-500">คอลัมน์ {LETTERS(selectedColumnIndex)}</span><span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{String(headers[selectedColumnIndex] ?? '') || '(ไม่มีชื่อหัวตาราง)'}</span></div>
              <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setMapping(suggestMapping(headers, hasHeader))} className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200">จับคู่อัตโนมัติ</button><label className="text-xs font-semibold text-slate-600 dark:text-slate-300" htmlFor="m101-column-mapping">กำหนดคอลัมน์นี้เป็น</label><select id="m101-column-mapping" value={selectedColumnField} onChange={(event) => assignSelectedColumn(event.target.value)} className="min-h-9 min-w-52 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-900 outline-none dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"><option value="">ไม่ใช้คอลัมน์นี้</option>{FIELD_OPTIONS.map((field) => { const used = mapping[field.key] >= 0 && mapping[field.key] !== selectedColumnIndex; return <option key={field.key} value={field.key} disabled={used}>{field.label}{field.required ? ' *' : ''}{used ? ' (เลือกแล้ว)' : ''}</option>; })}</select><span className={mapping.taxId >= 0 && mapping.companyName >= 0 ? 'rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700' : 'rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700'}>{mapping.taxId >= 0 && mapping.companyName >= 0 ? 'จับคู่ช่องจำเป็นครบ' : 'ต้องเลือกเลขผู้เสียภาษี + ชื่อกิจการ'}</span></div>
            </div>
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/50"><p className="text-[11px] text-slate-500">คลิกหัวคอลัมน์ A, B, C… เพื่อเลือกคอลัมน์ แล้วกำหนดว่าจะนำข้อมูลไปใส่ช่องใดของ M101 · คอลัมน์ที่จับคู่แล้วจะแสดงชื่อช่องสีเขียว</p></div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#131B2E]">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:p-5">
              <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">เลือกแถวที่จะนำเข้า</h3><p className="mt-1 text-xs text-slate-500">เลือกเฉพาะรายการที่ต้องการ หรือเลือกทั้งหมด</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <input value={searchFilter} onChange={(event) => setSearchFilter(event.target.value)} placeholder="ค้นหาข้อมูลในไฟล์..." className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                <button type="button" onClick={toggleAll} className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-slate-700 dark:text-white">เลือก / ไม่เลือกที่เห็น</button>
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr><th className="p-3"><input type="checkbox" checked={visibleRows.length > 0 && visibleRows.every(({ sourceIndex }) => selectedRowIndices.includes(sourceIndex))} onChange={toggleAll} /></th><th className="whitespace-nowrap p-3">แถว</th>{Array.from({ length: columnCount }, (_, index) => <th key={index} className="min-w-40 whitespace-nowrap border-l border-slate-200 p-0 dark:border-slate-700"><button type="button" onClick={() => setSelectedColumnIndex(index)} className={selectedColumnIndex === index ? "flex min-h-14 w-full flex-col items-start gap-1 bg-emerald-100 px-3 py-2 text-left ring-2 ring-inset ring-emerald-600 dark:bg-emerald-950" : "flex min-h-14 w-full flex-col items-start gap-1 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"}><span className="font-mono text-[10px] font-bold text-slate-400">{LETTERS(index)}</span><span className="max-w-48 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{columnLabel(index)}</span><span className="max-w-48 truncate text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{(Object.keys(mapping) as ImportField[]).find((key) => mapping[key] === index) ? FIELD_OPTIONS.find((field) => field.key === (Object.keys(mapping) as ImportField[]).find((key) => mapping[key] === index))?.label : "คลิกเพื่อเลือก"}</span></button></th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.slice(0, 150).map(({ row, sourceIndex }) => <tr key={sourceIndex} onClick={() => toggleRow(sourceIndex)} className={selectedRowIndices.includes(sourceIndex) ? 'cursor-pointer bg-indigo-50/60 dark:bg-indigo-950/30' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'}><td className="p-3"><input type="checkbox" checked={selectedRowIndices.includes(sourceIndex)} onChange={() => toggleRow(sourceIndex)} onClick={(event) => event.stopPropagation()} /></td><td className="p-3 font-mono text-slate-400">{sourceIndex + 1}</td>{Array.from({ length: columnCount }, (_, index) => <td key={index} className="max-w-64 truncate whitespace-nowrap p-3 text-slate-700 dark:text-slate-200">{String(row[index] ?? '')}</td>)}</tr>)}
                </tbody>
              </table>
              {visibleRows.length > 150 && <p className="p-3 text-center text-xs text-slate-500">แสดงตัวอย่าง 150 จาก {visibleRows.length} แถว แต่ระบบจะนำเข้าตามรายการที่เลือกทั้งหมด</p>}
            </div>
            <div className="sticky bottom-0 z-20 flex flex-col justify-between gap-3 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-700 dark:bg-slate-950/95 sm:flex-row sm:items-center">
              <div className="min-w-0"><p className="text-sm font-bold text-slate-800 dark:text-white">พร้อมนำเข้า ${selectedValidRowsCount} รายการ</p><p className="mt-1 text-[11px] text-slate-500">เลือกไว้ ${selectedRowIndices.length} จาก ${dataRows.length} แถว${selectedRowIndices.length > selectedValidRowsCount ? ` · ข้าม ${selectedRowIndices.length - selectedValidRowsCount} แถวที่ข้อมูลจำเป็นไม่ครบ` : ''}${mapping.taxId < 0 || mapping.companyName < 0 ? ' · กรุณาจับคู่เลขผู้เสียภาษีและชื่อกิจการก่อน' : ''}</p></div>
              <div className="flex shrink-0 gap-2"><button type="button" onClick={resetImport} className="min-h-11 flex-1 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 sm:flex-none">ยกเลิก</button><button type="button" onClick={handleImport} disabled={selectedValidRowsCount === 0 || mapping.taxId < 0 || mapping.companyName < 0} className="min-h-11 flex-1 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700 sm:flex-none">ยืนยันนำเข้า ${selectedValidRowsCount} รายการ</button></div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
