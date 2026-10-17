import React, { useState } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  defaultUserName?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const verifyAllowlist = async (normalizedEmail: string) => {
    const { data: allowed, error } = await supabase
      .from('allowed_users')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (error || !allowed) {
      await supabase.auth.signOut();
      setErrorMessage('บัญชีนี้ยังไม่ได้รับอนุญาตให้เข้าถึง Mustang Directory กรุณาติดต่อผู้ดูแลระบบ');
      return false;
    }
    onLogin(normalizedEmail);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setNotice('');
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password });
        if (error) {
          setErrorMessage(error.message.includes('already registered') ? 'อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ' : 'สร้างบัญชีไม่สำเร็จ: ' + error.message);
          return;
        }
        if (!data.session) {
          setNotice('ส่งคำยืนยันไปยังอีเมลแล้ว หากอีเมลนี้ได้รับอนุญาต ให้ยืนยันอีเมลก่อนเข้าสู่ระบบ');
          setMode('login');
          return;
        }
        if (data.user) await verifyAllowlist(normalizedEmail);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error || !data.user) {
        setErrorMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        return;
      }
      await verifyAllowlist(normalizedEmail);
    } catch {
      setErrorMessage('เชื่อมต่อระบบเข้าสู่ระบบไม่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4 font-body relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6"><ThemeToggleButton /></div>
      <div className="w-full max-w-sm bg-white dark:bg-[#121215] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col gap-5">
        <div className="flex items-center gap-3 pb-4 border-b border-[#f4f4f5] dark:border-[#27272a]">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 via-blue-600 to-indigo-800 text-white font-bold flex items-center justify-center">M</div>
          <div>
            <h1 className="text-base font-bold text-[#111827] dark:text-white">Mustang Directory</h1>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa]">ระบบสำหรับทีมงานที่ได้รับอนุญาต</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f4f5] dark:bg-[#18181b] p-1">
          <button type="button" onClick={() => {setMode('login');setErrorMessage('');setNotice('');}} className={`rounded-lg py-2 text-xs font-semibold ${mode==='login'?'bg-white dark:bg-[#27272a] shadow-sm':'text-[#71717a]'}`}>เข้าสู่ระบบ</button>
          <button type="button" onClick={() => {setMode('signup');setErrorMessage('');setNotice('');}} className={`rounded-lg py-2 text-xs font-semibold ${mode==='signup'?'bg-white dark:bg-[#27272a] shadow-sm':'text-[#71717a]'}`}>สร้างบัญชีที่ได้รับอนุญาต</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-medium text-[#52525b] dark:text-[#d4d4d8]">อีเมลทีมงาน</label>
            <input id="login-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="w-full h-10 px-3.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-sm text-[#18181b] dark:text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-medium text-[#52525b] dark:text-[#d4d4d8]">รหัสผ่าน</label>
            <input id="login-password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder={mode==='login'?'รหัสผ่านบัญชีของคุณ':'อย่างน้อย 8 ตัวอักษร'} className="w-full h-10 px-3.5 bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl text-sm text-[#18181b] dark:text-white focus:outline-none focus:border-blue-500" />
          </div>
          {errorMessage && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-900 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300">{errorMessage}</div>}
          {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">{notice}</div>}
          <button type="submit" disabled={loading} className="w-full h-10 rounded-xl text-sm font-semibold bg-[#18181b] hover:bg-black dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-white transition-colors disabled:opacity-50">
            {loading ? 'กำลังตรวจสอบสิทธิ์…' : mode==='login'?'เข้าสู่ระบบ':'สร้างบัญชี'}
          </button>
        </form>
        <p className="text-[11px] leading-5 text-[#71717a] dark:text-[#a1a1aa]">การสร้างบัญชีไม่ทำให้เข้าถึงข้อมูลได้เอง อีเมลต้องอยู่ในรายชื่อผู้ได้รับอนุญาตที่ผู้ดูแลกำหนดไว้ก่อน</p>
      </div>
    </div>
  );
};
