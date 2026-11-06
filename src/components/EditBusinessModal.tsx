import React, { useState, useEffect } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { inferBusinessType } from '../utils/thaiDate';
import { useSystemConfig } from '../context/SystemConfigContext';
import { DSBadge, DSButton, DSInput, DSSelect } from '../design-system/components';

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
    <div className="m101-dialog-overlay ds-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* Backdrop */}
      <div className="ds-modal-backdrop fixed inset-0" onClick={onClose} />

      {/* Modal Dialog matching BusinessDetailModal dimensions & design */}
      <div className="relative m101-dialog-panel ds-form-modal w-full max-w-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="m101-dialog-header ds-modal-header ds-form-modal__header px-6 py-5 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="ds-modal-icon shrink-0">
              <span className="material-symbols-outlined text-[22px]">edit_note</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  {type === 'partnership' ? 'ห้างหุ้นส่วนจำกัด' : 'บริษัทจำกัด'}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  ลำดับ #{sequenceNo || '-'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate font-headline leading-tight">
                แก้ไขข้อมูล: {companyName || 'ระบุชื่อกิจการ'}
              </h2>
            </div>
          </div>

          <DSButton
            type="button"
            onClick={onClose}
            variant="ghost" className="ds-icon-button flex items-center justify-center shrink-0"
            title="ปิดหน้าต่าง"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </DSButton>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="ds-form-modal__body p-6 space-y-5 overflow-y-auto no-scrollbar flex-1">
          {formError && (
            <div className="ds-form-error p-3.5 flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* 1. Status Bar & Fast Switcher */}
          <div className="ds-form-status-row p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">สถานะการดำเนินงาน:</span>
              <DSBadge variant={status === 'completed' ? 'success' : status === 'in_progress' ? 'info' : 'warning'}>
                <span className={`w-2 h-2 rounded-full ${currentBadge.dot}`} />
                {currentBadge.label}
              </DSBadge>
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5">
              {(['pending', 'in_progress', 'completed'] as BusinessStatus[]).map((s) => {
                const b = getStatusBadge(s);
                const isCurrent = status === s;
                return (
                  <DSButton
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    variant={isCurrent ? 'primary' : 'secondary'} className="ds-status-option"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
                    <span>{b.label}</span>
                  </DSButton>
                );
              })}
            </div>
          </div>

          {/* 2. Primary Tax & Legal Information */}
          <div className="ds-form-section p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">badge</span>
              <h3 className="ds-form-section__title">
                ข้อมูลนิติบุคคลและผู้เสียภาษี
              </h3>
            </div>

            {/* Company Name */}
            <div>
              <label className="ds-label">
                ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-rose-500">*</span>
              </label>
              <DSInput
                type="text"
                value={companyName}
                onChange={(e) => handleCompanyNameChange(e.target.value)}
                placeholder="ระบุชื่อนิติบุคคล"
                className="ds-field"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Sequence No */}
              <div>
                <label className="ds-label ds-label--mono">
                  ลำดับ
                </label>
                <DSInput
                  type="text"
                  value={sequenceNo}
                  onChange={(e) => setSequenceNo(e.target.value)}
                  placeholder="เช่น 01"
                  className="ds-field ds-field--mono"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="ds-label ds-label--mono">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </label>
                <DSInput
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="เช่น 0105500000000"
                  className="ds-field ds-field--mono"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="ds-label">
                  ประเภทนิติบุคคล
                </label>
                <DSSelect
                  value={type}
                  onChange={(e) => setType(e.target.value as BusinessType)}
                  className="ds-field"
                >
                  <option value="company">บริษัทจำกัด (บจก.)</option>
                  <option value="partnership">ห้างหุ้นส่วนจำกัด (หจก.)</option>
                  <option value="individual">บุคคลธรรมดา</option>
                </DSSelect>
              </div>
            </div>
          </div>

          {/* 3. Credentials & Filing Codes (e-Filing, Password, SSO) */}
          <div className="ds-form-section p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">key</span>
              <h3 className="ds-form-section__title">
                รหัสผ่านและข้อมูลการยื่นแบบ
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Password */}
              <div>
                <label className="ds-label ds-label--mono">
                  รหัสผ่าน (Password)
                </label>
                <DSInput
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ระบุรหัสผ่าน e-Filing"
                  className="ds-field ds-field--mono"
                />
              </div>

              {/* e-Filing Code */}
              <div>
                <label className="ds-label ds-label--mono">
                  รหัสยื่น e-Filing
                </label>
                <DSInput
                  type="text"
                  value={eFilingCode}
                  onChange={(e) => setEFilingCode(e.target.value)}
                  placeholder="ระบุรหัสยื่น"
                  className="ds-field ds-field--mono"
                />
              </div>

              {/* SSO Code */}
              <div>
                <label className="ds-label ds-label--mono">
                  รหัสประกันสังคม (สปส.)
                </label>
                <DSInput
                  type="text"
                  value={ssoCode}
                  onChange={(e) => setSsoCode(e.target.value)}
                  placeholder="ระบุรหัส สปส."
                  className="ds-field ds-field--mono"
                />
              </div>
            </div>
          </div>

          {/* 4. Auditor & Remarks */}
          <div className="ds-form-section p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">description</span>
              <h3 className="ds-form-section__title">
                ข้อมูลผู้สอบบัญชีและหมายเหตุ
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="ds-label">
                  วันที่แจ้งผู้สอบบัญชี / ผู้สอบบัญชี
                </label>
                <DSInput
                  type="text"
                  value={auditorDate}
                  onChange={(e) => setAuditorDate(e.target.value)}
                  placeholder="ระบุวันที่แจ้ง หรือชื่อผู้สอบบัญชี"
                  className="ds-field"
                />
              </div>

              <div>
                <label className="ds-label">
                  หมายเหตุ / รหัสใหม่
                </label>
                <DSInput
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม"
                  className="ds-field"
                />
              </div>
            </div>
          </div>

          {/* 5. Source File and Topic */}
          <div className="ds-form-section p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
              <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">history</span>
              <h3 className="ds-form-section__title">
                ข้อมูลการนำเข้าและหัวข้อ
              </h3>
            </div>

            <div>
              <label className="ds-label">
                ชุดข้อมูล / หัวข้อ / ที่มาไฟล์
              </label>
              <DSInput
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น ชุดไฟล์นำเข้าปี 69, บันทึกข้อมูลเอง"
                className="ds-field"
              />
            </div>
          </div>

          {/* Action Buttons in Footer */}
          <div className="ds-modal-footer pt-4 flex items-center justify-end gap-3">
            <DSButton
              type="button"
              onClick={onClose}
              variant="secondary"
            >
              ยกเลิก
            </DSButton>
            <DSButton
              type="submit"
              variant="primary" className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>บันทึกการแก้ไข</span>
            </DSButton>
          </div>
        </form>
      </div>
    </div>
  );
};
