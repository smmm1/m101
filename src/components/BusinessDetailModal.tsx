import React, { useState, useEffect } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { useSystemConfig } from '../context/SystemConfigContext';

interface BusinessDetailModalProps {
  record: BusinessRecord | null;
  onClose: () => void;
  onEdit: (record: BusinessRecord) => void;
  onDelete: (id: string) => void;
  onStatusChange: (record: BusinessRecord, status: BusinessStatus) => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onShowToast,
}) => {
  const { config } = useSystemConfig();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<BusinessRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({ ...record });
      setIsEditing(false);
    }
  }, [record]);

  if (!record || !formData) return null;

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ', 'success', 2000);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = () => {
    onEdit(formData);
    onShowToast(`อัปเดตข้อมูล ${formData.companyName} เรียบร้อย`, 'บันทึกสำเร็จ', 'success', 3000);
    setIsEditing(false);
    onClose();
  };

  const getStatusBadge = (status: BusinessStatus) => {
    switch (status) {
      case 'completed': return { bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80', dot: 'bg-emerald-500', label: config.statusCompleted || 'เสร็จสิ้น' };
      case 'in_progress': return { bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80', dot: 'bg-amber-500', label: config.statusInProgress || 'กำลังทำ' };
      case 'pending':
      default: return { bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/80', dot: 'bg-rose-500', label: config.statusPending || 'รอดำเนินการ' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#12141c] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 dark:text-white truncate font-headline">{isEditing ? 'แก้ไขข้อมูล: ' + formData.companyName : formData.companyName}</h2>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto no-scrollbar">
          {isEditing ? (
            <div className="space-y-3">
               <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">ชื่อกิจการ</label>
                  <input value={formData.companyName} onChange={e => setFormData(p => ({...p!, companyName: e.target.value}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">เลขภาษี</label>
                  <input value={formData.taxId} onChange={e => setFormData(p => ({...p!, taxId: e.target.value}))} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs" />
               </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(formData.status).bg}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusBadge(formData.status).dot}`} />
                  <span>{getStatusBadge(formData.status).label}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {(['pending', 'in_progress', 'completed'] as BusinessStatus[]).map(s => (
                    <button key={s} type="button" onClick={() => { onStatusChange(record, s); onShowToast(`เปลี่ยนสถานะเป็น ${getStatusBadge(s).label}`, 'บันทึกสำเร็จ', 'success', 2000); onClose(); }} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border dark:border-zinc-700">{getStatusBadge(s).label}</button>
                  ))}
                </div>
              </div>
              {/* ... other view details ... */}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
           {isEditing ? (
             <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">บันทึก</button>
           ) : (
             <button onClick={() => setIsEditing(true)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">แก้ไข</button>
           )}
        </div>
      </div>
    </div>
  );
};
