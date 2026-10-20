import React, { useState } from 'react';

interface YearManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: string;
  availableYears: string[];
  recordsByYear: Record<string, any[]>;
  onSelectYear: (year: string) => void;
  onAddYear: (newYear: string, copyFromYear?: string) => void;
  onDeleteYear?: (year: string) => void;
  isLoggedIn: boolean;
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
  isLoggedIn,
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
      setError('กรุณากรอกรอบปี (เช่น 70)');
      return;
    }

    if (availableYears.includes(trimmed)) {
      setError(`รอบปี ${trimmed} มีอยู่ในระบบแล้ว`);
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white dark:bg-[#12141c] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white font-headline">
                จัดการรอบปีบัญชี (Fiscal Years)
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                สลับหรือเพิ่มรอบปีบริหารจัดการข้อมูล
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

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Delete Confirmation Box */}
          {yearToDelete && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-900 dark:text-rose-200 flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>ยืนยันการลบรอบปี {yearToDelete}?</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300 text-[11px] leading-relaxed">
                ข้อมูลกิจการทั้งหมด {(recordsByYear[yearToDelete] || []).length} รายการในรอบปี {yearToDelete} จะถูกลบออกจากระบบ
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setYearToDelete(null)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(yearToDelete)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                >
                  ใช่, ลบรอบปีนี้
                </button>
              </div>
            </div>
          )}

          {/* Year List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                รอบปีในระบบ ({availableYears.length} ปี)
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                ปัจจุบัน: ปี {selectedYear}
              </span>
            </div>

            <div className="space-y-2">
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
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white dark:bg-[#161824] border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold font-mono text-xs ${
                        isCurrent
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {yr}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold font-headline">
                          รอบปีบัญชี {yr}
                        </span>
                        <span className={`text-[11px] font-mono ${isCurrent ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {count} กิจการ
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white">
                          กำลังใช้งาน
                        </span>
                      )}

                      {isLoggedIn && availableYears.length > 1 && !isCurrent && onDeleteYear && (
                        <button
                          type="button"
                          onClick={() => setYearToDelete(yr)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          title={`ลบรอบปี ${yr}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create New Year Form */}
          {isLoggedIn && (isCreating ? (
            <form onSubmit={handleCreateYear} className="mt-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  เพิ่มรอบปีบัญชีใหม่
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ยกเลิก
                </button>
              </div>

              {error && (
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  รหัสรอบปี (เช่น 70)
                </label>
                <input
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="กรอกปี เช่น 70"
                  className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-mono outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  คัดลอกข้อมูลจากรอบปีเดิม (ถ้าต้องการ)
                </label>
                <select
                  value={copyFromYear}
                  onChange={(e) => setCopyFromYear(e.target.value)}
                  className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- เริ่มต้นด้วยฐานข้อมูลว่าง --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      คัดลอกกิจการจากรอบปี {yr} ({(recordsByYear[yr] || []).length} กิจการ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  สร้างรอบปี
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-1 w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-50/20 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-600">add_circle</span>
              <span>เพิ่มรอบปีใหม่ (+ New Fiscal Year)</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
