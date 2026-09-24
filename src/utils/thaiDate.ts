export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Returns formatted Thai date e.g. "23 ก.ย. 2569"
 */
export function getThaiFormattedDate(d: Date = new Date()): string {
  const day = d.getDate();
  const month = THAI_MONTHS_SHORT[d.getMonth()];
  const thaiYear = d.getFullYear() + 543;
  return `${day} ${month} ${thaiYear}`;
}

/**
 * Returns formatted Thai time e.g. "23:14:24"
 */
export function getThaiFormattedTime(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Format 13-digit Thai Tax ID: 0-1055-00000-00-0
 */
export function formatThaiTaxId(val: string): string {
  const raw = val.replace(/\D/g, '').substring(0, 13);
  let formatted = '';
  if (raw.length > 0) formatted += raw.substring(0, 1);
  if (raw.length > 1) formatted += '-' + raw.substring(1, 5);
  if (raw.length > 5) formatted += '-' + raw.substring(5, 10);
  if (raw.length > 10) formatted += '-' + raw.substring(10, 12);
  if (raw.length > 12) formatted += '-' + raw.substring(12, 13);
  return formatted;
}

/**
 * Validate 13-digit Thai Tax ID checksum (optional check)
 */
export function is13Digits(val: string): boolean {
  return val.replace(/\D/g, '').length === 13;
}

/**
 * Generate strong random password
 */
export function generateRandomPassword(length: number = 10): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const specials = '!@#$%&*';
  const all = letters + numbers + specials;
  
  let pwd = '';
  pwd += letters[Math.floor(Math.random() * letters.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += specials[Math.floor(Math.random() * specials.length)];
  
  for (let i = 3; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle characters
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Infer business type from legal name
 */
export function inferBusinessType(name: string): 'company' | 'partnership' | 'individual' {
  if (/ห้างหุ้นส่วน|หจก\./i.test(name)) return 'partnership';
  if (/บริษัท|บจก\.|บมจ\./i.test(name)) return 'company';
  return 'individual';
}
