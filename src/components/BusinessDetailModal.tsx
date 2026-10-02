import React, { useState } from 'react';
import { BusinessRecord, BusinessStatus } from '../types';
import {
  XpFolderIcon,
  XpKeyIcon,
  XpShieldIcon,
  XpEditIcon,
  XpTrashIcon,
  XpStatusSphere,
  XpCalendarIcon,
  XpBuildingIcon,
} from './ClassicIcons';

interface BusinessDetailModalProps {
  record: BusinessRecord | null;
  onClose: () => void;
  onEdit: (record: BusinessRecord) => void;
  onDelete: (id: string) => void;
  onStatusChange: (record: BusinessRecord, status: BusinessStatus) => void;
  onShowToast: (msg: string, title?: string) => void;
}

export const BusinessDetailModal: React.FC<BusinessDetailModalProps> = ({
  record,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onShowToast,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!record) return null;

  const copyToClipboard = (text: string, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`คัดลอก ${label} เรียบร้อย`, 'คัดลอกสำเร็จ');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getStatusBadge = (status: BusinessStatus) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'เสร็จสิ้น',
        };
      case 'in_progress':
        return {
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          label: 'กำลังดำเนินการ',
        };
      case 'pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'รอดำเนินการ',
        };
    }
  };

  const statusBadge = getStatusBadge(record.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e4e4e7] overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e4e4e7] bg-[#fafafa] flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
                #{record.sequenceNo || '00'}
              </span>
              <span className="text-[11px] text-[#71717a] px-2 py-0.5 rounded bg-white border border-[#e4e4e7]">
                {record.type === 'company'
                  ? 'บริษัทจำกัด'
                  : record.type === 'partnership'
                  ? 'ห้างหุ้นส่วน'
                  : 'บุคคลธรรมดา'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XpBuildingIcon size={20} />
              <h2 className="text-base font-bold text-[#18181b] tracking-tight truncate">
                {record.companyName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#71717a] hover:text-[#18181b] hover:bg-neutral-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status Row */}
          <div className="p-3 rounded-xl border border-[#e4e4e7] bg-[#fbfbfb] flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge.bg}`}
            >
              <XpStatusSphere status={record.status} size={12} />
              <span>{statusBadge.label}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStatusChange(record, 'pending')}
                className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  record.status === 'pending'
                    ? 'bg-amber-600 text-white font-medium shadow-2xs'
                    : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:bg-amber-50'
                }`}
              >
                รอดำเนินการ
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(record, 'in_progress')}
                className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  record.status === 'in_progress'
                    ? 'bg-sky-600 text-white font-medium shadow-2xs'
                    : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:bg-sky-50'
                }`}
              >
                กำลังทำ
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(record, 'completed')}
                className={`px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  record.status === 'completed'
                    ? 'bg-emerald-600 text-white font-medium shadow-2xs'
                    : 'bg-white border border-[#e4e4e7] text-[#71717a] hover:bg-emerald-50'
                }`}
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Tax ID */}
            <div className="p-3 rounded-xl border border-[#e4e4e7] bg-white flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                <XpFolderIcon size={14} />
                <span>เลขผู้เสียภาษี</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <span className="font-mono text-xs font-semibold text-[#18181b]">
                  {record.taxId || '-'}
                </span>
                {record.taxId && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(record.taxId, 'เลขภาษี', 'taxId')}
                    className="p-1 rounded hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'taxId' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* e-Filing */}
            <div className="p-3 rounded-xl border border-[#e4e4e7] bg-white flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                <span className="font-mono font-bold text-[10px] text-blue-600">e-F</span>
                <span>รหัส e-Filing</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <span className="font-mono text-xs font-semibold text-[#18181b]">
                  {record.eFilingCode || '-'}
                </span>
                {record.eFilingCode && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(record.eFilingCode, 'รหัส e-Filing', 'efiling')}
                    className="p-1 rounded hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'efiling' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* SSO Code */}
            <div className="p-3 rounded-xl border border-[#e4e4e7] bg-white flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                <XpShieldIcon size={14} />
                <span>ประกันสังคม</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <span className="font-mono text-xs font-semibold text-[#18181b]">
                  {record.ssoCode || '-'}
                </span>
                {record.ssoCode && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(record.ssoCode, 'ประกันสังคม', 'sso')}
                    className="p-1 rounded hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'sso' ? 'check' : 'content_copy'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="p-3 rounded-xl border border-[#e4e4e7] bg-white flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                <XpKeyIcon size={14} />
                <span>รหัสผ่าน</span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-1">
                <span className="font-mono text-xs font-semibold text-[#18181b]">
                  {record.password ? (showPassword ? record.password : '••••••••') : '-'}
                </span>
                {record.password && (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(record.password, 'รหัสผ่าน', 'password')}
                      className="p-1 rounded hover:bg-[#f4f4f5] text-[#71717a] hover:text-[#18181b] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedKey === 'password' ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-3 rounded-xl border border-[#e4e4e7] bg-white space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#71717a] flex items-center gap-1.5">
                <XpCalendarIcon size={14} />
                <span>แจ้งผู้สอบบัญชี:</span>
              </span>
              <span className="font-medium text-[#18181b]">{record.auditorDate || '-'}</span>
            </div>
            {record.remark && (
              <div className="pt-2 border-t border-[#f4f4f5]">
                <span className="text-[11px] text-[#71717a] block mb-1">หมายเหตุ:</span>
                <p className="text-xs text-[#27272a] bg-[#fafafa] p-2 rounded-lg border border-[#e4e4e7]/60">
                  {record.remark}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e4e4e7] bg-[#fafafa] flex items-center justify-between gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-rose-600 font-medium">ยืนยันการลบ?</span>
              <button
                type="button"
                onClick={() => {
                  onDelete(record.id);
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                ลบ
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded-lg border border-[#e4e4e7] bg-white text-xs text-[#71717a] cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-medium cursor-pointer"
            >
              <XpTrashIcon size={14} />
              <span>ลบรายการ</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#e4e4e7] bg-white hover:bg-[#f4f4f5] text-xs font-medium text-[#27272a] cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] hover:bg-black text-white text-xs font-medium cursor-pointer shadow-2xs"
            >
              <XpEditIcon size={14} />
              <span>แก้ไข</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
