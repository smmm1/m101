import React, { useState } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { generateRandomPassword, inferBusinessType } from '../utils/thaiDate';

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-[#e4e4e7] flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[#f4f4f5]">
          <div>
            <h3 className="text-sm font-bold font-headline text-[#18181b]">
              เพิ่มกิจการใหม่ (ลำดับ: {sequenceNo})
            </h3>
            <p className="text-xs text-[#71717a]">
              กรอกข้อมูลเพื่อบันทึกลงในทะเบียน
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#71717a]">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pending', label: 'รอดำเนินการ', color: 'bg-amber-500' },
                { value: 'in_progress', label: 'กำลังดำเนินการ', color: 'bg-sky-500' },
                { value: 'completed', label: 'เสร็จสิ้น', color: 'bg-emerald-500' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as any)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    status === s.value
                      ? 'bg-[#18181b] text-white border-neutral-900 shadow-2xs'
                      : 'bg-white border-[#e4e4e7] text-[#71717a] hover:bg-[#f4f4f5]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tax ID & Seq */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-[#71717a]">ลำดับ</label>
              <input
                type="text"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-mono focus:border-neutral-900 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-[#71717a]">
                เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0-1055-00000-00-0"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-mono focus:border-neutral-900 outline-none"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-xs font-medium text-[#71717a]">
              ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="บริษัท ตัวอย่าง จำกัด"
              className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs focus:border-neutral-900 outline-none"
            />
          </div>

          {/* Auditor Date & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#71717a]">วันที่แจ้งผู้สอบ / ผู้สอบ</label>
              <input
                type="text"
                value={auditorDate}
                onChange={(e) => setAuditorDate(e.target.value)}
                placeholder="เช่น น้องมิล"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs focus:border-neutral-900 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#71717a]">รหัสผ่าน <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-mono focus:border-neutral-900 outline-none"
              />
            </div>
          </div>

          {/* eFiling & SSO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#71717a]">รหัสยื่น e-Filing</label>
              <input
                type="text"
                value={eFilingCode}
                onChange={(e) => setEFilingCode(e.target.value)}
                placeholder="DBD-EF-xxxx"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-mono focus:border-neutral-900 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#71717a]">รหัสประกันสังคม</label>
              <input
                type="text"
                value={ssoCode}
                onChange={(e) => setSsoCode(e.target.value)}
                placeholder="1055xxxx"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs font-mono focus:border-neutral-900 outline-none"
              />
            </div>
          </div>

          {/* Remark & Topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#71717a]">หมายเหตุ</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs focus:border-neutral-900 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#71717a]">หัวข้อ / กลุ่ม</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น บันทึกข้อมูลเอง"
                className="w-full h-9 px-3 mt-1 bg-white border border-[#e4e4e7] rounded-lg text-xs focus:border-neutral-900 outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f4f4f5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium cursor-pointer shadow-2xs"
            >
              บันทึกกิจการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
