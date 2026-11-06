import React, { useState } from 'react';
import { BusinessRecord } from '../types';
import { DSButton } from '../design-system/components';

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
    <div className="m101-dialog-overlay ds-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="m101-dialog-panel ds-delete-modal w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
        <div className="m101-dialog-header ds-modal-header flex items-center justify-between pb-4">
          <div className="flex items-center gap-2.5">
            <div className="ds-modal-icon ds-modal-icon--danger">
              <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
            </div>
            <div>
              <h3 className="ds-modal-title">
                ลบรายการทะเบียนกิจการ (Bulk Delete)
              </h3>
              <p className="ds-modal-description">เลือกรายการที่ต้องการลบออกจากระบบ</p>
            </div>
          </div>
          <DSButton
            type="button"
            onClick={onClose}
            variant="ghost" className="w-8 h-8 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </DSButton>
        </div>

        {confirming ? (
          <div className="ds-delete-confirm py-8 px-4 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in">
            <div className="ds-modal-icon ds-modal-icon--danger ds-modal-icon--large">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h4 className="ds-modal-title ds-modal-title--large">
              ยืนยันการลบ {selectedIds.length} รายการ?
            </h4>
            <p className="ds-modal-description ds-modal-description--center max-w-md">
              ข้อมูลที่เลือกจะถูกลบออกจากรอบปีบัญชีปัจจุบันอย่างถาวร กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการ
            </p>
            <div className="flex items-center gap-3 mt-4">
              <DSButton
                type="button"
                onClick={() => setConfirming(false)}
                variant="secondary"
              >
                ย้อนกลับ
              </DSButton>
              <DSButton
                type="button"
                onClick={handleConfirmDelete}
                variant="danger" className="flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>ยืนยันลบทันที</span>
              </DSButton>
            </div>
          </div>
        ) : (
          <>
            <div className="ds-delete-list flex-1 overflow-y-auto py-3">
              <div className="ds-delete-toolbar flex items-center justify-between pb-2 mb-2 px-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={selectedIds.length === records.length && records.length > 0}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="ds-delete-select-label">
                    เลือกทั้งหมด ({selectedIds.length}/{records.length})
                  </span>
                </label>
                <span className="ds-delete-count">
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
                        className={`m101-delete-row ds-delete-row flex items-center gap-3 p-2.5 transition-all cursor-pointer border ${
                          isChecked
                            ? 'is-selected'
                            : 'is-unselected'
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
                          <span className="ds-delete-business truncate">
                            {r.companyName}
                          </span>
                          <span className="ds-delete-taxid">{r.taxId}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="ds-modal-footer pt-4 flex justify-end gap-2.5">
              <DSButton
                type="button"
                onClick={onClose}
                variant="secondary"
              >
                ยกเลิก
              </DSButton>
              <DSButton
                type="button"
                onClick={() => setConfirming(true)}
                disabled={selectedIds.length === 0}
                variant="danger" className="flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>ลบรายการที่เลือก ({selectedIds.length})</span>
              </DSButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
