import React, { useState } from 'react';
import { XpCalendarIcon, XpTrashIcon } from './ClassicIcons';

interface YearManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  availableYears: string[];
  recordsByYear: Record<string, any[]>;
  onSelectYear: (year: string) => void;
  onAddYear: (newYear: string, copyFromYear?: string) => void;
  onDeleteYear?: (year: string) => void;
}

export const YearManageModal: React.FC<YearManageModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  availableYears,
  recordsByYear,
  onSelectYear,
  onAddYear,
  onDeleteYear,
}) => {
  const [newYearInput, setNewYearInput] = useState('');
  const [copyFromYear, setCopyFromYear] = useState<string>('');
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [yearToDelete, setYearToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateYear = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = newYearInput.trim();
    if (!trimmed) {
      setError('กรุณากรอกปี (เช่น 70)');
      return;
    }

    if (availableYears.includes(trimmed)) {
      setError(`ปี ${trimmed} มีอยู่ในระบบแล้ว`);
      return;
    }

    onAddYear(trimmed, copyFromYear || undefined);
    setNewYearInput('');
    setCopyFromYear('');
    setIsCreating(false);
  };

  const handleConfirmDelete = (year: string) => {
    if (onDeleteYear) {
      onDeleteYear(year);
      setYearToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#e4e4e7] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XpCalendarIcon size={20} />
            <h2 className="text-sm font-bold text-[#18181b]">
              จัดการรอบปีบัญชี
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Delete Confirmation Box */}
          {yearToDelete && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>ยืนยันการลบรอบปี {yearToDelete}?</span>
              </div>
              <p className="text-rose-700">
                ข้อมูลกิจการทั้งหมด {(recordsByYear[yearToDelete] || []).length} รายการในรอบปี {yearToDelete} จะถูกลบออกจากระบบ
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setYearToDelete(null)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(yearToDelete)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer shadow-2xs"
                >
                  ใช่, ลบรอบปีนี้
                </button>
              </div>
            </div>
          )}

          {/* Year List */}
          <div>
            <span className="text-xs font-medium text-[#71717a] block mb-2">
              รอบปีที่มีในระบบ ({availableYears.length} ปี):
            </span>
            <div className="space-y-1.5">
              {availableYears.map((yr) => {
                const isCurrent = yr === selectedYear;
                const count = (recordsByYear[yr] || []).length;

                return (
                  <div
                    key={yr}
                    onClick={() => {
                      onSelectYear(yr);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                        : 'bg-white border-[#e4e4e7] hover:bg-[#fafafa] text-[#18181b]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <XpCalendarIcon size={18} />
                      <div>
                        <span className="text-xs font-bold font-mono tracking-wide">
                          ปี {yr}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-white/20 text-white">
                            กำลังใช้งาน
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono font-medium ${isCurrent ? 'text-neutral-300' : 'text-[#71717a]'}`}>
                        {count.toLocaleString()} กิจการ
                      </span>

                      {availableYears.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setYearToDelete(yr);
                          }}
                          className={`p-1 rounded transition-colors ${
                            isCurrent
                              ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                              : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title={`ลบปี ${yr}`}
                        >
                          <XpTrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Year Section */}
          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-[#d4d4d8] text-xs font-medium text-[#18181b] hover:border-neutral-900 hover:bg-[#fafafa] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>เพิ่มรอบปีใหม่</span>
            </button>
          ) : (
            <form onSubmit={handleCreateYear} className="p-3.5 bg-[#fafafa] border border-[#e4e4e7] rounded-xl flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18181b]">เพิ่มรอบปีใหม่</span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  ยกเลิก
                </button>
              </div>

              <div>
                <label className="text-[11px] text-[#71717a] block mb-1">
                  ระบุปี (เช่น 70, 71)
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="70"
                  className="w-full h-8 px-2.5 bg-white border border-[#e4e4e7] rounded-lg text-xs text-[#18181b] focus:outline-none focus:border-neutral-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] text-[#71717a] block mb-1">
                  คัดลอกรายชื่อบริษัทตั้งต้นจากปีอื่น (ไม่บังคับ)
                </label>
                <select
                  value={copyFromYear}
                  onChange={(e) => setCopyFromYear(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-[#e4e4e7] rounded-lg text-xs text-[#18181b] focus:outline-none"
                >
                  <option value="">เริ่มต้นจากตารางว่าง (0 รายการ)</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      คัดลอกรายชื่อบริษัทจากปี {yr} ({(recordsByYear[yr] || []).length} รายการ - รีเซ็ตสถานะเป็นรอดำเนินการ)
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="text-[11px] text-rose-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full h-8 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs mt-1"
              >
                สร้างรอบปี
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e4e4e7] bg-[#fafafa] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-[#e4e4e7] bg-white text-xs text-[#27272a] hover:bg-[#f4f4f5] cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
