import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SiteContent } from '../types';

const DEFAULT_CONTENT: SiteContent = {
  siteName: 'Mustang Directory',
  dashboardHeading: 'ทะเบียนกิจการ',
  dashboardDescription: 'ระบบบริหารจัดการทะเบียนกิจการของคุณ',
  businessListHeading: 'ทะเบียนกิจการ',
};

interface CmsViewProps {
  userEmail: string;
  onPublishedChange: (content: SiteContent) => void;
  onShowToast: (message: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

export const CmsView: React.FC<CmsViewProps> = ({ userEmail, onPublishedChange, onShowToast }) => {
  const [draft, setDraft] = useState<SiteContent>(DEFAULT_CONTENT);
  const [published, setPublished] = useState<SiteContent>(DEFAULT_CONTENT);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_content')
        .select('draft_content, published_content, published_at')
        .eq('id', true)
        .maybeSingle();
      if (!active) return;
      if (error) {
        setErrorMessage('โหลดเนื้อหาไม่ได้: ' + error.message);
        setLoading(false);
        return;
      }
      if (data) {
        const nextDraft = { ...DEFAULT_CONTENT, ...(data.draft_content || {}) };
        const nextPublished = { ...DEFAULT_CONTENT, ...(data.published_content || {}) };
        setDraft(nextDraft);
        setPublished(nextPublished);
        setPublishedAt(data.published_at || null);
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const updateDraft = (key: keyof SiteContent, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const persistDraft = async (publish: boolean) => {
    setSaving(true);
    setErrorMessage('');
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      id: true,
      draft_content: draft,
      updated_at: now,
      updated_by: userEmail,
    };
    if (publish) {
      payload.published_content = draft;
      payload.published_at = now;
    }
    const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'id' });
    setSaving(false);
    if (error) {
      setErrorMessage('บันทึกไม่สำเร็จ: ' + error.message + (error.code === '42501' ? ' — บัญชีนี้อาจไม่มีสิทธิ์ผู้ดูแลระบบ' : ''));
      onShowToast('บันทึกเนื้อหาไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error');
      return;
    }
    if (publish) {
      setPublished({ ...draft });
      setPublishedAt(now);
      onPublishedChange({ ...draft });
      onShowToast('เผยแพร่เนื้อหาใหม่แล้ว หน้าเว็บใช้ข้อความชุดนี้ทันที', 'เผยแพร่สำเร็จ');
    } else {
      onShowToast('บันทึกฉบับร่างแล้ว ยังไม่เปลี่ยนข้อความบนหน้าเว็บจริง', 'บันทึกฉบับร่าง');
    }
  };

  const fields: { key: keyof SiteContent; label: string; help: string }[] = [
    { key: 'siteName', label: 'ชื่อเว็บไซต์', help: 'แสดงในแถบเมนูด้านซ้าย' },
    { key: 'dashboardHeading', label: 'หัวข้อหน้าแดชบอร์ด', help: 'หัวข้อหลักของหน้าแรกหลังเข้าสู่ระบบ' },
    { key: 'dashboardDescription', label: 'คำอธิบายหน้าแดชบอร์ด', help: 'ข้อความใต้หัวข้อหลัก' },
    { key: 'businessListHeading', label: 'หัวข้อทะเบียนกิจการ', help: 'ข้อความสำหรับหัวข้อทะเบียนกิจการในอนาคต' },
  ];

  if (loading) {
    return <div className="flex-1 p-8 text-sm text-zinc-500">กำลังโหลดเนื้อหา CMS…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#fafafa] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Content Management</div>
            <h1 className="mt-1 text-2xl font-bold text-zinc-900">จัดการเนื้อหาเว็บไซต์</h1>
            <p className="mt-1 text-sm text-zinc-500">แก้ไขข้อความ บันทึกฉบับร่าง และตรวจตัวอย่างก่อนเผยแพร่ โดยไม่ต้อง Deploy โค้ดใหม่</p>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => void persistDraft(false)} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
              {saving ? 'กำลังบันทึก…' : 'บันทึกฉบับร่าง'}
            </button>
            <button type="button" disabled={saving} onClick={() => void persistDraft(true)} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50">
              {saving ? 'กำลังบันทึก…' : 'เผยแพร่ขึ้นเว็บ'}
            </button>
          </div>
        </div>

        {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] gap-5 items-start">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-bold text-zinc-900">แก้ไขข้อความ</h2>
              <p className="mt-1 text-xs text-zinc-500">แก้ได้เฉพาะเนื้อหาในช่องเหล่านี้ โครงสร้างและข้อมูลทะเบียนเดิมจะไม่ถูกเปลี่ยน</p>
            </div>
            <div className="flex flex-col gap-4">
              {fields.map(({ key, label, help }) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-zinc-800">{label}</span>
                  {key === 'dashboardDescription' ? (
                    <textarea value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} rows={3} maxLength={240} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                  ) : (
                    <input value={draft[key]} onChange={(event) => updateDraft(key, event.target.value)} maxLength={100} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                  )}
                  <span className="text-xs text-zinc-500">{help}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
              ฉบับร่างจะยังไม่เปลี่ยนหน้าเว็บจริง จนกว่าจะกด “เผยแพร่ขึ้นเว็บ”
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">ตัวอย่างก่อนเผยแพร่</h2>
                <p className="text-xs text-zinc-500">ตัวอย่างจากข้อความฉบับร่างล่าสุด</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">PREVIEW</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-[#fafafa]">
              <div className="flex min-h-12 items-center gap-2 border-b border-zinc-200 bg-white px-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">M</div>
                <span className="text-sm font-bold text-zinc-900 break-words">{draft.siteName || 'ชื่อเว็บไซต์'}</span>
              </div>
              <div className="p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Mustang Directory</div>
                <h3 className="mt-2 text-xl font-bold text-zinc-900 break-words">{draft.dashboardHeading || 'หัวข้อหน้าแดชบอร์ด'}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600 break-words">{draft.dashboardDescription || 'คำอธิบายหน้าแดชบอร์ด'}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-white p-3"><div className="text-[11px] text-zinc-500">ทะเบียนกิจการ</div><div className="mt-1 text-lg font-bold text-zinc-900">93</div><div className="text-[10px] text-zinc-500">ตัวอย่างการ์ด</div></div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-3"><div className="text-[11px] text-zinc-500">สถานะ</div><div className="mt-1 text-sm font-bold text-emerald-700">พร้อมใช้งาน</div><div className="text-[10px] text-zinc-500">ตัวอย่างเท่านั้น</div></div>
                </div>
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
              {publishedAt ? <>เผยแพร่ล่าสุด: {new Date(publishedAt).toLocaleString('th-TH')}</> : 'ยังไม่มีการเผยแพร่จาก CMS'}
              <div className="mt-1">หัวข้อที่เผยแพร่อยู่: <strong className="text-zinc-700">{published.dashboardHeading}</strong></div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
