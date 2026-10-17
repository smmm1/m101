import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SystemConfig } from '../context/SystemConfigContext';

interface VisualSiteEditorProps {
  userEmail: string;
  currentConfig: SystemConfig;
  onPublish: (config: SystemConfig) => void;
  onShowToast: (message: string, title?: string, type?: 'success' | 'error' | 'info') => void;
}

type FieldKey = keyof SystemConfig;
type Section = { id: string; title: string; description: string; fields: { key: FieldKey; label: string; help?: string }[] };

const SECTIONS: Section[] = [
  { id: 'brand', title: 'แบรนด์และข้อความ', description: 'ชื่อระบบ โลโก้ตัวอักษร และข้อความประกาศ', fields: [
    { key: 'appName', label: 'ชื่อเว็บไซต์' }, { key: 'appShortName', label: 'ชื่อย่อ' },
    { key: 'appInitial', label: 'ตัวอักษรโลโก้', help: 'ใช้ 1–3 ตัวอักษร' }, { key: 'appTagline', label: 'คำโปรยใต้ชื่อ' },
    { key: 'systemNotice', label: 'ประกาศระบบ', help: 'เว้นว่างได้หากไม่ต้องการแสดง' },
  ]},
  { id: 'pages', title: 'หน้าและหัวข้อ', description: 'แก้ชื่อหน้าและคำอธิบายหลัก', fields: [
    { key: 'dashboardTitle', label: 'หัวข้อภาพรวม' }, { key: 'dashboardSubtitle', label: 'คำอธิบายภาพรวม' },
    { key: 'businessListTitle', label: 'หัวข้อทะเบียนกิจการ' }, { key: 'businessListSubtitle', label: 'คำอธิบายทะเบียนกิจการ' },
    { key: 'settingsTitle', label: 'หัวข้อการตั้งค่า' }, { key: 'settingsSubtitle', label: 'คำอธิบายการตั้งค่า' },
    { key: 'adminTitle', label: 'หัวข้อหลังบ้าน' },
  ]},
  { id: 'navigation', title: 'เมนูนำทาง', description: 'แก้ข้อความของเมนูด้านข้าง', fields: [
    { key: 'menuDashboard', label: 'เมนูภาพรวม' }, { key: 'menuBusinessList', label: 'เมนูทะเบียนกิจการ' },
    { key: 'menuSettings', label: 'เมนูการตั้งค่า' },
  ]},
  { id: 'buttons', title: 'ปุ่มและการกระทำ', description: 'ปรับข้อความปุ่มหลักที่รองรับการตั้งค่า', fields: [
    { key: 'buttonAddText', label: 'ปุ่มเพิ่มรายการ' }, { key: 'buttonImportText', label: 'ปุ่มนำเข้าไฟล์' },
    { key: 'buttonSaveText', label: 'ปุ่มบันทึก' }, { key: 'buttonCancelText', label: 'ปุ่มยกเลิก' },
    { key: 'buttonDeleteText', label: 'ปุ่มลบ' }, { key: 'buttonPublishText', label: 'ปุ่มเผยแพร่' },
    { key: 'buttonPreviewText', label: 'ปุ่มพรีวิว' }, { key: 'buttonLogoutText', label: 'ปุ่มออกจากระบบ' },
  ]},
  { id: 'table', title: 'ตารางข้อมูล', description: 'แก้หัวคอลัมน์และข้อความสถานะ', fields: [
    { key: 'colSeq', label: 'คอลัมน์ลำดับ' }, { key: 'colName', label: 'คอลัมน์ชื่อกิจการ' },
    { key: 'colTaxId', label: 'คอลัมน์เลขผู้เสียภาษี' }, { key: 'colType', label: 'คอลัมน์ประเภท' },
    { key: 'colAuditor', label: 'คอลัมน์ผู้สอบบัญชี' }, { key: 'colPassword', label: 'คอลัมน์รหัสผ่าน' },
    { key: 'colEfiling', label: 'คอลัมน์ e-Filing' }, { key: 'colSso', label: 'คอลัมน์ประกันสังคม' },
    { key: 'colStatus', label: 'คอลัมน์สถานะ' }, { key: 'colAction', label: 'คอลัมน์การจัดการ' },
    { key: 'statusPending', label: 'สถานะรอดำเนินการ' }, { key: 'statusInProgress', label: 'สถานะกำลังทำ' },
    { key: 'statusCompleted', label: 'สถานะเสร็จสิ้น' },
  ]},
  { id: 'design', title: 'ดีไซน์และสไตล์', description: 'กำหนดสี ฟอนต์ และความโค้งขององค์ประกอบ', fields: [
    { key: 'primaryColor', label: 'สีหลัก' }, { key: 'accentColor', label: 'สีเน้น' },
    { key: 'pageBackground', label: 'สีพื้นหลังหน้า' }, { key: 'surfaceColor', label: 'สีพื้นผิวการ์ด/แผง' },
    { key: 'textColor', label: 'สีข้อความหลัก' }, { key: 'mutedTextColor', label: 'สีข้อความรอง' },
    { key: 'borderColor', label: 'สีเส้นขอบ' }, { key: 'fontFamily', label: 'ฟอนต์ระบบ' },
    { key: 'buttonRadius', label: 'ความโค้งของปุ่ม (px)' }, { key: 'cardRadius', label: 'ความโค้งของการ์ด (px)' },
    { key: 'sidebarWidth', label: 'ความกว้างเมนู (px)' },
  ]},
];

const COLOR_FIELDS = new Set<FieldKey>(['primaryColor', 'accentColor', 'pageBackground', 'surfaceColor', 'textColor', 'mutedTextColor', 'borderColor']);
const RANGE_FIELDS = new Set<FieldKey>(['buttonRadius', 'cardRadius', 'sidebarWidth']);

export const VisualSiteEditor: React.FC<VisualSiteEditorProps> = ({ userEmail, currentConfig, onPublish, onShowToast }) => {
  const [draft, setDraft] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
  const [activeSection, setActiveSection] = useState('design');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  const section = useMemo(() => SECTIONS.find((item) => item.id === activeSection) || SECTIONS[0], [activeSection]);

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
      if (error && error.code !== 'PGRST116') {
        setErrorMessage('โหลดค่าจากฐานข้อมูลไม่ได้: ' + error.message);
      }
      const savedDraft = data?.draft_content || data?.published_content || {};
      setDraft({ ...currentConfig, ...savedDraft });
      setPublishedAt(data?.published_at || null);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [currentConfig]);

  const updateField = (key: FieldKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const persist = async (publish: boolean) => {
    for (const key of COLOR_FIELDS) {
      if (!/^#[0-9a-f]{6}$/i.test(String(draft[key]))) {
        setErrorMessage('กรุณาใส่รหัสสี HEX ให้ถูกต้อง เช่น #2563eb');
        return;
      }
    }
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
      onShowToast('บันทึกการออกแบบไม่สำเร็จ', 'เกิดข้อผิดพลาด', 'error');
      return;
    }
    if (publish) {
      onPublish({ ...draft });
      setPublishedAt(now);
      onShowToast('เผยแพร่ดีไซน์และข้อความใหม่แล้ว', 'เผยแพร่สำเร็จ');
    } else {
      onShowToast('บันทึกฉบับร่างแล้ว หน้าเว็บจริงยังไม่เปลี่ยน', 'บันทึกฉบับร่าง', 'info');
    }
  };

  if (loading) return <div className="p-8 text-sm text-zinc-500">กำลังโหลดตัวแก้ไขเว็บไซต์…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Visual Site Builder</div>
          <h2 className="mt-1 text-lg font-black text-zinc-900">ตัวแก้ไขเว็บไซต์แบบ Visual</h2>
          <p className="mt-1 text-xs text-zinc-500">เลือกส่วนที่ต้องการแก้ไข ดูตัวอย่างทันที แล้วบันทึกร่างหรือเผยแพร่เมื่อพร้อม</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={saving} onClick={() => void persist(false)} className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50">{saving ? 'กำลังบันทึก…' : draft.buttonSaveText}</button>
          <button type="button" disabled={saving} onClick={() => void persist(true)} style={{ background: draft.primaryColor }} className="rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'กำลังเผยแพร่…' : draft.buttonPublishText}</button>
        </div>
      </div>
      {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</div>}
      <div className="grid min-h-[620px] grid-cols-1 gap-4 xl:grid-cols-[190px_minmax(300px,1fr)_320px]">
        <aside className="rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
          <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Page inspector</div>
          {SECTIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors ${activeSection === item.id ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
              <span className="material-symbols-outlined text-[16px]">{item.id === 'design' ? 'palette' : item.id === 'buttons' ? 'smart_button' : item.id === 'table' ? 'table_chart' : item.id === 'navigation' ? 'menu' : item.id === 'pages' ? 'web' : 'edit_note'}</span>
              {item.title}
            </button>
          ))}
          <div className="mx-2 mt-4 rounded-xl bg-zinc-50 p-3 text-[10px] leading-5 text-zinc-500">การตั้งค่าจะบันทึกลง Supabase เฉพาะเมื่อกดบันทึกหรือเผยแพร่</div>
        </aside>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-zinc-900">{section.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.fields.map(({ key, label, help }) => (
              <label key={key} className="flex flex-col gap-1.5 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                <span className="text-xs font-bold text-zinc-700">{label}</span>
                {COLOR_FIELDS.has(key) ? (
                  <div className="flex items-center gap-2">
                    <input aria-label={label} type="color" value={String(draft[key])} onChange={(event) => updateField(key, event.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-zinc-200 bg-white p-1" />
                    <input aria-label={label + ' HEX'} value={String(draft[key])} onChange={(event) => updateField(key, event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-mono" />
                  </div>
                ) : RANGE_FIELDS.has(key) ? (
                  <div className="flex items-center gap-3">
                    <input aria-label={label} type="range" min={key === 'sidebarWidth' ? 180 : 0} max={key === 'sidebarWidth' ? 320 : 28} value={Number(draft[key]) || 12} onChange={(event) => updateField(key, event.target.value)} className="min-w-0 flex-1" />
                    <span className="w-12 text-right text-xs font-mono text-zinc-500">{String(draft[key])}px</span>
                  </div>
                ) : key === 'fontFamily' ? (
                  <select value={String(draft[key])} onChange={(event) => updateField(key, event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs">
                    <option value="Inter, system-ui, sans-serif">Inter / System</option>
                    <option value="system-ui, sans-serif">System UI</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                  </select>
                ) : (
                  <input aria-label={label} value={String(draft[key] ?? '')} maxLength={240} onChange={(event) => updateField(key, event.target.value)} className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-xs outline-none focus:border-blue-500" />
                )}
                {help && <span className="text-[10px] leading-4 text-zinc-400">{help}</span>}
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-1">
            <div><h3 className="text-sm font-black text-zinc-900">Live preview</h3><p className="text-[10px] text-zinc-500">แสดงตัวอย่างจากฉบับร่าง</p></div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-black text-amber-800">DRAFT</span>
          </div>
          <div className="min-h-[500px] overflow-hidden border" style={{ backgroundColor: draft.pageBackground, color: draft.textColor, borderColor: draft.borderColor, borderRadius: draft.cardRadius + 'px', fontFamily: draft.fontFamily }}>
            <div className="flex min-h-14 items-center gap-2 border-b px-3" style={{ backgroundColor: draft.surfaceColor, borderColor: draft.borderColor }}>
              <div className="flex h-8 w-8 items-center justify-center text-sm font-black text-white" style={{ backgroundColor: draft.primaryColor, borderRadius: draft.buttonRadius + 'px' }}>{draft.appInitial || 'M'}</div>
              <div className="min-w-0"><div className="truncate text-xs font-black">{draft.appName}</div><div className="truncate text-[10px]" style={{ color: draft.mutedTextColor }}>{draft.appTagline}</div></div>
            </div>
            <div className="flex min-h-[440px]">
              <div className="hidden w-24 shrink-0 border-r p-2 sm:block" style={{ backgroundColor: draft.surfaceColor, borderColor: draft.borderColor }}>
                {[draft.menuDashboard, draft.menuBusinessList, draft.menuSettings].map((label, index) => <div key={label} className="mb-2 rounded-lg px-2 py-2 text-[9px] font-bold" style={{ backgroundColor: index === 0 ? draft.primaryColor : 'transparent', color: index === 0 ? '#fff' : draft.mutedTextColor }}>{label}</div>)}
              </div>
              <div className="min-w-0 flex-1 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: draft.accentColor }}>Workspace / {draft.appShortName}</div>
                <h4 className="mt-2 break-words text-base font-black">{draft.dashboardTitle}</h4>
                <p className="mt-1 break-words text-[10px] leading-5" style={{ color: draft.mutedTextColor }}>{draft.dashboardSubtitle}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="border p-2" style={{ backgroundColor: draft.surfaceColor, borderColor: draft.borderColor, borderRadius: draft.cardRadius + 'px' }}><div className="text-[9px]" style={{ color: draft.mutedTextColor }}>ทะเบียนกิจการ</div><div className="mt-1 text-sm font-black">93</div></div>
                  <div className="border p-2" style={{ backgroundColor: draft.surfaceColor, borderColor: draft.borderColor, borderRadius: draft.cardRadius + 'px' }}><div className="text-[9px]" style={{ color: draft.mutedTextColor }}>สถานะ</div><div className="mt-1 text-xs font-black">พร้อมใช้งาน</div></div>
                </div>
                {draft.systemNotice && <div className="mt-3 rounded-md border px-2 py-2 text-[9px]" style={{ borderColor: draft.borderColor, color: draft.mutedTextColor }}>ประกาศ: {draft.systemNotice}</div>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[draft.buttonAddText, draft.buttonImportText, draft.buttonSaveText, draft.buttonDeleteText, draft.buttonPublishText, draft.buttonPreviewText, draft.buttonLogoutText].map((label) => <span key={label} className="px-2.5 py-2 text-[9px] font-bold text-white" style={{ backgroundColor: draft.primaryColor, borderRadius: draft.buttonRadius + 'px' }}>{label}</span>)}
                  <span className="border px-2.5 py-2 text-[9px] font-bold" style={{ borderColor: draft.borderColor, color: draft.textColor, borderRadius: draft.buttonRadius + 'px' }}>{draft.buttonCancelText}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-[10px] leading-5 text-zinc-500">
            {publishedAt ? 'เผยแพร่ล่าสุด: ' + new Date(publishedAt).toLocaleString('th-TH') : 'ยังไม่มีข้อมูลเผยแพร่จากตัวแก้ไขนี้'}<br />
            พรีวิวนี้แสดงตัวอย่างดีไซน์และข้อความที่รองรับการตั้งค่า ไม่ใช่การแก้ตำแหน่งทุกองค์ประกอบแบบลากวางเหมือน Figma
          </div>
        </section>
      </div>
    </div>
  );
};
