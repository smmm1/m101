import React, { useState, useEffect } from 'react';
import { BusinessRecord, BusinessStatus } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';
import { formatThaiTaxId, getThaiFormattedDate } from '../utils/thaiDate';

interface BusinessDetailModalProps {
  record: BusinessRecord | null;
  onClose: () => void;
  onEdit: (record: BusinessRecord) => void;
  onDelete: (id: string) => void;
  onStatusChange: (record: BusinessRecord, status: BusinessStatus) => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
  isLoggedIn: boolean;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  record: initialRecord,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onShowToast,
  isLoggedIn,
}) => {
  const { config } = useSystemConfig();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [record, setRecord] = useState<BusinessRecord | null>(initialRecord);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setRecord(initialRecord);
  }, [initialRecord]);

  if (!record) return null;

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ', 'success', 2000);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: BusinessStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          label: config.statusCompleted || 'เสร็จสิ้น',
        };
      case 'in_progress':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
          dot: 'bg-amber-500',
          label: config.statusInProgress || 'กำลังทำ',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800',
          dot: 'bg-rose-500',
          label: config.statusPending || 'รอดำเนินการ',
        };
    }
  };

  const currentBadge = getStatusBadge(record.status);
  const formattedTax = record.taxId ? formatThaiTaxId(record.taxId) : '-';

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return getThaiFormattedDate(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150 font-body flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
              <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {record.type === 'partnership' ? 'ห้างหุ้นส่วนจำกัด' : 'บริษัทจำกัด'}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-mono">
                  ลำดับ #{record.sequenceNo || '-'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate font-headline leading-tight">
                {record.companyName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="ปิดหน้าต่าง"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
          {/* 1. Status Bar & Fast Switcher */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">สถานะปัจจุบัน:</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${currentBadge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${currentBadge.dot}`} />
                <span>{currentBadge.label}</span>
              </span>
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5">
              {(['pending', 'in_progress', 'completed'] as BusinessStatus[]).map((s) => {
                const b = getStatusBadge(s);
                const isCurrent = record.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => {
                      if (!isCurrent) {
                        const updated = { ...record, status: s, updatedAt: new Date().toISOString() };
                        setRecord(updated);
                        onStatusChange(record, s);
                        onShowToast(`เปลี่ยนสถานะเป็น ${b.label}`, 'บันทึกสำเร็จ', 'success', 2000);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                    } ${!isLoggedIn ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                    <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Primary Tax & Registration Information */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">badge</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                ข้อมูลนิติบุคคลและผู้เสียภาษี
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tax ID */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                    {isLoggedIn ? formattedTax : `${record.taxId.slice(0, 4)}*********`}
                  </span>
                  {isLoggedIn && record.taxId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.taxId, 'เลขผู้เสียภาษี', 'taxId')}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === 'taxId' ? 'check' : 'content_copy'}
                      </span>
                      <span>{copiedKey === 'taxId' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Type & Sequence */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  ประเภทนิติบุคคล / ลำดับ
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {record.type === 'partnership' ? 'ห้างหุ้นส่วนจำกัด' : 'บริษัทจำกัด'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-mono font-bold">
                    ลำดับ {record.sequenceNo || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Credentials & Filing Codes (e-Filing, Password, SSO) */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">key</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                รหัสผ่านและข้อมูลการยื่นแบบ
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Password */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  รหัสผ่าน (Password)
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono truncate">
                    {isLoggedIn ? (record.password || '-') : '********'}
                  </span>
                  {isLoggedIn && record.password && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.password, 'รหัสผ่าน', 'password')}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      title="คัดลอกรหัสผ่าน"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedKey === 'password' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* e-Filing Code */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  รหัสยื่น e-Filing
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono truncate">
                    {isLoggedIn ? (record.eFilingCode || '-') : '********'}
                  </span>
                  {isLoggedIn && record.eFilingCode && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.eFilingCode, 'รหัส e-Filing', 'efiling')}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      title="คัดลอกรหัส e-Filing"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedKey === 'efiling' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* SSO Code */}
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  รหัสประกันสังคม (สปส.)
                </span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white font-mono truncate">
                    {isLoggedIn ? (record.ssoCode || '-') : '********'}
                  </span>
                  {isLoggedIn && record.ssoCode && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.ssoCode, 'รหัสประกันสังคม', 'sso')}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:text-amber-600 dark:hover:text-amber-400 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
                      title="คัดลอกรหัสประกันสังคม"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedKey === 'sso' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Auditor & Remarks */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">description</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                ข้อมูลผู้สอบบัญชีและหมายเหตุ
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  วันที่แจ้งผู้สอบบัญชี / ผู้สอบบัญชี
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {record.auditorDate || '-'}
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  หมายเหตุ / รหัสใหม่
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {record.remark || '-'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Source File and Meta Timestamps */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">history</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                ข้อมูลการนำเข้าและประวัติบันทึก
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400 font-mono font-bold">ชุดข้อมูล / หัวข้อ:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {record.topic || record.sourceFileName || 'บันทึกข้อมูลเอง'}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400 font-mono font-bold">วันที่สร้าง:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatDisplayDate(record.createdAt)}
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400 font-mono font-bold">อัปเดตล่าสุด:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {formatDisplayDate(record.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {isLoggedIn && (
            <div className="flex items-center gap-2">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">ยืนยันลบกิจการนี้?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(record.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    ยืนยันลบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>ลบรายการนี้</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            {isLoggedIn && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(record);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>แก้ไขข้อมูล</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
