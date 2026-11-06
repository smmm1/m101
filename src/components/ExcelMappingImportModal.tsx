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
  const [previewPage, setPreviewPage] = useState(0);
  const previewPageSize = 10;

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
    setPreviewPage(0);
    setStep('sheet');
    setPreviewPage(0);
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
    setPreviewPage(0);
    const companyColumn = Object.entries(next).find(([, field]) => field === 'companyName')?.[0];
    setSelectedRows(companyColumn === undefined
      ? []
      : dataRows.map((row, index) => ({ row, index })).filter(({ row }) => clean(row[Number(companyColumn)]) !== '').map(({ index }) => index));
    setStep('mapping');
  };

  const preview = useMemo(() => dataRows, [dataRows]);
  const pageCount = Math.max(1, Math.ceil(preview.length / previewPageSize));
  const visiblePreview = preview.slice(previewPage * previewPageSize, (previewPage + 1) * previewPageSize);
  const mappedFields = Object.values(mapping).filter(Boolean);
  const hasCompanyName = mappedFields.includes('companyName');
  const mappedColumns = Object.entries(mapping).filter(([, field]) => Boolean(field));

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
      const hasMappedType = Object.values(mapping).includes('type');
      const mappedType = hasMappedType ? normalize(record.type) : '';

      // Preserve an explicitly mapped type column. Infer from the company name only
      // when no type column was mapped or the source value is not recognizable.
      if (mappedType.includes('ห้างหุ้นส่วน') || mappedType.includes('หจก') || mappedType.includes('partnership')) {
        record.type = 'partnership';
      } else if (mappedType.includes('บุคคล') || mappedType.includes('individual') || mappedType === 'person') {
        record.type = 'individual';
      } else if (mappedType.includes('บริษัท') || mappedType.includes('บจก') || mappedType.includes('company') || mappedType.includes('ltd')) {
        record.type = 'company';
      } else if (company.includes('ห้างหุ้นส่วน') || company.includes('หจก') || /partnership/i.test(company)) {
        record.type = 'partnership';
      } else if (company.includes('บริษัท') || company.includes('บจก') || /company|co\\.,?ltd/i.test(company)) {
        record.type = 'company';
      } else if (company) {
        record.type = 'individual';
      }
      return record;
    });
    onImportRecords(output);
    onShowToast(`นำเข้าข้อมูล ${output.length} รายการ จาก ${sheetName} สำเร็จ`, 'นำเข้าสำเร็จ', 'success');
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="m101-dialog-overlay m101-import-dialog fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="excel-mapping-title">
      <div className="m101-import-wizard w-full max-w-5xl max-h-[94vh] overflow-hidden rounded-2xl border bg-white shadow-2xl flex flex-col">
        <header className="m101-import-wizard__header"><div><p className="m101-import-kicker">M101 · นำเข้าข้อมูล</p><h2 id="excel-mapping-title">นำเข้ารายชื่อกิจการ</h2><p>ปีบัญชี {selectedYear} · ไฟล์ต้นฉบับจะไม่ถูกแก้ไข</p></div><DSButton type="button" onClick={close} variant="ghost">ปิด</DSButton></header>
        <nav className="m101-import-progress" aria-label="ขั้นตอนนำเข้า"><div className={!workbook ? 'is-current' : 'is-done'}><span>1</span><b>เลือกไฟล์</b></div><i /><div className={workbook && step === 'sheet' ? 'is-current' : step === 'mapping' ? 'is-done' : ''}><span>2</span><b>เลือกข้อมูล</b></div><i /><div className={step === 'mapping' ? 'is-current' : ''}><span>3</span><b>จับคู่และยืนยัน</b></div></nav>
        <div className="m101-import-wizard__body">
          {!workbook ? <section className="m101-import-upload"><div className="m101-import-upload__icon"><span className="material-symbols-outlined">upload_file</span></div><h3>เลือกไฟล์ทะเบียนที่ต้องการนำเข้า</h3><p>รองรับไฟล์ Excel และ CSV</p><div className="m101-import-filetypes"><span>.xlsx</span><span>.xls</span><span>.csv</span></div><DSButton type="button" variant="primary" onClick={() => inputRef.current?.click()}>เลือกไฟล์จากอุปกรณ์</DSButton><small>ข้อมูลจะยังไม่ถูกบันทึกจนกว่าคุณจะกดยืนยัน</small></section> : <>
            <div className="m101-import-file-summary"><span className="material-symbols-outlined">description</span><div><b title={fileName}>{fileName}</b><small>{workbook.SheetNames.length} Sheet · {sheetName}</small></div><DSButton type="button" variant="secondary" onClick={reset}>เปลี่ยนไฟล์</DSButton></div>
            {step === 'sheet' ? <div className="m101-import-step-content">
              <section className="m101-import-section"><div className="m101-import-section__heading"><div><span>ขั้นตอน 1</span><h3>เลือก Sheet ที่มีข้อมูล</h3><p>เลือกชื่อ Sheet จากไฟล์ Excel ด้วยตัวเอง</p></div></div><label className="m101-import-control"><span>Sheet ในไฟล์</span><DSSelect value={sheetName} onChange={(event) => loadSheet(workbook, event.target.value)}>{workbook.SheetNames.map((name) => <option key={name} value={name}>{name}</option>)}</DSSelect></label></section>
              <section className="m101-import-section"><div className="m101-import-section__heading"><div><span>ขั้นตอน 2</span><h3>เลือกตารางที่จะนำเข้า</h3><p>ระบบพบ {regions.length} ตารางใน Sheet นี้ เลือกตารางที่ต้องการ</p></div><strong className="m101-import-count">{regions.length} ตาราง</strong></div>
                {regions.length === 0 ? <div className="m101-import-empty"><b>ยังไม่พบตารางข้อมูล</b><p>ลองเลือก Sheet อื่น หรือตรวจสอบว่าใน Sheet มีข้อมูล</p></div> : <div className="m101-import-table-options">{regions.map((region, index) => { const selected = regionId === region.id; const sample = region.rows[region.headerIndex] ?? []; return <button key={region.id} type="button" className={'m101-import-table-option ' + (selected ? 'is-selected' : '')} aria-pressed={selected} onClick={() => { setRegionId(region.id); setHeaderRowIndex(region.headerIndex); }}><span className="m101-import-table-option__check">{selected ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="m101-import-table-option__copy"><b>ตาราง {index + 1}</b><small>ประมาณ {region.rows.length} แถว · {sample.filter(Boolean).length} คอลัมน์ · เริ่มแถว {region.startRow + 1}</small><em>{sample.filter(Boolean).slice(0, 5).join(' · ') || 'ยังไม่มีหัวคอลัมน์'}</em></span><span className="material-symbols-outlined">{selected ? 'radio_button_checked' : 'radio_button_unchecked'}</span></button>; })}</div>}
              </section>
              {selectedRegion && <section className="m101-import-section"><div className="m101-import-section__heading"><div><h3>แถวไหนเป็นหัวตาราง?</h3><p>ถ้าระบบเลือกไม่ตรง สามารถเปลี่ยนได้</p></div></div><label className="m101-import-control"><span>เลือกแถวหัวตาราง</span><DSSelect value={String(headerRowIndex)} onChange={(event) => { setHeaderRowIndex(Number(event.target.value)); setMapping({}); setSelectedRows([]); setPreviewPage(0); }}>{selectedRegion.rows.slice(0, Math.min(12, selectedRegion.rows.length)).map((row, index) => <option key={index} value={index}>แถว {selectedRegion.startRow + index + 1} — {row.filter(Boolean).slice(0, 4).join(' / ') || 'ไม่มีข้อความ'}</option>)}</DSSelect></label><div className="m101-import-mini-preview"><b>หัวตารางที่เลือก</b><div>{(selectedRegion.rows[headerRowIndex] ?? []).map((cell, index) => <span key={index}>{cell || 'คอลัมน์ ' + (index + 1)}</span>)}</div></div></section>}
              <div className="m101-import-wizard__actions"><span>ยังไม่บันทึกข้อมูลในขั้นตอนนี้</span><DSButton type="button" disabled={!selectedRegion} onClick={beginMapping} variant="primary">ถัดไป: จับคู่คอลัมน์ <span className="material-symbols-outlined">arrow_forward</span></DSButton></div>
            </div> : selectedRegion ? <div className="m101-import-step-content">
              <div className="m101-import-context"><div><b>{sheetName} / ตาราง {regions.findIndex((item) => item.id === regionId) + 1}</b><small>เลือกว่าคอลัมน์จากไฟล์จะไปเก็บในช่องใดของ M101</small></div><DSButton type="button" variant="secondary" onClick={() => setStep('sheet')}>เปลี่ยน Sheet / ตาราง</DSButton></div>
              <section className="m101-import-section"><div className="m101-import-section__heading"><div><span>ขั้นตอน 3</span><h3>จับคู่คอลัมน์</h3><p>ระบบจับคู่ให้อัตโนมัติ คุณสามารถแก้ไขได้ทุกช่อง</p></div><strong className="m101-import-count">{mappedColumns.length} / {headers.length} คอลัมน์</strong></div>
                <div className="m101-import-mapping-list">{headers.map((header, index) => { const target = mapping[index] ?? ''; const sample = dataRows.find((row) => clean(row[index]) !== '')?.[index] || 'ไม่มีข้อมูล'; return <div key={index} className="m101-import-mapping-row"><div className="m101-import-mapping-source"><small>คอลัมน์จากไฟล์</small><b>{header || 'คอลัมน์ ' + (index + 1)}</b><em>ตัวอย่าง: {sample}</em></div><span className="material-symbols-outlined m101-import-mapping-arrow">arrow_forward</span><label className="m101-import-mapping-target"><small>นำไปเก็บที่</small><DSSelect value={target} onChange={(event) => { const field = event.target.value as ImportField | ''; setMapping((current) => { const next = { ...current }; if (field) Object.keys(next).forEach((key) => { if (Number(key) !== index && next[Number(key)] === field) next[Number(key)] = ''; }); next[index] = field; return next; }); }}><option value="">ไม่ใช้คอลัมน์นี้</option>{FIELD_OPTIONS.map((field) => <option key={field.value} value={field.value}>{field.label}</option>)}</DSSelect></label></div>; })}</div>
                <div className={'m101-import-required-note ' + (hasCompanyName ? 'is-ready' : '')}><span className="material-symbols-outlined">{hasCompanyName ? 'check_circle' : 'info'}</span>{hasCompanyName ? 'จับคู่ชื่อกิจการแล้ว พร้อมตรวจสอบรายการ' : 'ต้องจับคู่ “ชื่อกิจการ” ก่อนจึงจะนำเข้าได้'}</div>
              </section>
              <section className="m101-import-section"><div className="m101-import-section__heading"><div><span>ตรวจสอบก่อนบันทึก</span><h3>ตัวอย่างข้อมูลที่จะเข้า M101</h3><p>เลือกเฉพาะแถวที่ต้องการ · แสดง {preview.length === 0 ? 0 : previewPage * previewPageSize + 1}–{Math.min((previewPage + 1) * previewPageSize, preview.length)} จาก {dataRows.length} แถว</p></div><DSButton type="button" variant="secondary" onClick={toggleAll}>{selectedRows.length === dataRows.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}</DSButton></div>
                {mappedColumns.length === 0 ? <div className="m101-import-empty">เลือกช่องข้อมูล M101 อย่างน้อย 1 คอลัมน์เพื่อดูตัวอย่าง</div> : <div className="m101-import-preview-list">{visiblePreview.map((row, localIndex) => { const index = previewPage * previewPageSize + localIndex; return <label key={index} className={'m101-import-preview-row ' + (selectedRows.includes(index) ? 'is-selected' : '')}><input type="checkbox" checked={selectedRows.includes(index)} onChange={() => setSelectedRows((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} /><span className="m101-import-preview-row__number">{index + 1}</span><span className="m101-import-preview-row__values">{mappedColumns.map(([column, field]) => <span key={column}><small>{FIELD_OPTIONS.find((item) => item.value === field)?.label}</small><b>{clean(row[Number(column)]) || '—'}</b></span>)}</span></label>; })}</div>}
                {pageCount > 1 && <div className="m101-import-pagination"><span>หน้า {previewPage + 1} / {pageCount} · เลือกไว้ {selectedRows.length} รายการ</span><div><DSButton type="button" variant="secondary" disabled={previewPage === 0} onClick={() => setPreviewPage((page) => Math.max(0, page - 1))}>ก่อนหน้า</DSButton><DSButton type="button" variant="secondary" disabled={previewPage >= pageCount - 1} onClick={() => setPreviewPage((page) => Math.min(pageCount - 1, page + 1))}>ถัดไป</DSButton></div></div>}
              </section>
              <div className="m101-import-wizard__actions"><span>เลือกนำเข้า {selectedRows.length} จาก {dataRows.length} รายการ</span><DSButton type="button" onClick={confirmImport} disabled={!hasCompanyName || selectedRows.length === 0} variant="primary">ยืนยันนำเข้า {selectedRows.length} รายการ</DSButton></div>
            </div> : null}
          </>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
    </div>
  );
};