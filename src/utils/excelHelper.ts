import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { BusinessRecord } from '../types';

const HEADER_MAPS = {
  sequenceNo: ['ลำดับ', 'seq', 'sequence', 'no', 'sequenceNo', 'sequenceno', 'ลำดับที่'],
  taxId: [
    'เลขประจำตัวผู้เสียภาษี', 
    'เลขประจำตัวผู้เสีย', 
    'เลขประจำตัว', 
    'ประจำตัวผู้เสีย', 
    'เลขผู้เสียภาษี', 
    'ผู้เสียภาษี', 
    'เลขผู้เสียภาษีอากร', 
    'เลขทะเบียน', 
    'ทะเบียนนิติบุคคล', 
    'taxid', 
    'tax_id', 
    'taxId', 
    'registrationno', 
    'registration_no'
  ],
  companyName: ['ชื่อบริษัท / ห้างหุ้นส่วนจำกัด', 'ชื่อบริษัท / ห้างหุ้น', 'ชื่อบริษัท/ห้างหุ้นส่วนจำกัด', 'ชื่อบริษัท', 'ห้างหุ้นส่วนจำกัด', 'companyname', 'company_name', 'companyName', 'ชื่อนิติบุคคล', 'ชื่อผู้เสียภาษี', 'ชื่อบริษัท/หจก', 'ชื่อนิติบุคคล / ห้างหุ้นส่วนจำกัด', 'ชื่อ'],
  auditorDate: ['วันที่แจ้งผู้สอบ', 'วันที่แจ้งผู้สอบบัญชี', 'ผู้สอบบัญชี', 'วันที่แจ้ง', 'auditorDate', 'auditordate', 'auditor_date', 'ผู้สอบ', 'วันแจ้ง'],
  password: ['password', 'PASSWORD', 'รหัสผ่าน', 'passwordใหม่', 'รหัส', 'พาสเวิร์ด', 'pass', 'รหัสผ่าน e-filing'],
  remark: ['หมายเหตุ/รหัสใหม่', 'หมายเหตุ/รหัสใหม', 'หมายเหตุ', 'หมายเหตุ/รหัส', 'remark', 'remarks', 'หมายเหตุอื่นๆ', 'รหัสใหม่'],
  eFilingCode: ['รหัสยื่น e-filing', 'efiling', 'e-filing', 'e_filing', 'รหัสยื่น', 'รหัส e-filing', 'รหัสยื่น e-filing', 'e-filing code'],
  ssoCode: ['ประกันสังคม', 'รหัสประกันสังคม', 'sso', 'ssocode', 'sso_code', 'ประกันสังคมรหัส', 'รหัสสปส', 'สปส']
};

function normalizeHeader(h: string): string {
  if (!h) return '';
  // ทำความสะอาดหัวข้อคอลัมน์ เอาเครื่องหมายพิเศษ ขีด ช่องว่าง และอักขระที่มองไม่เห็นออกทั้งหมด
  return h.toString()
    .replace(/[\s\x00-\x1F\x7F-\x9F\u00A0\u2000-\u200B\u2028\u2029\uFEFF\-\_\/]/g, '')
    .toLowerCase()
    .trim();
}

function findMappedKey(header: any): string | null {
  if (header === null || header === undefined) return null;
  const normalized = normalizeHeader(String(header));
  if (!normalized) return null;

  // 1. Exact Match (Tier 1) - ตรงกันเป๊ะๆ ทั้งคำ
  for (const [key, aliases] of Object.entries(HEADER_MAPS)) {
    for (const alias of aliases) {
      if (normalizeHeader(alias) === normalized) {
        return key;
      }
    }
  }

  // 2. Truncated Prefix / Substring Match (Tier 2) - รองรับคอลัมน์ที่โดนตัดคำ
  for (const [key, aliases] of Object.entries(HEADER_MAPS)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeHeader(alias);
      if (normalized.length >= 4 && (normalizedAlias.includes(normalized) || normalized.includes(normalizedAlias))) {
        return key;
      }
    }
  }

  // 3. Fallback สำหรับหัวข้อสำคัญที่ตัดเหลือสั้นมากเป็นพิเศษ
  if (normalized.includes('เลขประจำตัว') || normalized.includes('เลขผู้เสีย') || normalized.includes('ประจำตัวผู้เสีย') || normalized.includes('ผู้เสียภาษี')) {
    return 'taxId';
  }
  if (normalized.includes('ชื่อบริษัท') || normalized.includes('ชื่อนิติ') || normalized.includes('ห้างหุ้น')) {
    return 'companyName';
  }
  if (normalized.includes('ผู้สอบ') || normalized.includes('วันที่แจ้ง')) {
    return 'auditorDate';
  }
  if (normalized.includes('หมายเหตุ') || normalized.includes('รหัสใหม')) {
    return 'remark';
  }
  if (normalized.includes('efiling') || normalized.includes('ยื่นe')) {
    return 'eFilingCode';
  }
  if (normalized.includes('ประกันสังคม') || normalized.includes('sso')) {
    return 'ssoCode';
  }

  return null;
}

export function parseDocumentFile(file: File, topicName: string): Promise<Partial<BusinessRecord>[]> {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: false, // อ่านแบบ 2D Array เพื่อสแกนหาหัวข้อแบบแนวตั้งก่อน
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const parsedData = process2DArray(results.data as any[][], topicName);
            resolve(parsedData);
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    } else {
      // Excel parse (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // ดึงข้อมูลเป็น 2D Array เพื่อสแกนหาตำแหน่งแถวที่เป็นหัวตารางที่แม่นยำที่สุด
          // ตั้งค่า raw: false เพื่อใช้ตัวฟอร์แมตเตอร์ของ Excel (รักษารูปแบบ 0 นำหน้า และค่าวันที่ที่แสดงจริง)
          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, defval: '' });
          const parsedData = process2DArray(rawRows, topicName);
          resolve(parsedData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    }
  });
}

function process2DArray(rows: any[][], topicName: string): Partial<BusinessRecord>[] {
  if (!rows || rows.length === 0) return [];

  // 1. สแกนหาแถวที่มีโอกาสเป็น "หัวข้อ / หัวตาราง" (Header Row) มากที่สุด
  let bestRowIndex = -1;
  let maxMatchScore = 0;

  const scanLimit = Math.min(rows.length, 30);
  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    let score = 0;
    for (let c = 0; c < row.length; c++) {
      if (findMappedKey(row[c]) !== null) {
        score++;
      }
    }

    if (score > maxMatchScore) {
      maxMatchScore = score;
      bestRowIndex = r;
    }
  }

  const headerRowIndex = bestRowIndex !== -1 ? bestRowIndex : 0;
  const headerRow = rows[headerRowIndex] || [];

  // 2. จับคู่คอลัมน์แนวตั้งกับหัวข้อ (Column Index -> Record Field Key)
  const colIndexToKeyMap: Record<number, string> = {};
  headerRow.forEach((cell, colIdx) => {
    const mappedKey = findMappedKey(cell);
    if (mappedKey) {
      colIndexToKeyMap[colIdx] = mappedKey;
    }
  });

  // 3. อ่านข้อมูลถัดลงมาจากแถวหัวข้อในแต่ละคอลัมน์แนวตั้ง
  const parsedRecords: Partial<BusinessRecord>[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // ตรวจสอบว่าในแถวนั้นมีข้อมูลจริงหรือไม่
    const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) continue;

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
      topic: topicName,
      sourceType: 'excel'
    };

    // ใช้การลูปด้วยดัชนีหัวตารางโดยตรงเพื่อให้มั่นใจว่าดึงข้อมูลได้เป๊ะทุกช่อง แม้ในแถวจะมีช่องว่างหรือตกหล่น
    for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
      const fieldKey = colIndexToKeyMap[colIdx];
      if (fieldKey) {
        const cell = row[colIdx];
        let valStr = '';
        if (cell !== null && cell !== undefined) {
          // หากเป็นค่าวันที่ใน Excel ที่เป็นตัวเลข ให้แปลงให้อ่านเข้าใจง่าย
          if (fieldKey === 'auditorDate' && typeof cell === 'number' && cell > 30000 && cell < 60000) {
            try {
              const dateObj = XLSX.SSF.parse_date_code(cell);
              if (dateObj) {
                const day = String(dateObj.d).padStart(2, '0');
                const month = String(dateObj.m).padStart(2, '0');
                const year = dateObj.y + 543;
                valStr = `${day}/${month}/${year}`;
              } else {
                valStr = String(cell).trim();
              }
            } catch {
              valStr = String(cell).trim();
            }
          } else {
            valStr = String(cell).trim();
          }
        }

        // หากเป็น เลขผู้เสียภาษี (Tax ID) ให้จัดการตัดทศนิยม .0 หรือ สัญกรณ์วิทยาศาสตร์ (ถ้ามี)
        if (fieldKey === 'taxId' && valStr) {
          if (valStr.endsWith('.0')) {
            valStr = valStr.slice(0, -2);
          }
          // จัดการแปลงสัญกรณ์วิทยาศาสตร์ (เช่น 9.94001e+11) กลับเป็นตัวเลขดิบแบบคงรูป 100%
          if (/[+-]?\d*(\.\d+)?e[+-]?\d+/i.test(valStr)) {
            const num = Number(valStr);
            if (!isNaN(num)) {
              valStr = BigInt(Math.round(num)).toString();
            }
          }

          // ตรวจสอบหลักตัวเลข: เลขผู้เสียภาษีในไทยต้องมี 13 หลัก
          // หากนับเฉพาะตัวเลขแล้วมี 12 หลัก แสดงว่าเลข '0' นำหน้าโดนตัดออกตอนบันทึกหรืออ่านค่าใน Excel
          // ระบบจะเติมเลข '0' กลับคืนไว้ที่ด้านหน้าสุด เพื่อความถูกต้อง 100%
          const digitsOnly = valStr.replace(/\D/g, '');
          if (digitsOnly.length === 12) {
            if (!valStr.startsWith('0')) {
              valStr = '0' + valStr;
            }
          }
        }

        (record as any)[fieldKey] = valStr;
      }
    }

    // ตรวจสอบและกรองประเภทนิติบุคคลอัตโนมัติจากคอลัมน์ชื่อบริษัท
    const name = record.companyName || '';
    if (name.includes('ห้างหุ้นส่วน') || name.includes('หจก') || name.includes('หสน') || name.toLowerCase().includes('partnership')) {
      record.type = 'partnership';
    } else if (name.includes('บริษัท') || name.includes('บจก') || name.toLowerCase().includes('co.,ltd') || name.toLowerCase().includes('company')) {
      record.type = 'company';
    } else if (name.trim()) {
      record.type = 'individual';
    }

    parsedRecords.push(record);
  }

  return parsedRecords;
}
