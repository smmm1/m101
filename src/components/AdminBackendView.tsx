import React, { useState, useEffect, useMemo } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { supabase } from '../lib/supabase';
import {
  XpCalendarIcon,
  XpEditIcon,
  XpTrashIcon,
  XpStatusSphere,
} from './ClassicIcons';
import { useSystemConfig, SystemConfig } from '../context/SystemConfigContext';
import { VisualSiteEditor } from './VisualSiteEditor';

interface AdminBackendViewProps {
  recordsByYear: Record<string, BusinessRecord[]>;
  selectedYear: string;
  availableYears: string[];
  onSelectYear: (year: string) => void;
  onUpdateYearRecords: (year: string, newRecords: BusinessRecord[]) => void;
  onUpdateAllYearsData: (data: Record<string, BusinessRecord[]>) => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateHome: () => void;
  currentUserName: string;
}

interface AllowedUser {
  email: string;
  role: string;
  created_at: string;
}

const PRESET_COLORS = [
  { name: 'ชาร์โคลคลาสสิก', hex: '#18181b', bgHex: '#27272a' },
  { name: 'เขียวมรกตสดใส', hex: '#059669', bgHex: '#10b981' },
  { name: 'น้ำเงินพรีเมียม', hex: '#2563eb', bgHex: '#3b82f6' },
  { name: 'ม่วงครามอินดิโก้', hex: '#4f46e5', bgHex: '#6366f1' },
  { name: 'ทองอำพันหรูหรา', hex: '#d97706', bgHex: '#f59e0b' },
  { name: 'แดงทับทิมโมเดิร์น', hex: '#e11d48', bgHex: '#f43f5e' },
  { name: 'ฟ้าไซอันทันสมัย', hex: '#0891b2', bgHex: '#06b6d4' },
  { name: 'ม่วงเข้มราชวงศ์', hex: '#7c3aed', bgHex: '#8b5cf6' },
  { name: 'เขียวเข้มฟอเรสต์', hex: '#15803d', bgHex: '#22c55e' },
  { name: 'น้ำตาลบรอนซ์อบอุ่น', hex: '#78350f', bgHex: '#92400e' },
];

export const AdminBackendView: React.FC<AdminBackendViewProps> = ({
  recordsByYear,
  selectedYear,
  availableYears,
  onSelectYear,
  onUpdateYearRecords,
  onUpdateAllYearsData,
  onShowToast,
  onNavigateHome,
  currentUserName,
}) => {
  const { config, updateConfig, resetConfig } = useSystemConfig();

  const [activeTab, setActiveTab] = useState<
    'master-data' | 'titles-theme' | 'users' | 'branding' | 'maintenance' | 'visual-editor'
  >('titles-theme');

  const [activeYear, setActiveYear] = useState<string>(selectedYear);

  // Synchronize active year
  useEffect(() => {
    setActiveYear(selectedYear);
  }, [selectedYear]);

  const currentList = useMemo(() => {
    return recordsByYear[activeYear] || [];
  }, [recordsByYear, activeYear]);

  // Master Data Editing & Searching
  const [searchFilter, setSearchFilter] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [rowDraft, setRowDraft] = useState<BusinessRecord | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Find & Replace Modal
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findField, setFindField] = useState<keyof BusinessRecord>('auditorDate');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  // Bulk Status
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [batchStatusValue, setBatchStatusValue] = useState<BusinessStatus>('pending');

  // Allowed Users State
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');

  // Titles & Theme Editing Draft
  const [themeDraft, setThemeDraft] = useState<SystemConfig>(config);

  // Sync draft whenever config changes
  useEffect(() => {
    setThemeDraft(config);
  }, [config]);

  // Load Allowed Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.from('allowed_users').select('*');
      if (error) {
        onShowToast('ดึงข้อมูลผู้ใช้ไม่สำเร็จ: ' + error.message, 'ข้อผิดพลาด', 'error');
      } else if (Array.isArray(data)) {
        setAllowedUsers(data);
      }
    } catch {
      // fallback
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      void fetchUsers();
    }
  }, [activeTab]);

  // Filtered master records
  const filteredList = useMemo(() => {
    if (!searchFilter.trim()) return currentList;
    const q = searchFilter.toLowerCase().trim();
    return currentList.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        r.taxId.toLowerCase().includes(q) ||
        r.sequenceNo.toLowerCase().includes(q) ||
        r.password.toLowerCase().includes(q) ||
        r.eFilingCode.toLowerCase().includes(q) ||
        r.auditorDate.toLowerCase().includes(q) ||
        r.remark.toLowerCase().includes(q)
    );
  }, [currentList, searchFilter]);

  // Handle Edit Row
  const startEditRow = (record: BusinessRecord) => {
    setEditingRowId(record.id);
    setRowDraft({ ...record });
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setRowDraft(null);
  };

  const saveEditRow = () => {
    if (!rowDraft) return;
    const updated = currentList.map((r) =>
      r.id === rowDraft.id ? { ...rowDraft, updatedAt: new Date().toISOString() } : r
    );
    onUpdateYearRecords(activeYear, updated);
    onShowToast(`บันทึกข้อมูล "${rowDraft.companyName}" สำเร็จ`, 'บันทึกหลังบ้านสำเร็จ');
    setEditingRowId(null);
    setRowDraft(null);
  };

  // Add Row Directly
  const handleAddNewRow = () => {
    const newSeq = String(currentList.length + 1);
    const newRecord: BusinessRecord = {
      id: `backend-${activeYear}-${Date.now()}`,
      sequenceNo: newSeq,
      taxId: '',
      companyName: `กิจการใหม่ #${newSeq}`,
      type: 'company',
      auditorDate: '',
      password: '',
      remark: 'เพิ่มจากระบบหลังบ้าน',
      eFilingCode: '',
      ssoCode: '',
      status: 'pending',
      isVerifiedDbd: true,
      topic: `รอบปี ${activeYear}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...currentList];
    onUpdateYearRecords(activeYear, updated);
    setEditingRowId(newRecord.id);
    setRowDraft(newRecord);
    onShowToast('เพิ่มแถวข้อมูลใหม่เรียบร้อย กรุณากรอกรายละเอียด', 'เพิ่มข้อมูลสำเร็จ');
  };

  // Delete Row
  const handleDeleteRow = (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบ "${name}" ออกจากระบบหลังบ้านใช่หรือไม่?`)) return;
    const updated = currentList.filter((r) => r.id !== id);
    onUpdateYearRecords(activeYear, updated);
    onShowToast(`ลบ "${name}" เรียบร้อย`, 'ลบข้อมูล');
  };

  // Find & Replace execution
  const executeFindReplace = () => {
    if (!findText) {
      onShowToast('กรุณาระบุข้อความที่ต้องการค้นหา', 'แจ้งเตือน', 'info');
      return;
    }
    let count = 0;
    const updated = currentList.map((r) => {
      const currentVal = String(r[findField] || '');
      if (currentVal.includes(findText)) {
        count++;
        const replaced = currentVal.replaceAll(findText, replaceText);
        return {
          ...r,
          [findField]: replaced,
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    if (count > 0) {
      onUpdateYearRecords(activeYear, updated);
      onShowToast(`แทนที่คำสำเร็จ ${count} รายการในฟิลด์ "${String(findField)}"`, 'ค้นหาและแทนที่สำเร็จ');
      setShowFindReplace(false);
      setFindText('');
      setReplaceText('');
    } else {
      onShowToast(`ไม่พบข้อความ "${findText}" ในฟิลด์ที่เลือก`, 'ไม่พบข้อมูล', 'info');
    }
  };

  // Batch Status Update
  const executeBatchStatus = () => {
    const targetIds = selectedRowIds.length > 0 ? selectedRowIds : currentList.map((r) => r.id);
    const updated = currentList.map((r) => {
      if (targetIds.includes(r.id)) {
        return { ...r, status: batchStatusValue, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    onUpdateYearRecords(activeYear, updated);
    onShowToast(`อัปเดตสถานะเป็น "${batchStatusValue}" ทั้งหมด ${targetIds.length} รายการ`, 'อัปเดตสถานะสำเร็จ');
    setShowBatchStatus(false);
    setSelectedRowIds([]);
  };

  // Re-sequence numbers 1..N
  const handleAutoResequence = () => {
    if (!confirm(`ต้องการจัดเรียงลำดับใหม่ 1 ถึง ${currentList.length} ตามลำดับปัจจุบันหรือไม่?`)) return;
    const updated = currentList.map((r, idx) => ({
      ...r,
      sequenceNo: String(idx + 1),
      updatedAt: new Date().toISOString(),
    }));
    onUpdateYearRecords(activeYear, updated);
    onShowToast('จัดเรียงลำดับใหม่เรียบร้อยแล้ว', 'เรียงลำดับสำเร็จ');
  };

  // Add Allowed User
  const handleAddAllowedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newUserEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      onShowToast('กรุณาระบุอีเมลที่ถูกต้อง', 'แจ้งเตือน', 'error');
      return;
    }
    const { error } = await supabase.from('allowed_users').insert([
      { email: cleanEmail, role: newUserRole },
    ]);
    if (error) {
      onShowToast('เพิ่มผู้ใช้งานไม่สำเร็จ: ' + error.message, 'ข้อผิดพลาด', 'error');
    } else {
      onShowToast(`เพิ่มผู้ใช้ "${cleanEmail}" (${newUserRole}) เรียบร้อย`, 'เพิ่มสิทธิ์สำเร็จ');
      setNewUserEmail('');
      void fetchUsers();
    }
  };

  // Delete Allowed User
  const handleDeleteAllowedUser = async (email: string) => {
    if (email.toLowerCase() === currentUserName.toLowerCase()) {
      if (!confirm('นี่คือบัญชีที่คุณกำลังใช้งานอยู่ คุณแน่ใจหรือไม่ว่าจะลบสิทธิ์นี้?')) return;
    } else if (!confirm(`ต้องการลบสิทธิ์ของ "${email}" ใช่หรือไม่?`)) {
      return;
    }
    const { error } = await supabase.from('allowed_users').delete().eq('email', email);
    if (error) {
      onShowToast('ลบไม่สำเร็จ: ' + error.message, 'ข้อผิดพลาด', 'error');
    } else {
      onShowToast(`ลบสิทธิ์ "${email}" เรียบร้อย`, 'ลบสำเร็จ');
      void fetchUsers();
    }
  };

  // Save Titles & Themes
  const handleSaveTitlesAndTheme = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('site_content').upsert({
      id: true,
      draft_content: themeDraft,
      published_content: themeDraft,
      published_at: now,
      updated_at: now,
      updated_by: currentUserName,
    }, { onConflict: 'id' });
    if (error) {
      onShowToast('บันทึกการตั้งค่าไม่สำเร็จ: ' + error.message, 'ข้อผิดพลาด', 'error');
      return;
    }
    updateConfig(themeDraft);
    onShowToast('บันทึกและเผยแพร่การตั้งค่าสีธีมและหัวข้อแล้ว', 'บันทึกสำเร็จ');
  };

  const handleResetTitlesAndTheme = () => {
    if (!confirm('ต้องการคืนค่าหัวข้อและสีธีมเริ่มต้นทั้งหมดหรือไม่?')) return;
    resetConfig();
    onShowToast('คืนค่าหัวข้อและสีธีมเริ่มต้นเรียบร้อยแล้ว', 'คืนค่าเริ่มต้น');
  };

  // Export Entire Database (All years)
  const handleExportAllYears = () => {
    try {
      const dataStr = JSON.stringify(recordsByYear, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mustang_Master_AllYears_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('ส่งออกฐานข้อมูลรวมทุกรอบปีเรียบร้อย', 'สำรองข้อมูลสำเร็จ');
    } catch {
      onShowToast('เกิดข้อผิดพลาดในการส่งออกข้อมูล', 'ข้อผิดพลาด', 'error');
    }
  };

  // Restore Entire Database (All years)
  const handleRestoreAllYears = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          onUpdateAllYearsData(parsed);
          onShowToast('กู้คืนฐานข้อมูลรวมทุกรอบปีสำเร็จ', 'กู้คืนสำเร็จ');
        } else if (Array.isArray(parsed)) {
          onUpdateYearRecords(activeYear, parsed);
          onShowToast(`กู้คืนข้อมูลเฉพาะปี ${activeYear} จำนวน ${parsed.length} รายการสำเร็จ`, 'กู้คืนสำเร็จ');
        } else {
          onShowToast('รูปแบบไฟล์สำรองไม่ถูกต้อง', 'ข้อผิดพลาด', 'error');
        }
      } catch {
        onShowToast('อ่านไฟล์ไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์ JSON', 'ข้อผิดพลาด', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Clear current year data
  const handleClearCurrentYear = () => {
    const code = prompt(`พิมพ์คำว่า "DELETE-${activeYear}" เพื่อยืนยันการล้างข้อมูลทั้งหมดของรอบปี ${activeYear}:`);
    if (code === `DELETE-${activeYear}`) {
      onUpdateYearRecords(activeYear, []);
      onShowToast(`ล้างข้อมูลทั้งหมดของรอบปี ${activeYear} เรียบร้อยแล้ว`, 'ล้างข้อมูลสำเร็จ', 'info');
    } else if (code) {
      onShowToast('รหัสยืนยันไม่ถูกต้อง ยกเลิกคำสั่งล้างข้อมูล', 'ยกเลิก', 'error');
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafafa] dark:bg-[#090a0f] p-4 sm:p-6 lg:p-8 flex flex-col gap-5 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs transition-colors">
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 font-headline tracking-tight">
                {config.adminTitle || 'ระบบจัดการข้อมูลและตั้งค่าหลังบ้าน (Admin Console)'}
              </h1>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                SYSTEM CORE
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              จัดการข้อมูลทะเบียนกิจการรอบปี, ผู้ใช้งาน, และปรับแต่งหัวข้อหน้าจอให้สอดคล้องกับข้อมูลปัจจุบัน
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>กลับหน้าภาพรวม</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-200/80 dark:border-zinc-800 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('visual-editor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${activeTab === 'visual-editor' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
        >
          <span className="material-symbols-outlined text-[16px]">design_services</span>
          <span>Visual Builder</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('titles-theme')
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'titles-theme'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">title</span>
          <span>หัวข้อและเมนู (Titles & Menu)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('master-data')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'master-data'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">table_rows</span>
          <span>จัดการข้อมูลกิจการ (Master Data Editor)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
            {currentList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
          <span>ผู้ใช้งานและสิทธิ์ (Access Control)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'branding'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">badge</span>
          <span>ตั้งค่าแบรนด์ & โลโก้ (Branding)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'maintenance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">database</span>
          <span>ฐานข้อมูล & กู้คืน (Disaster Recovery)</span>
        </button>
      </div>

      {activeTab === 'visual-editor' && (
        <VisualSiteEditor
          userEmail={currentUserName}
          onPublish={(nextConfig) => updateConfig(nextConfig)}
          onShowToast={onShowToast}
        />
      )}

      {/* TAB 1: TITLES & THEME CUSTOMIZATION (NEW) */}
      {activeTab === 'titles-theme' && (
        <div className="flex flex-col gap-6 max-w-4xl">
          {/* Top Sticky Action Bar */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl border border-[#e4e4e7] shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#18181b]">
                ปรับแต่งสีธีมและหัวข้อของระบบได้อย่างอิสระ
              </span>
              <span className="text-[10px] text-[#71717a] hidden sm:inline">
                (การเปลี่ยนแปลงจะมีผลต่อทุกหน้าทันที)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTitlesAndTheme}
                className="px-3 py-1.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-neutral-100 text-xs font-medium text-[#71717a] transition-colors cursor-pointer"
              >
                คืนค่าเริ่มต้น
              </button>
              <button
                type="button"
                onClick={handleSaveTitlesAndTheme}
                style={{ backgroundColor: themeDraft.primaryColor }}
                className="px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-2xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
              </button>
            </div>
          </div>



          {/* Section: Major Screen Titles & Subtitles */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">title</span>
                <span>แก้ไขชื่อหัวข้อหน้าหลักและคำอธิบาย (Screen Titles & Subtitles)</span>
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                ปรับเปลี่ยนชื่อหัวข้อใหญ่และคำอธิบายย่อยของแต่ละหน้าให้สอดคล้องกับการทำงานขององค์กร
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dashboard Title & Subtitle */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#fafafa] border border-[#f4f4f5]">
                <label className="text-xs font-bold text-[#18181b]">หน้าภาพรวม (Dashboard)</label>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-[11px] text-[#71717a]">ชื่อหัวข้อใหญ่:</span>
                    <input
                      type="text"
                      value={themeDraft.dashboardTitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, dashboardTitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#71717a]">คำอธิบายย่อย:</span>
                    <input
                      type="text"
                      value={themeDraft.dashboardSubtitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, dashboardSubtitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Business List Title & Subtitle */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#fafafa] border border-[#f4f4f5]">
                <label className="text-xs font-bold text-[#18181b]">หน้าทะเบียนกิจการ (Business List)</label>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-[11px] text-[#71717a]">ชื่อหัวข้อใหญ่:</span>
                    <input
                      type="text"
                      value={themeDraft.businessListTitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, businessListTitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#71717a]">คำอธิบายย่อย:</span>
                    <input
                      type="text"
                      value={themeDraft.businessListSubtitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, businessListSubtitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Settings Title & Subtitle */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#fafafa] border border-[#f4f4f5]">
                <label className="text-xs font-bold text-[#18181b]">หน้าการตั้งค่า (Settings)</label>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-[11px] text-[#71717a]">ชื่อหัวข้อใหญ่:</span>
                    <input
                      type="text"
                      value={themeDraft.settingsTitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, settingsTitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#71717a]">คำอธิบายย่อย:</span>
                    <input
                      type="text"
                      value={themeDraft.settingsSubtitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, settingsSubtitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Title */}
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#fafafa] border border-[#f4f4f5]">
                <label className="text-xs font-bold text-[#18181b]">หน้าระบบหลังบ้าน (Admin Console)</label>
                <div className="space-y-2 mt-1">
                  <div>
                    <span className="text-[11px] text-[#71717a]">ชื่อหัวข้อหลังบ้าน:</span>
                    <input
                      type="text"
                      value={themeDraft.adminTitle}
                      onChange={(e) => setThemeDraft({ ...themeDraft, adminTitle: e.target.value })}
                      className="w-full h-8.5 px-3 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Sidebar Menu Labels */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">menu_book</span>
                <span>แก้ไขชื่อเมนูแถบข้าง (Sidebar Menu Labels)</span>
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                กำหนดข้อความของเมนูหลัก 3 ปุ่มในแถบนำทางด้านซ้าย
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#52525b]">เมนูลำดับที่ 1 (ภาพรวม):</label>
                <input
                  type="text"
                  value={themeDraft.menuDashboard}
                  onChange={(e) => setThemeDraft({ ...themeDraft, menuDashboard: e.target.value })}
                  className="w-full h-8.5 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">เมนูลำดับที่ 2 (ทะเบียนกิจการ):</label>
                <input
                  type="text"
                  value={themeDraft.menuBusinessList}
                  onChange={(e) => setThemeDraft({ ...themeDraft, menuBusinessList: e.target.value })}
                  className="w-full h-8.5 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">เมนูลำดับที่ 3 (การตั้งค่า):</label>
                <input
                  type="text"
                  value={themeDraft.menuSettings}
                  onChange={(e) => setThemeDraft({ ...themeDraft, menuSettings: e.target.value })}
                  className="w-full h-8.5 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section: Table Column Headers (หัวข้อคอลัมน์ย่อยๆ ในตาราง) */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">view_column</span>
                <span>แก้ไขชื่อหัวข้อคอลัมน์ในตาราง (Table Column Headers)</span>
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                กำหนดชื่อหัวตารางทุกคอลัมน์ตามคำศัพท์ที่ทีมงานคุ้นเคย
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์ลำดับ:</label>
                <input
                  type="text"
                  value={themeDraft.colSeq}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colSeq: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์ชื่อกิจการ:</label>
                <input
                  type="text"
                  value={themeDraft.colName}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colName: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์เลขผู้เสียภาษี:</label>
                <input
                  type="text"
                  value={themeDraft.colTaxId}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colTaxId: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์ประเภท:</label>
                <input
                  type="text"
                  value={themeDraft.colType}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colType: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์แจ้งผู้สอบ:</label>
                <input
                  type="text"
                  value={themeDraft.colAuditor}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colAuditor: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์เลขภาษี/รหัสผ่าน:</label>
                <input
                  type="text"
                  value={themeDraft.colPassword}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colPassword: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์รหัส e-Filing:</label>
                <input
                  type="text"
                  value={themeDraft.colEfiling}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colEfiling: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์ประกันสังคม:</label>
                <input
                  type="text"
                  value={themeDraft.colSso}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colSso: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์สถานะ:</label>
                <input
                  type="text"
                  value={themeDraft.colStatus}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colStatus: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#52525b]">คอลัมน์การจัดการ:</label>
                <input
                  type="text"
                  value={themeDraft.colAction}
                  onChange={(e) => setThemeDraft({ ...themeDraft, colAction: e.target.value })}
                  className="w-full h-8 px-2.5 mt-0.5 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section: Status Labels (ชื่อป้ายสถานะ) */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">label</span>
                <span>แก้ไขชื่อป้ายสถานะการดำเนินงาน (Status Labels)</span>
              </h2>
              <p className="text-xs text-[#71717a] mt-0.5">
                กำหนดคำที่ใช้เรียกสถานะทั้ง 3 ระดับในระบบ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <XpStatusSphere status="pending" size={10} />
                  <span>สถานะรอดำเนินการ:</span>
                </div>
                <input
                  type="text"
                  value={themeDraft.statusPending}
                  onChange={(e) => setThemeDraft({ ...themeDraft, statusPending: e.target.value })}
                  className="w-full h-8 px-2.5 mt-1 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-sky-50/50 border border-sky-200 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                  <XpStatusSphere status="in_progress" size={10} />
                  <span>สถานะกำลังทำ:</span>
                </div>
                <input
                  type="text"
                  value={themeDraft.statusInProgress}
                  onChange={(e) => setThemeDraft({ ...themeDraft, statusInProgress: e.target.value })}
                  className="w-full h-8 px-2.5 mt-1 bg-white border border-sky-300 rounded-lg text-xs font-semibold text-sky-900 outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <XpStatusSphere status="completed" size={10} />
                  <span>สถานะเสร็จสิ้น:</span>
                </div>
                <input
                  type="text"
                  value={themeDraft.statusCompleted}
                  onChange={(e) => setThemeDraft({ ...themeDraft, statusCompleted: e.target.value })}
                  className="w-full h-8 px-2.5 mt-1 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER DATA EDITOR */}
      {activeTab === 'master-data' && (
        <div className="flex flex-col gap-4">
          {/* Action & Year Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#e4e4e7] shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#71717a] flex items-center gap-1">
                <XpCalendarIcon size={14} />
                <span>รอบปีที่จัดการ:</span>
              </span>
              <div className="flex items-center gap-1">
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setActiveYear(yr);
                      onSelectYear(yr);
                    }}
                    style={{
                      backgroundColor: yr === activeYear ? config.primaryColor : undefined,
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      yr === activeYear
                        ? 'text-white shadow-2xs'
                        : 'bg-[#f4f4f5] text-[#18181b] hover:bg-[#ebebeb]'
                    }`}
                  >
                    ปี {yr}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-[#e4e4e7] mx-1 hidden sm:block" />

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="ค้นหาทุกฟิลด์ในหลังบ้าน..."
                  className="w-48 sm:w-64 h-8 pl-7 pr-2.5 bg-[#fafafa] border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-[#71717a]">
                  search
                </span>
              </div>
            </div>

            {/* Bulk tool buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handleAddNewRow}
                style={{ backgroundColor: config.primaryColor }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>เพิ่มแถวใหม่</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFindReplace(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium cursor-pointer shadow-2xs"
                title="ค้นหาและแทนที่ข้อความทั้งหมดในฟิลด์ที่เลือก"
              >
                <span className="material-symbols-outlined text-[15px] text-amber-600">find_replace</span>
                <span>ค้นหาและแทนที่</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBatchStatus(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium cursor-pointer shadow-2xs"
                title="ปรับเปลี่ยนสถานะของกิจการพร้อมกันทั้งชุด"
              >
                <span className="material-symbols-outlined text-[15px] text-sky-600">published_with_changes</span>
                <span>เปลี่ยนสถานะชุด</span>
              </button>

              <button
                type="button"
                onClick={handleAutoResequence}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium cursor-pointer shadow-2xs"
                title="จัดเรียงลำดับใหม่ 1, 2, 3... อัตโนมัติ"
              >
                <span className="material-symbols-outlined text-[15px] text-emerald-600">format_list_numbered</span>
                <span>เรียงลำดับ 1..N</span>
              </button>
            </div>
          </div>

          {/* Master Edit Table */}
          <div className="border border-[#e4e4e7] rounded-xl bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f4f4f5] z-10 select-none text-[#52525b] border-b border-[#e4e4e7]">
                  <tr>
                    <th className="py-2.5 px-3 w-16">{config.colSeq || 'ลำดับ'}</th>
                    <th className="py-2.5 px-3 w-36 font-mono">{config.colTaxId || 'เลขผู้เสียภาษี'}</th>
                    <th className="py-2.5 px-3 min-w-[200px]">{config.colName || 'ชื่อกิจการ'}</th>
                    <th className="py-2.5 px-3 w-28">{config.colType || 'ประเภท'}</th>
                    <th className="py-2.5 px-3 w-32">{config.colAuditor || 'แจ้งผู้สอบ'}</th>
                    <th className="py-2.5 px-3 w-32 font-mono">{config.colPassword || 'เลขภาษี / รหัสผ่าน'}</th>
                    <th className="py-2.5 px-3 w-32 font-mono">{config.colEfiling || 'รหัส e-Filing'}</th>
                    <th className="py-2.5 px-3 w-32 font-mono">{config.colSso || 'ประกันสังคม'}</th>
                    <th className="py-2.5 px-3 w-28">{config.colStatus || 'สถานะ'}</th>
                    <th className="py-2.5 px-3 min-w-[150px]">หมายเหตุ</th>
                    <th className="py-2.5 px-3 w-24 text-right sticky right-0 bg-[#f4f4f5] shadow-xs">
                      {config.colAction || 'จัดการ'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f4f4f5]">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-[#71717a]">
                        ไม่พบข้อมูลในรอบปี {activeYear} (คลิก &quot;เพิ่มแถวใหม่&quot; เพื่อเริ่มบันทึกข้อมูล)
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((record) => {
                      const isEditing = editingRowId === record.id;
                      const draft = isEditing && rowDraft ? rowDraft : record;

                      if (isEditing && rowDraft) {
                        return (
                          <tr key={record.id} className="bg-amber-50/70 border-2 border-amber-400">
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.sequenceNo}
                                onChange={(e) => setRowDraft({ ...draft, sequenceNo: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.taxId}
                                onChange={(e) => setRowDraft({ ...draft, taxId: e.target.value })}
                                placeholder="เลข 13 หลัก"
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.companyName}
                                onChange={(e) => setRowDraft({ ...draft, companyName: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded text-xs font-semibold"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={draft.type}
                                onChange={(e) => setRowDraft({ ...draft, type: e.target.value as BusinessType })}
                                className="w-full h-8 px-1.5 bg-white border border-amber-300 rounded text-xs"
                              >
                                <option value="company">บริษัทจำกัด</option>
                                <option value="partnership">ห้างหุ้นส่วน</option>
                                <option value="individual">บุคคลธรรมดา</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.auditorDate}
                                onChange={(e) => setRowDraft({ ...draft, auditorDate: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.password}
                                onChange={(e) => setRowDraft({ ...draft, password: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.eFilingCode}
                                onChange={(e) => setRowDraft({ ...draft, eFilingCode: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.ssoCode}
                                onChange={(e) => setRowDraft({ ...draft, ssoCode: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded font-mono text-xs"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={draft.status}
                                onChange={(e) => setRowDraft({ ...draft, status: e.target.value as BusinessStatus })}
                                className="w-full h-8 px-1.5 bg-white border border-amber-300 rounded text-xs"
                              >
                                <option value="pending">{config.statusPending || 'รอดำเนินการ'}</option>
                                <option value="in_progress">{config.statusInProgress || 'กำลังทำ'}</option>
                                <option value="completed">{config.statusCompleted || 'เสร็จสิ้น'}</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={draft.remark}
                                onChange={(e) => setRowDraft({ ...draft, remark: e.target.value })}
                                className="w-full h-8 px-2 bg-white border border-amber-300 rounded text-xs"
                              />
                            </td>
                            <td className="p-1 text-right sticky right-0 bg-amber-50/90 shadow-xs">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={saveEditRow}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                                  title="บันทึก"
                                >
                                  บันทึก
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditRow}
                                  className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded text-[11px] cursor-pointer"
                                  title="ยกเลิก"
                                >
                                  ยกเลิก
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={record.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-2 px-3 font-mono text-[#71717a]">{record.sequenceNo}</td>
                          <td className="py-2 px-3 font-mono font-medium text-[#18181b]">{record.taxId || '-'}</td>
                          <td className="py-2 px-3 font-semibold text-[#18181b]">{record.companyName}</td>
                          <td className="py-2 px-3 text-[#71717a]">
                            {record.type === 'company'
                              ? 'บริษัทจำกัด'
                              : record.type === 'partnership'
                              ? 'ห้างหุ้นส่วน'
                              : 'บุคคลธรรมดา'}
                          </td>
                          <td className="py-2 px-3 text-[#71717a]">{record.auditorDate || '-'}</td>
                          <td className="py-2 px-3 font-mono">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-zinc-400 font-sans">
                                เลขภาษี: {record.taxId || '-'}
                              </span>
                              <span className="font-semibold text-zinc-900">{record.password || '-'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono text-[#71717a]">{record.eFilingCode || '-'}</td>
                          <td className="py-2 px-3 font-mono text-[#71717a]">{record.ssoCode || '-'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium border ${
                                record.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : record.status === 'in_progress'
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <XpStatusSphere status={record.status} size={8} />
                              <span>
                                {record.status === 'completed'
                                  ? config.statusCompleted || 'เสร็จสิ้น'
                                  : record.status === 'in_progress'
                                  ? config.statusInProgress || 'กำลังทำ'
                                  : config.statusPending || 'รอดำเนินการ'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#71717a] truncate max-w-48">{record.remark || '-'}</td>
                          <td className="py-2 px-3 text-right sticky right-0 bg-white shadow-xs">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startEditRow(record)}
                                className="p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer"
                                title="แก้ไขแถวนี้"
                              >
                                <XpEditIcon size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(record.id, record.companyName)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="ลบแถวนี้"
                              >
                                <XpTrashIcon size={14} />
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

            <div className="p-3 bg-[#fafafa] border-t border-[#e4e4e7] flex items-center justify-between text-xs text-[#71717a]">
              <span>
                แสดง {filteredList.length} รายการ (จากทั้งหมด {currentList.length} รายการในปี {activeYear})
              </span>
              <span className="font-mono text-[11px]">
                คลิกไอคอนดินสอ ✏️ เพื่อแก้ไขข้อมูลแบบสดในตารางได้ทุกฟิลด์
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & ACCESS CONTROL */}
      {activeTab === 'users' && (
        <div className="flex flex-col gap-4 max-w-4xl">
          {/* Add User Form */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs">
            <h2 className="text-xs font-bold text-[#18181b] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">person_add</span>
              <span>เพิ่มอีเมลทีมงานที่ได้รับอนุญาต (Add Allowed User)</span>
            </h2>
            <p className="text-[11.5px] text-[#71717a] mt-0.5 mb-3">
              เฉพาะอีเมลที่อยู่ในรายชื่อนี้เท่านั้นจึงจะสามารถเข้าสู่ระบบและใช้งานระบบได้
            </p>

            <form onSubmit={handleAddAllowedUser} className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="email"
                required
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="อีเมล เช่น member@company.com"
                className="flex-1 w-full h-9 px-3 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
              />
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="w-full sm:w-36 h-9 px-2 bg-white border border-[#e4e4e7] rounded-lg text-xs font-medium outline-none focus:border-amber-500"
              >
                <option value="member">สิทธิ์ Member</option>
                <option value="admin">สิทธิ์ Admin</option>
              </select>
              <button
                type="submit"
                style={{ backgroundColor: config.primaryColor }}
                className="w-full sm:w-auto h-9 px-4 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
              >
                เพิ่มสิทธิ์เข้าใช้งาน
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div className="border border-[#e4e4e7] rounded-xl bg-white overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between">
              <span className="text-xs font-bold text-[#18181b]">
                รายชื่ออีเมลที่ได้รับอนุญาต ({allowedUsers.length} บัญชี)
              </span>
              <button
                type="button"
                onClick={() => void fetchUsers()}
                disabled={loadingUsers}
                className="p-1 text-[#71717a] hover:text-[#18181b] cursor-pointer"
                title="รีเฟรชรายชื่อ"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
            </div>

            <div className="divide-y divide-[#f4f4f5]">
              {allowedUsers.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#71717a]">
                  กำลังโหลดรายชื่อผู้ใช้ หรือยังไม่มีบัญชีในระบบ...
                </div>
              ) : (
                allowedUsers.map((u) => {
                  const isCurrent = u.email.toLowerCase() === currentUserName.toLowerCase();
                  return (
                    <div
                      key={u.email}
                      className="p-3.5 flex items-center justify-between hover:bg-[#fafafa] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: config.primaryColor }}
                          className="w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs"
                        >
                          {u.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#18181b] font-mono">{u.email}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                                บัญชีปัจจุบัน
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-[#71717a]">
                            สร้างเมื่อ: {new Date(u.created_at || Date.now()).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                            u.role === 'admin'
                              ? 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>

                        <button
                          type="button"
                          onClick={() => void handleDeleteAllowedUser(u.email)}
                          className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                          title="ลบสิทธิ์ผู้ใช้"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BRANDING & MONOGRAM */}
      {activeTab === 'branding' && (
        <div className="flex flex-col gap-4 max-w-3xl">
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">badge</span>
                <span>ปรับแต่งชื่อระบบ & ข้อความแบรนด์ (Branding Settings)</span>
              </h2>
              <p className="text-[11.5px] text-[#71717a] mt-0.5">
                แก้ไขข้อความส่วนหัวของระบบ ป้ายชื่อ และประกาศแจ้งเตือนที่จะแสดงในแอปพลิเคชัน
              </p>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-[#52525b]">ชื่อระบบ (System App Name)</label>
                <input
                  type="text"
                  value={themeDraft.appName}
                  onChange={(e) => setThemeDraft({ ...themeDraft, appName: e.target.value })}
                  placeholder="เช่น Mustang Directory"
                  className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">คำอธิบายระบบ (System Tagline)</label>
                <input
                  type="text"
                  value={themeDraft.appTagline}
                  onChange={(e) => setThemeDraft({ ...themeDraft, appTagline: e.target.value })}
                  placeholder="เช่น ระบบบริหารจัดการนิติบุคคลและทะเบียนกิจการ"
                  className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#52525b]">อักษรย่อไอคอน (Initial Monogram)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={themeDraft.appInitial}
                    onChange={(e) => setThemeDraft({ ...themeDraft, appInitial: e.target.value.toUpperCase() })}
                    placeholder="M"
                    className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-bold uppercase outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <div
                    style={{ backgroundColor: themeDraft.primaryColor }}
                    className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs"
                  >
                    {themeDraft.appInitial || 'M'}
                  </div>
                  <span className="text-xs text-[#71717a]">ตัวอย่างป้ายโลโก้</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">
                  ข้อความประกาศระบบ (System Notice / Banner)
                </label>
                <textarea
                  value={themeDraft.systemNotice}
                  onChange={(e) => setThemeDraft({ ...themeDraft, systemNotice: e.target.value })}
                  placeholder="ข้อความแจ้งเตือนที่ต้องการให้ทีมงานเห็น (หากเว้นว่างไว้จะไม่แสดง)"
                  rows={2}
                  className="w-full p-2.5 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveTitlesAndTheme}
                  style={{ backgroundColor: themeDraft.primaryColor }}
                  className="px-4 py-2 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  บันทึกการตั้งค่าแบรนด์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DATABASE MAINTENANCE & DISASTER RECOVERY */}
      {activeTab === 'maintenance' && (
        <div className="flex flex-col gap-4 max-w-3xl">
          {/* Master Backup Card */}
          <div className="border border-[#e4e4e7] rounded-xl p-5 bg-white shadow-2xs flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-bold text-[#18181b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">cloud_download</span>
                <span>สำรองและกู้คืนฐานข้อมูลรวมทุกรอบปี (Full Master Backup & Restore)</span>
              </h2>
              <p className="text-[11.5px] text-[#71717a] mt-0.5">
                สำรองข้อมูลครบทุกปีบัญชีในไฟล์เดียว หรือกู้คืนฐานข้อมูลทั้งหมดในกรณีฉุกเฉิน
              </p>
            </div>

            <div className="p-3 bg-[#fafafa] border border-[#e4e4e7] rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">รอบปีในระบบปัจจุบัน:</span>
                <span className="font-mono font-bold text-[#18181b]">{availableYears.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717a]">จำนวนรายการรวมทั้งหมด:</span>
                <span className="font-mono font-bold text-[#18181b]">
                  {Object.values(recordsByYear)
                    .reduce((acc, curr) => acc + curr.length, 0)
                    .toLocaleString()}{' '}
                  รายการ
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportAllYears}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] text-xs font-semibold text-[#18181b] transition-colors cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>ส่งออกข้อมูลทุกปี (Master JSON Backup)</span>
              </button>

              <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white border border-[#e4e4e7] hover:bg-[#f4f4f5] text-xs font-semibold text-[#18181b] transition-colors cursor-pointer shadow-2xs">
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>กู้คืนข้อมูลทุกปี (Restore JSON)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreAllYears}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border border-rose-200 rounded-xl p-5 bg-rose-50/50 flex flex-col gap-3">
            <div>
              <h2 className="text-xs font-bold text-rose-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>เขตอันตราย: ล้างข้อมูลเฉพาะรอบปี {activeYear} (Clear Year Data)</span>
              </h2>
              <p className="text-[11.5px] text-rose-700/80 mt-0.5">
                การล้างข้อมูลจะลบรายการกิจการทั้งหมดเฉพาะในปี {activeYear} (แนะนำให้สำรองข้อมูลก่อนทำรายการ)
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={handleClearCurrentYear}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                ล้างข้อมูลเฉพาะปี {activeYear} ทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Find & Replace Modal */}
      {showFindReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-[#e4e4e7] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f4f4f5]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">find_replace</span>
                <h3 className="text-sm font-bold text-[#18181b]">ค้นหาและแทนที่คำ (ปี {activeYear})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#18181b]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-[#52525b]">เลือกฟิลด์ที่ต้องการแทนที่คำ</label>
                <select
                  value={findField}
                  onChange={(e) => setFindField(e.target.value as keyof BusinessRecord)}
                  className="w-full h-8.5 px-2.5 mt-1 bg-white border border-[#e4e4e7] rounded-lg outline-none focus:border-amber-500"
                >
                  <option value="auditorDate">วันที่แจ้งผู้สอบ / ชื่อผู้สอบ (auditorDate)</option>
                  <option value="remark">หมายเหตุ (remark)</option>
                  <option value="topic">หมวดหมู่ / Topic (topic)</option>
                  <option value="companyName">ชื่อกิจการ (companyName)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">คำเดิมที่ต้องการค้นหา</label>
                <input
                  type="text"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="เช่น น้องมิล"
                  className="w-full h-8.5 px-2.5 mt-1 bg-white border border-[#e4e4e7] rounded-lg outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52525b]">คำใหม่ที่ต้องการแทนที่</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="เช่น ผู้สอบบัญชี ม.ค. 69"
                  className="w-full h-8.5 px-2.5 mt-1 bg-white border border-[#e4e4e7] rounded-lg outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f4f4f5]">
              <button
                type="button"
                onClick={() => setShowFindReplace(false)}
                className="px-3 py-1.5 rounded-lg border border-[#e4e4e7] text-xs font-medium text-[#71717a] hover:bg-[#f4f4f5]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeFindReplace}
                style={{ backgroundColor: config.primaryColor }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                ดำเนินการแทนที่คำ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Status Modal */}
      {showBatchStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-[#e4e4e7] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f4f4f5]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600">published_with_changes</span>
                <h3 className="text-sm font-bold text-[#18181b]">เปลี่ยนสถานะชุด (ปี {activeYear})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchStatus(false)}
                className="p-1 rounded text-[#71717a] hover:text-[#18181b]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#71717a]">
              เลือกสถานะใหม่ที่ต้องการกำหนดให้กิจการทั้งหมดในรอบปี {activeYear} (จำนวน {currentList.length} รายการ)
            </p>

            <div className="flex flex-col gap-2">
              {[
                { value: 'pending', label: config.statusPending || 'รอดำเนินการ', color: 'bg-amber-500' },
                { value: 'in_progress', label: config.statusInProgress || 'กำลังทำ', color: 'bg-sky-500' },
                { value: 'completed', label: config.statusCompleted || 'เสร็จสิ้น', color: 'bg-emerald-500' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setBatchStatusValue(s.value as BusinessStatus)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
                    batchStatusValue === s.value
                      ? 'border-neutral-900 bg-[#18181b] text-white shadow-xs'
                      : 'border-[#e4e4e7] bg-white text-[#71717a] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f4f4f5]">
              <button
                type="button"
                onClick={() => setShowBatchStatus(false)}
                className="px-3 py-1.5 rounded-lg border border-[#e4e4e7] text-xs font-medium text-[#71717a] hover:bg-[#f4f4f5]"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeBatchStatus}
                style={{ backgroundColor: config.primaryColor }}
                className="px-3.5 py-1.5 rounded-lg text-white text-xs font-semibold cursor-pointer shadow-2xs"
              >
                ยืนยันเปลี่ยนสถานะ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
