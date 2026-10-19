import React, { useState } from 'react';
import { BusinessRecord } from '../types';

interface DeleteBusinessModalProps {
  records: BusinessRecord[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

export const DeleteBusinessModal: React.FC<DeleteBusinessModalProps> = ({ records, onClose, onDelete }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`ยืนยันการลบรายการที่เลือกจำนวน ${selectedIds.length} รายการ?`)) {
      onDelete(selectedIds);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">ลบรายการทะเบียนกิจการ</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="flex items-center gap-2 mb-4 px-2">
            <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === records.length && records.length > 0} />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">เลือกทั้งหมด ({selectedIds.length}/{records.length})</span>
          </div>
          <div className="space-y-1">
            {records.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
                <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">{r.sequenceNo}</span>
                <span className="text-xs text-slate-900 dark:text-white truncate flex-1">{r.companyName}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200">ยกเลิก</button>
          <button 
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            ลบรายการที่เลือก ({selectedIds.length})
          </button>
        </div>
      </div>
    </div>
  );
};
