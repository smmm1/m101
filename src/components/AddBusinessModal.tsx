import React, { useState } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { generateRandomPassword, inferBusinessType } from '../utils/thaiDate';
import { useSystemConfig } from '../context/SystemConfigContext';
import { DSButton, DSInput } from '../design-system/components';

interface AddBusinessModalProps {
  allRecords: BusinessRecord[];
  onClose: () => void;
  onSave: (record: BusinessRecord) => void;
  onShowToast: (msg: string) => void;
  nextSequenceNo: string;
}

export const AddBusinessModal: React.FC<AddBusinessModalProps> = ({
  allRecords,
  onClose,
  onSave,
  onShowToast,
  nextSequenceNo,
}) => {
  const { config } = useSystemConfig();
  const [sequenceNo, setSequenceNo] = useState(nextSequenceNo);
  const [taxId, setTaxId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [auditorDate, setAuditorDate] = useState('');
  const [password, setPassword] = useState(generateRandomPassword(8));
  const [remark, setRemark] = useState('');
  const [eFilingCode, setEFilingCode] = useState('');
  const [ssoCode, setSsoCode] = useState('');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<BusinessStatus>('pending');
  const [formError, setFormError] = useState<string>('');
  const [showCredentialFields, setShowCredentialFields] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!taxId.trim() || !companyName.trim() || !password.trim()) {
      setFormError('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน (เลขผู้เสียภาษี, ชื่อกิจการ, รหัสผ่าน)');
      return;
    }

    if (allRecords.some((r) => r.taxId === taxId.trim())) {
      setFormError('เลขประจำตัวผู้เสียภาษีนี้มีอยู่ในระบบแล้ว');
      return;
    }

    const type: BusinessType = inferBusinessType(companyName);

    const newRecord: BusinessRecord = {
      id: Date.now().toString(),
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
      isVerifiedDbd: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newRecord);
    onShowToast(`เพิ่มกิจการ "${companyName.trim()}" สำเร็จ`);
    onClose();
  };

  return (
    <div className="m101-dialog-overlay ds-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="ds-modal-backdrop fixed inset-0"
        onClick={onClose}
      />
      <div className="relative m101-dialog-panel ds-form-modal ds-form-modal--compact w-full max-w-lg overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="m101-dialog-header ds-modal-header ds-form-modal__header px-6 py-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="ds-modal-icon">
              <span className="material-symbols-outlined text-[20px]">add_business</span>
            </div>
            <div>
              <h3 className="ds-modal-title">
                เพิ่มกิจการใหม่ (ลำดับ: #{sequenceNo})
              </h3>
              <p className="ds-modal-description">
                กรอกข้อมูลนิติบุคคลเพื่อบันทึกลงในทะเบียน
              </p>
            </div>
          </div>
          <DSButton
            type="button"
            onClick={onClose}
            variant="ghost" className="ds-icon-button flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </DSButton>
        </div>

        <form onSubmit={handleSubmit} className="ds-form-modal__body p-6 space-y-4 max-h-[72vh] overflow-y-auto no-scrollbar">
          {formError && (
            <div className="ds-form-error p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-zinc-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pending', label: config.statusPending || 'รอดำเนินการ', color: 'bg-zinc-500' },
                { value: 'in_progress', label: config.statusInProgress || 'กำลังทำ', color: 'bg-zinc-500' },
                { value: 'completed', label: config.statusCompleted || 'เสร็จสิ้น', color: 'bg-zinc-500' },
              ].map((s) => (
                <DSButton
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as any)}
                  variant={status === s.value ? 'primary' : 'secondary'} className="ds-status-option"
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span>{s.label}</span>
                </DSButton>
              ))}
            </div>
          </div>

          {/* Tax ID & Seq */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="ds-label">ลำดับ</label>
              <DSInput
                type="text"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(e.target.value)}
                className="mt-1 ds-field ds-field--mono"
              />
            </div>
            <div className="col-span-2">
              <label className="ds-label">
                เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-zinc-500">*</span>
              </label>
              <DSInput
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0-1055-00000-00-0"
                className="mt-1 ds-field ds-field--mono"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="ds-label">
              ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-zinc-500">*</span>
            </label>
            <DSInput
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="เช่น บริษัท สยาม พร็อพเพอร์ตี้ จำกัด"
              className="mt-1 ds-field"
            />
          </div>

          {/* Password & Auditor Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="ds-label">
                  รหัสผ่าน / e-Filing <span className="text-zinc-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <DSButton
                    type="button"
                    onClick={() => setShowCredentialFields((visible) => !visible)}
                    variant="ghost"
                    className="text-xs"
                    aria-label={showCredentialFields ? 'ซ่อนรหัสลับ' : 'แสดงรหัสลับ'}
                    aria-pressed={showCredentialFields}
                  >
                    <span className="material-symbols-outlined text-[15px] mr-1">
                      {showCredentialFields ? 'visibility_off' : 'visibility'}
                    </span>
                    {showCredentialFields ? 'ซ่อน' : 'แสดง'}
                  </DSButton>
                  <DSButton
                    type="button"
                    onClick={() => setPassword(generateRandomPassword(8))}
                    variant="ghost" className="text-xs"
                  >
                    สุ่มรหัส
                  </DSButton>
                </div>
              </div>
              <DSInput
                type={showCredentialFields ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 ds-field ds-field--mono"
              />
            </div>

            <div>
              <label className="ds-label">วันที่ผู้สอบ</label>
              <DSInput
                type="text"
                value={auditorDate}
                onChange={(e) => setAuditorDate(e.target.value)}
                placeholder="เช่น 15 มี.ค. 69"
                className="mt-1 ds-field"
              />
            </div>
          </div>

          {/* eFiling & SSO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">รหัสยื่น e-Filing</label>
              <DSInput
                type={showCredentialFields ? 'text' : 'password'}
                autoComplete="off"
                value={eFilingCode}
                onChange={(e) => setEFilingCode(e.target.value)}
                placeholder="DBD-EF-xxxx"
                className="mt-1 ds-field ds-field--mono"
              />
            </div>
            <div>
              <label className="ds-label">รหัสประกันสังคม</label>
              <DSInput
                type={showCredentialFields ? 'text' : 'password'}
                autoComplete="off"
                value={ssoCode}
                onChange={(e) => setSsoCode(e.target.value)}
                placeholder="1055xxxx"
                className="mt-1 ds-field ds-field--mono"
              />
            </div>
          </div>

          {/* Remark & Topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">หมายเหตุ</label>
              <DSInput
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="mt-1 ds-field"
              />
            </div>
            <div>
              <label className="ds-label">หัวข้อ / กลุ่ม</label>
              <DSInput
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น บันทึกข้อมูลเอง"
                className="mt-1 ds-field"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="ds-modal-footer flex items-center justify-end gap-3 pt-4">
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
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>เพิ่มกิจการ</span>
            </DSButton>
          </div>
        </form>

      </div>
    </div>
  );
};
