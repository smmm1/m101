import React, { useState, useEffect } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { inferBusinessType } from '../utils/thaiDate';
import { useSystemConfig } from '../context/SystemConfigContext';

interface EditBusinessModalProps {
  record: BusinessRecord | null;
  onClose: () => void;
  onSave: (record: BusinessRecord) => void;
  onShowToast: (msg: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

export const EditBusinessModal: React.FC<EditBusinessModalProps> = ({
  record,
  onClose,
  onSave,
  onShowToast,
}) => {
  const { config } = useSystemConfig();
  const [sequenceNo, setSequenceNo] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState<BusinessType>('company');
  const [auditorDate, setAuditorDate] = useState('');
  const [password, setPassword] = useState('');
  const [remark, setRemark] = useState('');
  const [eFilingCode, setEFilingCode] = useState('');
  const [ssoCode, setSsoCode] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<BusinessStatus>('pending');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (record) {
      setSequenceNo(record.sequenceNo || '');
      setTaxId(record.taxId || '');
      setCompanyName(record.companyName || '');
      setType(record.type || inferBusinessType(record.companyName || ''));
      setAuditorDate(record.auditorDate || '');
      setPassword(record.password || '');
      setRemark(record.remark || '');
      setEFilingCode(record.eFilingCode || '');
      setSsoCode(record.ssoCode || '');
      setTopic(record.topic || record.sourceFileName || '');
      setStatus(record.status || 'pending');
      setFormError('');
    }
  }, [record]);

  if (!record) return null;

  const handleCompanyNameChange = (val: string) => {
    setCompanyName(val);
    const inferred = inferBusinessType(val);
    setType(inferred);
  };

  const getStatusBadge = (s: BusinessStatus) => {
    switch (s) {
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

  const currentBadge = getStatusBadge(status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!companyName.trim()) {
      setFormError('กรุณากรอกชื่อกิจการ');
      return;
    }

    const updatedRecord: BusinessRecord = {
      ...record,
      sequenceNo: sequenceNo.trim(),
      taxId: taxId.trim(),
      companyName: companyName.trim(),
      type,
      auditorDate: auditorDate.trim(),
      password: password.trim(),
      remark: remark.trim(),
      eFilingCode: eFilingCode.trim(),
      ssoCode: ssoCode.trim(),
      topic: topic.trim() || 'บันทึกข้อมูลเอง',
      status,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedRecord);
    onShowToast(`อัปเดตข้อมูล ${companyName.trim()} เรียบร้อย`, 'บันทึกสำเร็จ', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog matching BusinessDetailModal dimensions & design */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150 font-body flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
              <span className="material-symbols-outlined text-[22px]">edit_note</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {type === 'partnership' ? 'ห้างหุ้นส่วนจำกัด' : 'บริษัทจำกัด'}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-mono">
                  ลำดับ #{sequenceNo || '-'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate font-headline leading-tight">
                แก้ไขข้อมูล: {companyName || 'ระบุชื่อกิจการ'}
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* 1. Status Bar & Fast Switcher */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">สถานะการดำเนินงาน:</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${currentBadge.bg}`}>
                <span className={`w-2 h-2 rounded-full ${currentBadge.dot}`} />
                <span>{currentBadge.label}</span>
              </span>
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5">
              {(['pending', 'in_progress', 'completed'] as BusinessStatus[]).map((s) => {
                const b = getStatusBadge(s);
                const isCurrent = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                    <span>{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Primary Tax & Legal Information */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">badge</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                ข้อมูลนิติบุคคลและผู้เสียภาษี
              </h3>
            </div>

            {/* Company Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="ระบุชื่อนิติบุคคล"
                className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Sequence No */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block font-mono">
                  ลำดับ
                </label>
                <input
                  type="text"
                  value={sequenceNo}
                  onChange={(e) => setSequenceNo(e.target.value)}
                  placeholder="เช่น 01"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block font-mono">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="เช่น 0105500000000"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  ประเภทนิติบุคคล
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as BusinessType)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-amber-500 transition-all shadow-2xs cursor-pointer"
                >
                  <option value="company">บริษัทจำกัด (บจก.)</option>
                  <option value="partnership">ห้างหุ้นส่วนจำกัด (หจก.)</option>
                  <option value="individual">บุคคลธรรมดา</option>
                </select>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block font-mono">
                  รหัสผ่าน (Password)
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่าน e-Filing"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>

              {/* e-Filing Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block font-mono">
                  รหัสยื่น e-Filing
                </label>
                <input
                  type="text"
                  value={eFilingCode}
                  onChange={(e) => setEFilingCode(e.target.value)}
                  placeholder="ระบุรหัสยื่น"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>

              {/* SSO Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block font-mono">
                  รหัสประกันสังคม (สปส.)
                </label>
                <input
                  type="text"
                  value={ssoCode}
                  onChange={(e) => setSsoCode(e.target.value)}
                  placeholder="ระบุรหัส สปส."
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
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
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  วันที่แจ้งผู้สอบบัญชี / ผู้สอบบัญชี
                </label>
                <input
                  type="text"
                  value={auditorDate}
                  onChange={(e) => setAuditorDate(e.target.value)}
                  placeholder="ระบุวันที่แจ้ง หรือชื่อผู้สอบบัญชี"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  หมายเหตุ / รหัสใหม่
                </label>
                <input
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม"
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* 5. Source File and Topic */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-amber-500">history</span>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-headline">
                ข้อมูลการนำเข้าและหัวข้อ
              </h3>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                ชุดข้อมูล / หัวข้อ / ที่มาไฟล์
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น ชุดไฟล์นำเข้าปี 69, บันทึกข้อมูลเอง"
                className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons in Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
