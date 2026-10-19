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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#12141c] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[20px]">add_business</span>
            </div>
            <div>
              <h3 className="text-base font-bold font-headline text-slate-900 dark:text-white">
                เพิ่มกิจการใหม่ (ลำดับ: #{sequenceNo})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                กรอกข้อมูลนิติบุคคลเพื่อบันทึกลงในระบบ Mustang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto no-scrollbar">
          {formError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Status Options */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'pending', label: config.statusPending || 'รอดำเนินการ', color: 'bg-rose-500' },
                { value: 'in_progress', label: config.statusInProgress || 'กำลังทำ', color: 'bg-amber-500' },
                { value: 'completed', label: config.statusCompleted || 'เสร็จสิ้น', color: 'bg-emerald-500' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as any)}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    status === s.value
                      ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 border-slate-900 dark:border-amber-500 shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
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
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">ลำดับ</label>
              <input
                type="text"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(e.target.value)}
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white font-bold transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                เลขประจำตัวผู้เสียภาษี (13 หลัก) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0-1055-00000-00-0"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white font-bold transition-all"
              />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ชื่อบริษัท / ห้างหุ้นส่วนจำกัด <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="เช่น บริษัท สยาม พร็อพเพอร์ตี้ จำกัด"
              className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
            />
          </div>

          {/* Password & Auditor Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  รหัสผ่าน / e-Filing <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPassword(generateRandomPassword(8))}
                  className="text-[10px] text-emerald-600 hover:underline cursor-pointer"
                >
                  สุ่มรหัส
                </button>
              </div>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">วันที่ผู้สอบ</label>
              <input
                type="text"
                value={auditorDate}
                onChange={(e) => setAuditorDate(e.target.value)}
                placeholder="เช่น 15 มี.ค. 69"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* eFiling & SSO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">รหัสยื่น e-Filing</label>
              <input
                type="text"
                value={eFilingCode}
                onChange={(e) => setEFilingCode(e.target.value)}
                placeholder="DBD-EF-xxxx"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">รหัสประกันสังคม</label>
              <input
                type="text"
                value={ssoCode}
                onChange={(e) => setSsoCode(e.target.value)}
                placeholder="1055xxxx"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Remark & Topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">หัวข้อ / กลุ่ม</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น บันทึกข้อมูลเอง"
                className="w-full h-11 px-3.5 mt-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-slate-900 dark:text-white transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-600 text-white dark:text-slate-900 text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>เพิ่มกิจการ</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
