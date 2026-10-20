import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type DirectoryRow = {
  fiscal_year: string;
  records: Record<string, unknown>[];
  updated_at?: string | null;
};

const SECRET_KEY = /(password|passwd|passcode|pin|secret|token|efiling|sso|credential|api.?key|private.?key|access.?key)/i;
const MASK = '********';

function safeValue(value: unknown, key = ''): unknown {
  if (SECRET_KEY.test(key)) return MASK;
  if (Array.isArray(value)) return value.map((item) => safeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [childKey, safeValue(childValue, childKey)]));
  }
  return value;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่ใช่';
  return String(value);
}

function fieldLabel(key: string): string {
  const labels: Record<string, string> = {
    sequenceNo: 'ลำดับ',
    taxId: 'เลขประจำตัวผู้เสียภาษี',
    companyName: 'ชื่อกิจการ',
    type: 'ประเภท',
    auditorDate: 'วันที่ผู้ตรวจสอบ',
    password: 'รหัสผ่าน',
    remark: 'หมายเหตุ',
    eFilingCode: 'รหัส e-Filing',
    ssoCode: 'รหัสประกันสังคม',
    status: 'สถานะ',
    topic: 'หัวข้อ',
    sourceType: 'ประเภทแหล่งข้อมูล',
    sourceFileName: 'ชื่อไฟล์ต้นทาง',
    createdAt: 'วันที่สร้าง',
    updatedAt: 'วันที่แก้ไข',
    isVerifiedDbd: 'ตรวจสอบ DBD แล้ว',
  };
  return labels[key] || key;
}

export const PublicDirectoryView: React.FC<{ onAdminLogin: () => void }> = ({ onAdminLogin }) => {
  const [years, setYears] = useState<DirectoryRow[]>([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const { data, error: rpcError } = await supabase.rpc('get_public_directory_year_data');
      if (!active) return;
      if (rpcError) {
        setError('โหลดข้อมูลสาธารณะไม่สำเร็จ กรุณาลองใหม่ภายหลัง');
        setYears([]);
      } else {
        const rows = (Array.isArray(data) ? data as DirectoryRow[] : []).sort((a, b) => Number(b.fiscal_year) - Number(a.fiscal_year));
        setYears(rows);
        setSelectedYear((current) => rows.some((row) => row.fiscal_year === current) ? current : (rows[0]?.fiscal_year || ''));
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const records = useMemo(() => {
    const row = years.find((item) => item.fiscal_year === selectedYear);
    const all = (row?.records || []).map((record) => safeValue(record) as Record<string, unknown>);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter((record) => JSON.stringify(record).toLowerCase().includes(q));
  }, [years, selectedYear, search]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-800 font-bold text-white">M</div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold sm:text-lg">Mustang Directory</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400">ทะเบียนกิจการ · โหมดดูข้อมูลสาธารณะ</p>
            </div>
          </div>
          <button onClick={onAdminLogin} className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-zinc-700 dark:hover:bg-zinc-900 sm:px-4 sm:text-sm">เข้าสู่ระบบผู้ดูแล</button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">ทะเบียนกิจการทั้งหมด</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">เปิดดูได้โดยไม่ต้องเข้าสู่ระบบ · โหมดนี้ไม่สามารถแก้ไขข้อมูลได้</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[420px] sm:flex-row">
            <label className="flex-1 text-xs font-semibold text-slate-600 dark:text-zinc-300">
              รอบปีบัญชี
              <select value={selectedYear} onChange={(event) => { setSelectedYear(event.target.value); setSelectedRecord(null); }} className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white">
                {years.map((row) => <option key={row.fiscal_year} value={row.fiscal_year}>ปี {row.fiscal_year}</option>)}
              </select>
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-600 dark:text-zinc-300">
              ค้นหาข้อมูล
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ชื่อกิจการ เลขภาษี หรือข้อมูลอื่น..." className="mt-1.5 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 placeholder:text-slate-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white" />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900">กำลังโหลดข้อมูล…</div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}. โปรดแจ้งผู้ดูแลระบบหากยังพบปัญหา</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-zinc-800">
                <h3 className="text-sm font-bold">รายการกิจการ</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{records.length} รายการ</span>
              </div>
              <div className="max-h-[68vh] overflow-auto">
                {records.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">ไม่พบข้อมูล</p> : records.map((record, index) => {
                  const id = String(record.id ?? record.sequenceNo ?? index);
                  const active = selectedRecord === record;
                  return <button key={id} onClick={() => setSelectedRecord(record)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-blue-50/70 dark:border-zinc-800 dark:hover:bg-zinc-800/70 ${active ? 'bg-blue-50 dark:bg-blue-950/40' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 min-w-8 rounded-lg bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{String(record.sequenceNo ?? index + 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{String(record.companyName ?? 'ไม่ระบุชื่อกิจการ')}</p>
                        <p className="mt-1 break-all text-xs text-slate-500 dark:text-zinc-400">{String(record.taxId ?? '')}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">ดูรายละเอียด ›</span>
                    </div>
                  </button>;
                })}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-zinc-800"><h3 className="text-sm font-bold">รายละเอียดกิจการ</h3><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">ข้อมูลสำคัญจะถูกปิดบังก่อนส่งจากฐานข้อมูล</p></div>
              {!selectedRecord ? (
                <div className="p-8 text-center text-sm text-slate-500">เลือกรายการทางซ้ายเพื่อดูรายละเอียด</div>
              ) : (
                <div className="max-h-[68vh] overflow-auto p-4">
                  <h4 className="mb-4 break-words text-lg font-bold">{String(selectedRecord.companyName ?? 'รายละเอียดกิจการ')}</h4>
                  <dl className="space-y-3">
                    {Object.entries(selectedRecord).filter(([key]) => key !== 'id').map(([key, value]) => {
                      const safe = safeValue(value, key);
                      return <div key={key} className="grid grid-cols-[minmax(100px,0.7fr)_minmax(0,1.3fr)] gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-zinc-800">
                        <dt className="break-words text-xs font-semibold text-slate-500 dark:text-zinc-400">{fieldLabel(key)}</dt>
                        <dd className="min-w-0 break-words text-sm">{displayValue(safe)}</dd>
                      </div>;
                    })}
                  </dl>
                </div>
              )}
            </section>
          </div>
        )}
        <p className="mt-5 text-center text-xs text-slate-400">โหมดสาธารณะ · ไม่สามารถเพิ่ม ลบ หรือแก้ไขข้อมูลได้</p>
      </section>
    </main>
  );
};
