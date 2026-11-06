import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { BusinessRecord } from '../types';
import { DSButton, DSSelect } from '../design-system/components';

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
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<number, ImportField | ''>>({});
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [step, setStep] = useState<'sheet' | 'mapping'>('sheet');

  const selectedRegion = regions.find((region) => region.id === regionId) ?? null;
  const headers = selectedRegion?.rows[headerRowIndex] ?? [];
  const dataRows = selectedRegion ? selectedRegion.rows.slice(headerRowIndex + 1).filter((row) => row.some(Boolean)) : [];

  const reset = () => {
    setFileName('');
    setWorkbook(null);
    setSheetName('');
    setRegions([]);
    setRegionId('');
    setHeaderRowIndex(0);
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
    setHeaderRowIndex(found.length === 1 ? found[0].headerIndex : 0);
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
    if (rowsWithNames.length === 0) {
      onShowToast('ไม่พบแถวที่มีชื่อกิจการในรายการที่เลือก', 'ไม่มีข้อมูลให้นำเข้า', 'error');
      return;
    }
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
    <div className="m101-dialog-overlay m101-import-dialog fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="excel-mapping-title">
      <div className="m101-dialog-panel m101-import-dialog-panel w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-300 dark:bg-white flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="excel-mapping-title" className="text-base font-extrabold text-slate-900 dark:text-white">จับคู่คอลัมน์</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">นำเข้าข้อมูลจาก Excel/CSV อย่างเป็นขั้นตอน · ปีบัญชี {selectedYear}</p>
          </div>
          <DSButton type="button" onClick={close} variant="ghost">ปิด</DSButton>
        </div>

        <div className="m101-import-stepper" aria-label="ขั้นตอนนำเข้า">
          <div className={workbook ? 'is-done' : 'is-current'}><span>1</span><b>เลือกไฟล์</b></div>
          <i />
          <div className={workbook ? (step === 'sheet' ? 'is-current' : 'is-done') : ''}><span>2</span><b>เลือก Sheet / ตาราง</b></div>
          <i />
          <div className={step === 'mapping' ? 'is-current' : ''}><span>3</span><b>จับคู่และตรวจสอบ</b></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!workbook ? (
            <div className="mx-auto flex min-h-[320px] max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><span className="material-symbols-outlined text-4xl">upload_file</span></div>
              <div><h3 className="text-base font-bold text-slate-900 dark:text-white">เลือกไฟล์ที่ต้องการนำเข้า</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">เลือกไฟล์จากอุปกรณ์ของคุณ</p><p className="mt-2 text-xs text-slate-400">รองรับ Excel และ CSV · .xlsx, .xls, .csv</p></div>
              <DSButton type="button" onClick={() => inputRef.current?.click()} variant="primary">เลือกไฟล์</DSButton>
              <p className="text-xs text-slate-500">ไฟล์ต้นฉบับจะไม่ถูกแก้ไข</p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="flex min-w-0 items-center gap-3"><span className="material-symbols-outlined text-2xl text-slate-700">description</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{fileName}</p><p className="text-xs text-slate-500">{workbook.SheetNames.length} Sheet ในไฟล์นี้</p></div></div>
                <DSButton type="button" onClick={reset} variant="secondary">เปลี่ยนไฟล์</DSButton>
              </div>
              <div className="mb-6 grid grid-cols-3 gap-2">
                {['เลือกไฟล์', 'เลือก Sheet / ตาราง', 'จับคู่คอลัมน์'].map((label, index) => {
                  const active = (step === 'sheet' && index === 1) || (step === 'mapping' && index === 2);
                  const complete = index === 0 || (step === 'mapping' && index === 1);
                  return <div key={label} className="min-w-0"><div className={`mb-2 h-1.5 rounded-full ${active || complete ? 'bg-zinc-900' : 'bg-slate-200 dark:bg-slate-700'}`} /><p className={`truncate text-[10px] font-semibold sm:text-xs ${active ? 'text-slate-700' : 'text-slate-500'}`}>{index + 1}. {label}</p></div>;
                })}
              </div>

              {step === 'sheet' ? (
                <div className="space-y-5">
                  <section className="space-y-2">
                    <div><h3 className="text-sm font-bold text-slate-900 dark:text-white">เลือก Sheet ที่ต้องการ</h3><p className="text-xs text-slate-500">ไฟล์นี้มี {workbook.SheetNames.length} Sheet · เลือก Sheet ที่มีข้อมูลของคุณ</p></div>
                    <div className="flex flex-wrap gap-2">{workbook.SheetNames.map((name) => <DSButton key={name} type="button" onClick={() => loadSheet(workbook, name)} variant={sheetName === name ? 'primary' : 'secondary'} className="ds-button--sheet"><span className="material-symbols-outlined mr-1 align-middle text-sm">table_view</span>{name}</DSButton>)}</div>
                  </section>
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900 dark:text-white">เลือกตารางข้อมูล</h3><p className="text-xs text-slate-500">ระบบตรวจหาตารางใน Sheet ให้แล้ว คุณเลือกตารางที่ต้องการได้</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">พบ {regions.length} ตาราง</span></div>
                    {regions.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">ไม่พบตารางข้อมูลใน Sheet นี้ ลองเลือก Sheet อื่น</div> : <div className="grid gap-3 sm:grid-cols-2">{regions.map((region, index) => <DSButton key={region.id} type="button" onClick={() => setRegionId(region.id)} variant={regionId === region.id ? 'primary' : 'secondary'} className="ds-button--card"><div className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900 dark:text-white">ตาราง {index + 1}</span>{regionId === region.id && <span className="material-symbols-outlined text-lg text-slate-700">check_circle</span>}</div><p className="mt-1 text-xs text-slate-500">ข้อมูล {region.rows.length} แถว · {region.rows[region.headerIndex]?.filter(Boolean).length ?? 0} คอลัมน์</p><p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{region.rows[region.headerIndex]?.filter(Boolean).join(' · ')}</p></DSButton>)}</div>}
                    {selectedRegion && <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">ตัวอย่างข้อมูลจากตารางที่เลือก</div><table className="ds-table w-full min-w-[420px] text-left text-xs"><tbody>{selectedRegion.rows.slice(0, 4).map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0 dark:border-slate-800">{row.map((cell, col) => <td key={col} className="max-w-[180px] truncate px-3 py-2 text-slate-600 dark:text-slate-300">{cell || '—'}</td>)}</tr>)}</tbody></table></div>}
                  </section>
                  <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800"><DSButton type="button" disabled={!selectedRegion} onClick={beginMapping} variant="primary">ถัดไป: จับคู่คอลัมน์ <span className="material-symbols-outlined ml-1 align-middle text-base">arrow_forward</span></DSButton></div>
                </div>
              ) : selectedRegion ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-slate-900 dark:text-white">จับคู่คอลัมน์กับข้อมูล M101</h3><p className="text-xs text-slate-500">เลือกว่าคอลัมน์จากไฟล์นี้จะนำไปเก็บในช่องข้อมูลใด</p></div><DSButton type="button" onClick={() => setStep('sheet')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><span className="material-symbols-outlined mr-1 align-middle text-sm">arrow_back</span>เปลี่ยน Sheet / ตาราง</DSButton></div>
                  <div className="grid gap-2 sm:grid-cols-2">{headers.map((header, index) => <label key={index} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"><div className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-slate-500">คอลัมน์จากไฟล์</span><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{header || `คอลัมน์ ${index + 1}`}</span></div><span className="material-symbols-outlined text-slate-400">arrow_forward</span><div className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-slate-500">ช่องข้อมูล M101</span><DSSelect value={mapping[index] ?? ''} onChange={(event) => setMapping((current) => ({ ...current, [index]: event.target.value as ImportField | '' }))} className="ds-import-field"><option value="">ไม่ใช้คอลัมน์นี้</option>{FIELD_OPTIONS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</DSSelect></div></label>)}</div>
                  <section className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-slate-900 dark:text-white">ตรวจตัวอย่างก่อนนำเข้า</h4><p className="text-xs text-slate-500">แสดง {preview.length} จาก {dataRows.length} แถว · ต้องจับคู่ “ชื่อกิจการ” ก่อน</p></div><DSButton type="button" onClick={toggleAll} variant="secondary">{selectedRows.length === dataRows.length ? 'ไม่เลือกทั้งหมด' : 'เลือกทุกรายการ'}</DSButton></div><div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="ds-table w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-900"><tr><th className="px-3 py-2">นำเข้า</th>{headers.map((header, index) => <th key={index} className="px-3 py-2 font-semibold text-slate-500">{header || `คอลัมน์ ${index + 1}`}</th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index} className="border-t border-slate-100 dark:border-slate-800"><td className="px-3 py-2"><input type="checkbox" checked={selectedRows.includes(index)} onChange={() => setSelectedRows((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /></td>{headers.map((_, col) => <td key={col} className="max-w-[220px] truncate px-3 py-2 text-slate-600 dark:text-slate-300">{row[col] || '—'}</td>)}</tr>)}</tbody></table></div></section>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-[11px] text-slate-500">{step === 'mapping' ? `เลือกนำเข้า ${selectedRows.length} / ${dataRows.length} รายการ` : 'ข้อมูลเดิมจะไม่ถูกแก้ไขจนกว่าจะกดยืนยันนำเข้า'}</p>
          <div className="flex items-center gap-2"><DSButton type="button" onClick={close} variant="secondary">ยกเลิก</DSButton>{workbook && step === 'mapping' && <DSButton type="button" onClick={confirmImport} disabled={!hasCompanyName || selectedRows.length === 0} variant="primary">ยืนยันนำเข้า ({selectedRows.length})</DSButton>}</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
    </div>
  );
};
