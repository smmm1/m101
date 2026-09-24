export type BusinessStatus = 'pending' | 'in_progress' | 'completed';

export type BusinessType = 'company' | 'partnership' | 'individual';

export interface BusinessRecord {
  id: string;
  sequenceNo: string; // e.g. "001", "02"
  taxId: string; // e.g. "0-1055-00000-00-0"
  companyName: string;
  type: BusinessType;
  auditorDate: string; // e.g. "น้องมิล", "15 ม.ค. 2569"
  password: string; // e.g. "M0b!z2569"
  remark: string; // e.g. "บันทึกข้อมูลเรียบร้อย"
  eFilingCode: string; // e.g. "DBD-EF-998822"
  ssoCode: string; // e.g. "1055000000"
  status: BusinessStatus;
  isVerifiedDbd: boolean;
  topic?: string; // e.g. "ชุดไฟล์นำเข้า: ทะเบียนDBD.xlsx", "งวดบัญชี ม.ค. 2569", "บันทึกข้อมูลเอง"
  sourceType?: 'manual' | 'file_import' | 'excel' | 'pdf' | 'image';
  sourceFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewMode = 'table' | 'cards';

export type FilterStatus = 'all' | 'company' | 'partnership' | 'individual' | 'pending' | 'in_progress' | 'completed';

export type ActiveScreen = 'login' | 'dashboard' | 'settings' | 'add-business' | 'business-list';

export type UserRole = 'admin' | 'member';

export interface OnlineUser {
  id: string;
  userName: string;
  currentScreen: string;
  joinedAt: number;
  lastActive: number;
  color?: string;
  role?: UserRole;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  color?: string;
  role?: 'user' | 'system';
  userRole?: UserRole;
}
