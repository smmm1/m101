import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2d24]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#dbe8e1] flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#edf4f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <span className="material-symbols-outlined text-[22px]">help</span>
            </div>
            <div>
              <h3 className="text-base font-bold font-headline text-[#143c2f]">
                คู่มือการใช้งานระบบ (Quick Guide)
              </h3>
              <p className="text-xs text-[#527d6f]">
                Mustang Directory - ระบบบริหารจัดการนิติบุคคล
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

        <div className="flex flex-col gap-3 text-xs text-[#1e2925] max-h-[60vh] overflow-y-auto no-scrollbar">
          <div className="p-3.5 rounded-2xl bg-[#f5faf7] border border-[#dce8e1] flex flex-col gap-1.5">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">domain_add</span>
              1. การเพิ่มกิจการใหม่
            </span>
            <p className="text-slate-600 leading-relaxed">
              คลิกปุ่ม "เพิ่มกิจการ" เพื่อกรอกข้อมูล 8 ฟิลด์สำคัญ พร้อมตรวจสอบการจัดรูปแบบเลขภาษี 13 หลักและสุ่มรหัสผ่านอัตโนมัติ
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5faf7] border border-[#dce8e1] flex flex-col gap-1.5">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">file_present</span>
              2. การนำเข้าข้อมูลจากไฟล์ (PDF / XLS / รูปภาพ)
            </span>
            <p className="text-slate-600 leading-relaxed">
              รองรับทั้งไฟล์ตาราง Excel (.xlsx, .csv), เอกสาร PDF และรูปภาพเอกสารนิติบุคคล โดยระบบจะสกัดข้อมูลนิติบุคคลให้อัตโนมัติ พร้อมทั้งสามารถดาวน์โหลด Template Excel ได้
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5faf7] border border-[#dce8e1] flex flex-col gap-1.5">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              3. การดูรหัสผ่านและความปลอดภัย
            </span>
            <p className="text-slate-600 leading-relaxed">
              รหัสผ่านจะถูกซ่อนไว้โดยค่าเริ่มต้น สามารถคลิกไอคอนรูปดวงตาเพื่อเปิดดู หรือคลิกคัดลอกเลขประจำตัวผู้เสียภาษีได้ในคลิกเดียว
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f5faf7] border border-[#dce8e1] flex flex-col gap-1.5">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">sync</span>
              4. สถานะ DBD Sync
            </span>
            <p className="text-slate-600 leading-relaxed">
              ข้อมูลเชื่อมต่อกับฐานข้อมูล DBD แบบ Realtime เพื่อยืนยันสถานะนิติบุคคลที่ถูกต้องตามกฎหมาย
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#edf4f0] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#2d6a59] text-white font-bold text-xs hover:bg-[#245547] transition-all cursor-pointer"
          >
            เข้าใจแล้ว
          </button>
        </div>
      </div>
    </div>
  );
};
