import React, { useState } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { generateRandomPassword, inferBusinessType } from '../utils/thaiDate';
import { useSystemConfig } from '../context/SystemConfigContext';

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
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-bold font-headline text-zinc-900 dark:text-zinc-100">
              เพิ่มกิจการใหม่ (ลำดับ: {sequenceNo})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              กรอกข้อมูลเพื่อบันทึกลงในทะเบียนนิติบุคคล
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {formError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pending', label: config.statusPending || 'รอดำเนินการ', color: 'bg-amber-500' },
                { value: 'in_progress', label: config.statusInProgress || 'กำลังทำ', color: 'bg-sky-500' },
                { value: 'completed', label: config.statusCompleted || 'เสร็จสิ้น', color: 'bg-emerald-500' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as any)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    status === s.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                      : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
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
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">ลำดับ</label>
              <input
                type="text"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0-1055-00000-00-0"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="บริษัท ตัวอย่าง จำกัด"
              className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
            />
          </div>

          {/* Auditor Date & Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">วันที่แจ้งผู้สอบ / ผู้สอบ</label>
              <input
                type="text"
                value={auditorDate}
                onChange={(e) => setAuditorDate(e.target.value)}
                placeholder="เช่น น้องมิล"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  รหัสผ่าน <span className="text-rose-500">*</span>
                </label>
                {taxId && (
                  <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                    เลขภาษี: <strong className="text-zinc-700 dark:text-zinc-200">{taxId}</strong>
                  </span>
                )}
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
          </div>

          {/* eFiling & SSO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">รหัสยื่น e-Filing</label>
              <input
                type="text"
                value={eFilingCode}
                onChange={(e) => setEFilingCode(e.target.value)}
                placeholder="DBD-EF-xxxx"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">รหัสประกันสังคม</label>
              <input
                type="text"
                value={ssoCode}
                onChange={(e) => setSsoCode(e.target.value)}
                placeholder="1055xxxx"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
          </div>

          {/* Remark & Topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">หมายเหตุ</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">หัวข้อ / กลุ่ม</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น บันทึกข้อมูลเอง"
                className="w-full h-9 px-3 mt-1 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs focus:border-zinc-900 dark:focus:border-zinc-400 outline-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              style={{ backgroundColor: config.primaryColor }}
              className="px-5 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
            >
              บันทึกกิจการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
