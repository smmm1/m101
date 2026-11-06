import React, { useState } from 'react';
import { BusinessRecord } from '../types';
import { DSBadge, DSButton } from '../design-system/components';

export interface DuplicateConflictItem {
  incoming: Partial<BusinessRecord>;
  existing: BusinessRecord;
}

export type ConflictResolutionMode = 'update_existing' | 'skip_duplicates' | 'import_all';

interface ImportConflictModalProps {
  isOpen: boolean;
  fileName: string;
  duplicateItems: DuplicateConflictItem[];
  newItems: Partial<BusinessRecord>[];
  onResolve: (mode: ConflictResolutionMode) => void;
  onClose: () => void;
}

export const ImportConflictModal: React.FC<ImportConflictModalProps> = ({
  isOpen,
  fileName,
  duplicateItems,
  newItems,
  onResolve,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<ConflictResolutionMode>('update_existing');
  const [showPreviewList, setShowPreviewList] = useState(false);

  if (!isOpen) return null;

  const totalIncoming = duplicateItems.length + newItems.length;

  return (
    <div className="m101-conflict-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="m101-conflict-dialog bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-[#e4e4e7] flex flex-col gap-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="m101-conflict-header flex items-center justify-between pb-3 border-b border-[#f4f4f5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shadow-2xs">
              <span className="material-symbols-outlined text-[22px]">
                sync_problem
              </span>
            </div>
            <div>
              <h3 className="text-sm font-bold font-headline text-[#18181b]">
                ตรวจพบข้อมูลซ้ำในไฟล์ที่นำเข้า
              </h3>
              <p className="text-xs text-[#71717a]">
                ไฟล์: <strong className="text-[#18181b] font-mono">{fileName}</strong>
              </p>
            </div>
          </div>
          <DSButton
            type="button"
            onClick={onClose}
            variant="ghost"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </DSButton>
        </div>

        {/* Stats Summary Box */}
        <div className="m101-conflict-summary grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl border border-[#e4e4e7] bg-[#fafafa]">
            <span className="text-[11px] text-[#71717a] block">ทั้งหมดในไฟล์</span>
            <span className="text-lg font-bold font-mono text-[#18181b]">
              {totalIncoming.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <span className="text-[11px] text-emerald-700 block">รายการใหม่</span>
            <span className="text-lg font-bold font-mono text-emerald-800">
              {newItems.length.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60">
            <span className="text-[11px] text-amber-800 block">ซ้ำตามเลขภาษี</span>
            <span className="text-lg font-bold font-mono text-amber-900">
              {duplicateItems.length.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Conflict Resolution Options */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[#18181b]">
            โปรดเลือกวิธีจัดการรายการที่ซ้ำ:
          </label>

          {/* Option 1: Update Existing (Recommended) */}
          <label
            className={`m101-conflict-option ds-choice-option ${selectedMode === 'update_existing' ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="resolution_mode"
              value="update_existing"
              checked={selectedMode === 'update_existing'}
              onChange={() => setSelectedMode('update_existing')}
              className="mt-0.5"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <span>อัปเดตข้อมูลเดิม ({duplicateItems.length} รายการ) + เพิ่มรายการใหม่ ({newItems.length} รายการ)</span>
                <DSBadge variant="warning">แนะนำ</DSBadge>
              </span>
              <span
                className="text-[11px] mt-0.5 leading-relaxed text-slate-600"
              >
                นำข้อมูลใหม่จากไฟล์ไปอัปเดตทับรายการเดิมที่มีเลขประจำตัวผู้เสียภาษีตรงกัน (เช่น รหัสผ่าน, วันที่แจ้งผู้สอบ, รหัส e-Filing) และนำเข้ารายการใหม่อัตโนมัติ
              </span>
            </div>
          </label>

          {/* Option 2: Skip Duplicates */}
          <label
            className={`m101-conflict-option ds-choice-option ${selectedMode === 'skip_duplicates' ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="resolution_mode"
              value="skip_duplicates"
              checked={selectedMode === 'skip_duplicates'}
              onChange={() => setSelectedMode('skip_duplicates')}
              className="mt-0.5"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold">
                ข้ามรายการที่ซ้ำ (นำเข้าเฉพาะรายการใหม่ {newItems.length} รายการ)
              </span>
              <span
                className="text-[11px] mt-0.5 leading-relaxed text-slate-600"
              >
                ไม่แก้ไขข้อมูลเดิมในระบบ และข้ามรายการที่เลขผู้เสียภาษีซ้ำทั้งหมด โดยจะนำเข้าเฉพาะกิจการที่ยังไม่เคยมีในระบบ
              </span>
            </div>
          </label>

          {/* Option 3: Import All as New (Allow duplicates) */}
          <label
            className={`m101-conflict-option ds-choice-option ${selectedMode === 'import_all' ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name="resolution_mode"
              value="import_all"
              checked={selectedMode === 'import_all'}
              onChange={() => setSelectedMode('import_all')}
              className="mt-0.5"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold">
                นำเข้าทั้งหมด {totalIncoming} รายการ (ยอมรับให้มีข้อมูลซ้ำ)
              </span>
              <span
                className="text-[11px] mt-0.5 leading-relaxed text-slate-600"
              >
                เพิ่มทุกรายการลงในระบบเป็นแถวใหม่โดยไม่สนใจว่ามีเลขผู้เสียภาษีซ้ำกับของเดิมหรือไม่
              </span>
            </div>
          </label>
        </div>

        {/* Duplicate Preview Collapsible */}
        <div className="border border-[#e4e4e7] rounded-xl overflow-hidden bg-[#fafafa]">
          <DSButton
            type="button"
            onClick={() => setShowPreviewList(!showPreviewList)}
            variant="ghost" className="ds-conflict-preview-toggle"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600">
                visibility
              </span>
              <span>ดูรายชื่อกิจการที่ซ้ำ ({duplicateItems.length} รายการ)</span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-slate-400">
              {showPreviewList ? 'expand_less' : 'expand_more'}
            </span>
          </DSButton>

          {showPreviewList && (
            <div className="max-h-48 overflow-y-auto divide-y divide-[#ececec] border-t border-[#e4e4e7] bg-white p-2">
              {duplicateItems.map(({ incoming, existing }, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between gap-3 text-xs">
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-[#18181b] truncate">
                      {incoming.companyName || existing.companyName}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717a]">
                      เลขภาษี: {existing.taxId} • ลำดับเดิม #{existing.sequenceNo}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <DSBadge variant="warning">ตรงกับในระบบ</DSBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f4f4f5]">
          <DSButton
            type="button"
            onClick={onClose}
            variant="secondary"
          >
            ยกเลิก
          </DSButton>
          <DSButton
            type="button"
            onClick={() => onResolve(selectedMode)}
            variant="primary" className="flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>
              {selectedMode === 'update_existing'
                ? 'ยืนยันการอัปเดตและนำเข้า'
                : selectedMode === 'skip_duplicates'
                ? 'ยืนยันข้ามรายการซ้ำ'
                : 'ยืนยันนำเข้าทั้งหมด'}
            </span>
          </DSButton>
        </div>
      </div>
    </div>
  );
};
