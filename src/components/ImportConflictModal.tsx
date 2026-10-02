import React, { useState } from 'react';
import { BusinessRecord } from '../types';

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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-[#e4e4e7] flex flex-col gap-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f4f4f5]">
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
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Stats Summary Box */}
        <div className="grid grid-cols-3 gap-2.5">
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
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedMode === 'update_existing'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white border-[#e4e4e7] text-[#18181b] hover:bg-[#fafafa]'
            }`}
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
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono uppercase ${
                    selectedMode === 'update_existing'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  แนะนำ
                </span>
              </span>
              <span
                className={`text-[11px] mt-0.5 leading-relaxed ${
                  selectedMode === 'update_existing' ? 'text-neutral-300' : 'text-[#71717a]'
                }`}
              >
                นำข้อมูลใหม่จากไฟล์ไปอัปเดตทับรายการเดิมที่มีเลขประจำตัวผู้เสียภาษีตรงกัน (เช่น รหัสผ่าน, วันที่แจ้งผู้สอบ, รหัส e-Filing) และนำเข้ารายการใหม่อัตโนมัติ
              </span>
            </div>
          </label>

          {/* Option 2: Skip Duplicates */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedMode === 'skip_duplicates'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white border-[#e4e4e7] text-[#18181b] hover:bg-[#fafafa]'
            }`}
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
                className={`text-[11px] mt-0.5 leading-relaxed ${
                  selectedMode === 'skip_duplicates' ? 'text-neutral-300' : 'text-[#71717a]'
                }`}
              >
                ไม่แก้ไขข้อมูลเดิมในระบบ และข้ามรายการที่เลขผู้เสียภาษีซ้ำทั้งหมด โดยจะนำเข้าเฉพาะกิจการที่ยังไม่เคยมีในระบบ
              </span>
            </div>
          </label>

          {/* Option 3: Import All as New (Allow duplicates) */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedMode === 'import_all'
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                : 'bg-white border-[#e4e4e7] text-[#18181b] hover:bg-[#fafafa]'
            }`}
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
                className={`text-[11px] mt-0.5 leading-relaxed ${
                  selectedMode === 'import_all' ? 'text-neutral-300' : 'text-[#71717a]'
                }`}
              >
                เพิ่มทุกรายการลงในระบบเป็นแถวใหม่โดยไม่สนใจว่ามีเลขผู้เสียภาษีซ้ำกับของเดิมหรือไม่
              </span>
            </div>
          </label>
        </div>

        {/* Duplicate Preview Collapsible */}
        <div className="border border-[#e4e4e7] rounded-xl overflow-hidden bg-[#fafafa]">
          <button
            type="button"
            onClick={() => setShowPreviewList(!showPreviewList)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-[#18181b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
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
          </button>

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
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                      ตรงกับในระบบ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f4f4f5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#e4e4e7] text-[#18181b] hover:bg-[#f4f4f5] text-xs font-medium cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onResolve(selectedMode)}
            className="px-4 py-2 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">check</span>
            <span>
              {selectedMode === 'update_existing'
                ? 'ยืนยันการอัปเดตและนำเข้า'
                : selectedMode === 'skip_duplicates'
                ? 'ยืนยันข้ามรายการซ้ำ'
                : 'ยืนยันนำเข้าทั้งหมด'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
