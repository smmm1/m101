import React, { useState } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';
import { supabase } from '../lib/supabase';
import { useSystemConfig } from '../context/SystemConfigContext';

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  defaultUserName?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { config } = useSystemConfig();
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
      setErrorMessage('บัญชีนี้ยังไม่ได้รับอนุญาตให้เข้าถึงระบบ กรุณาติดต่อผู้ดูแลระบบ');
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
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#090a0f] flex items-center justify-center p-4 sm:p-6 font-body relative transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggleButton />
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-[#11131a] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-xl dark:shadow-2xl flex flex-col gap-6">
        {/* Brand Monogram & Title */}
        <div className="flex flex-col items-center text-center gap-2.5 pb-2">
          <div
            style={{ backgroundColor: config.primaryColor }}
            className="w-11 h-11 rounded-xl text-white font-bold flex items-center justify-center text-base shadow-sm font-headline tracking-tight"
          >
            {config.appInitial || 'M'}
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-headline tracking-tight">
              {config.appName || 'Mustang Directory'}
            </h1>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {config.appTagline || 'ระบบบริหารจัดการนิติบุคคลและทะเบียนกิจการ'}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(''); setNotice(''); }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(''); setNotice(''); }}
            className={`rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            สร้างบัญชี
          </button>
        </div>

        {/* Login / Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              อีเมลสำหรับเข้าใช้งาน
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full h-10 px-3.5 bg-zinc-50/50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              รหัสผ่าน
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'login' ? 'รหัสผ่านของคุณ' : 'อย่างน้อย 8 ตัวอักษร'}
              className="w-full h-10 px-3.5 bg-zinc-50/50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 transition-colors"
            />
          </div>

          {errorMessage && (
            <div role="alert" className="rounded-xl border border-rose-200/80 dark:border-rose-900/80 bg-rose-50/80 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300">
              {errorMessage}
            </div>
          )}

          {notice && (
            <div role="status" className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/80 bg-emerald-50/80 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: config.primaryColor }}
            className="w-full h-10 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mt-1"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังดำเนินการ…</span>
              </span>
            ) : mode === 'login' ? (
              'เข้าสู่ระบบ'
            ) : (
              'สร้างบัญชี'
            )}
          </button>
        </form>

        <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500 text-center">
          ระบบความปลอดภัยขั้นสูง: การเข้าใช้งานจำกัดเฉพาะผู้ใช้งานที่ได้รับอนุญาตในระบบเท่านั้น
        </p>
      </div>
    </div>
  );
};
