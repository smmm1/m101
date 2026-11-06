import React, { useState } from 'react';
import { DSBadge, DSButton, DSInput, DSSelect } from '../design-system/components';

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
        className="m101-dialog-overlay fixed inset-0"
        onClick={onClose}
      />

      <div className="m101-dialog-panel relative w-full max-w-md overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="ds-modal-header px-6 py-4 flex items-center justify-between">
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

          <DSButton
            type="button"
            onClick={onClose}
            variant="ghost" className="ds-icon-button"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </DSButton>
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
                <DSButton
                  type="button"
                  onClick={() => setYearToDelete(null)}
                  variant="secondary"
                >
                  ยกเลิก
                </DSButton>
                <DSButton
                  type="button"
                  onClick={() => handleConfirmDelete(yearToDelete)}
                  variant="danger"
                >
                  ใช่, ลบรอบปีนี้
                </DSButton>
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
                    className={`ds-year-option p-3.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                      isCurrent
                        ? 'is-current'
                         : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`ds-year-number w-8 h-8 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        isCurrent
                          ? 'is-current'
                           : ''
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
                        <DSButton
                          type="button"
                          onClick={() => setYearToDelete(yr)}
                          variant="ghost" className="ds-icon-button ds-delete-action"
                          title={`ลบรอบปี ${yr}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </DSButton>
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
                <DSButton
                  type="button"
                  onClick={() => setIsCreating(false)}
                  variant="ghost" className="ds-inline-cancel"
                >
                  ยกเลิก
                </DSButton>
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
                <DSInput
                  type="text"
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="กรอกปี เช่น 70"
                  className="ds-field--mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">
                  คัดลอกข้อมูลจากรอบปีเดิม (ถ้าต้องการ)
                </label>
                <DSSelect
                  value={copyFromYear}
                  onChange={(e) => setCopyFromYear(e.target.value)}
                  
                >
                  <option value="">-- เริ่มต้นด้วยฐานข้อมูลว่าง --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      คัดลอกกิจการจากรอบปี {yr} ({(recordsByYear[yr] || []).length} กิจการ)
                    </option>
                  ))}
                </DSSelect>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <DSButton
                  type="button"
                  onClick={() => setIsCreating(false)}
                  variant="secondary"
                >
                  ยกเลิก
                </DSButton>
                <DSButton
                  type="submit"
                  variant="primary"
                >
                  สร้างรอบปี
                </DSButton>
              </div>
            </form>
          ) : (
            <DSButton
              type="button"
              onClick={() => setIsCreating(true)}
              variant="secondary" className="ds-year-add"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-600">add_circle</span>
              <span>เพิ่มรอบปีใหม่ (+ New Fiscal Year)</span>
            </DSButton>
          ))}
        </div>
      </div>
    </div>
  );
};
