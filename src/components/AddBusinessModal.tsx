import React, { useState } from 'react';
import { BusinessRecord, BusinessStatus, BusinessType } from '../types';
import { formatThaiTaxId, generateRandomPassword, inferBusinessType } from '../utils/thaiDate';

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
  nextSequenceNo
}) => {
  const [sequenceNo, setSequenceNo] = useState(nextSequenceNo);
  const [taxId, setTaxId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [auditorDate, setAuditorDate] = useState('');
  const [password, setPassword] = useState(generateRandomPassword(10));
  const [showPassword, setShowPassword] = useState(false);
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
    
    // Check for duplicate Tax ID
    if (allRecords.some(r => r.taxId === taxId.trim())) {
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
      topic: topic.trim(),
      status,
      isVerifiedDbd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(newRecord);
    onShowToast(`เพิ่มกิจการ "${companyName.trim()}" สำเร็จ`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2d24]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-[#dbe8e1] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-3 border-b border-[#edf4f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <span className="material-symbols-outlined text-[22px]">add_business</span>
            </div>
            <div>
              <h3 className="text-base font-bold font-headline text-[#143c2f]">
                เพิ่มกิจการใหม่ (ลำดับ: {sequenceNo})
              </h3>
              <p className="text-xs text-[#527d6f]">
                กรอกข้อมูลนิติบุคคลเพื่อเพิ่มเข้าสู่ระบบ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
              <span className="material-symbols-outlined text-[18px] text-rose-500 shrink-0">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Status Radio options */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[#1e2925]">
              สถานะการดำเนินงาน
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  status === 'pending'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-[#fafafa] border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="pending"
                  checked={status === 'pending'}
                  onChange={() => setStatus('pending')}
                />
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>ยังไม่ได้ทำ</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  status === 'in_progress'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-[#fafafa] border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="in_progress"
                  checked={status === 'in_progress'}
                  onChange={() => setStatus('in_progress')}
                />
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>กำลังทำ</span>
              </label>

              <label
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  status === 'completed'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-[#fafafa] border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="completed"
                  checked={status === 'completed'}
                  onChange={() => setStatus('completed')}
                />
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>เสร็จแล้ว</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">
                ลำดับ
              </label>
              <input
                type="text"
                value={sequenceNo}
                readOnly
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs font-mono font-bold rounded-xl border border-slate-200 opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                เลขประจำตัวผู้เสียภาษี
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(formatThaiTaxId(e.target.value))}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                ชื่อบริษัท / ห้างหุ้นส่วนจำกัด
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                วันที่แจ้งผู้สอบ
              </label>
              <input
                type="text"
                value={auditorDate}
                onChange={(e) => setAuditorDate(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPassword(generateRandomPassword(10));
                    setShowPassword(true);
                  }}
                  className="text-[11px] text-[#2d6a59] hover:underline"
                >
                  สุ่มรหัสใหม่
                </button>
              </div>
              <div className="relative flex items-center mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 pl-3 pr-9 bg-[#f8faf9] text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                รหัสยื่น e-filing
              </label>
              <input
                type="text"
                value={eFilingCode}
                onChange={(e) => setEFilingCode(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs font-mono uppercase rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                ประกันสังคม
              </label>
              <input
                type="text"
                value={ssoCode}
                onChange={(e) => setSsoCode(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                หัวข้อ / ชุดข้อมูลลงบันทึกในระบบ (จัดกลุ่มตามโฟลเดอร์)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="เช่น บันทึกข้อมูลเอง, ชุดข้อมูลยื่นงบ 2569..."
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">
                หมายเหตุ/รหัสใหม่
              </label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full h-10 px-3 mt-1 bg-[#f8faf9] text-xs rounded-xl border border-slate-200 focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#edf4f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2d6a59] hover:bg-[#245547] text-white shadow-xs transition-colors"
            >
              เพิ่มกิจการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
