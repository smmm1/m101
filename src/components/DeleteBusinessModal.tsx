import React, { useState } from 'react';
import { BusinessRecord } from '../types';

interface DeleteBusinessModalProps {
  records: BusinessRecord[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

export const DeleteBusinessModal: React.FC<DeleteBusinessModalProps> = ({ records, onClose, onDelete }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r.id));
    }
  };

  const handleConfirmDelete = () => {
    if (selectedIds.length === 0) return;
    onDelete(selectedIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-150 font-body">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-headline">
                ลบรายการทะเบียนกิจการ (Bulk Delete)
              </h3>
              <p className="text-[11px] text-slate-400">เลือกรายการที่ต้องการลบออกจากระบบ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {confirming ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white font-headline">
              ยืนยันการลบ {selectedIds.length} รายการ?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              ข้อมูลที่เลือกจะถูกลบออกจากรอบปีบัญชีปัจจุบันอย่างถาวร กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>ยืนยันลบทันที</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-3">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 px-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={selectedIds.length === records.length && records.length > 0}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    เลือกทั้งหมด ({selectedIds.length}/{records.length})
                  </span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  เลือกแล้ว {selectedIds.length} รายการ
                </span>
              </div>

              <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {records.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">ไม่มีรายการให้ลบ</div>
                ) : (
                  records.map((r) => {
                    const isChecked = selectedIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleSelect(r.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border ${
                          isChecked
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-8">
                          #{r.sequenceNo || '-'}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {r.companyName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{r.taxId}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={selectedIds.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>ลบรายการที่เลือก ({selectedIds.length})</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
