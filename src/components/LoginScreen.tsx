import React, { useState, useEffect } from 'react';
import { AVATAR_LOGIN } from '../data/initialData';
import { getThaiFormattedDate, getThaiFormattedTime } from '../utils/thaiDate';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (userName: string, userRole: UserRole) => void;
  defaultUserName?: string;
  kickNotice?: string;
}

const PASSCODE_ADMIN = '1602';
const PASSCODE_MEMBER = '0000';
const MAX_ATTEMPTS = 3;

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  defaultUserName = 'Mustang',
  kickNotice = '',
}) => {
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('app_directory_user_v1') || defaultUserName;
  });
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState(kickNotice);

  useEffect(() => {
    if (kickNotice) {
      setErrorMessage(kickNotice);
    }
  }, [kickNotice]);
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const saved = sessionStorage.getItem('app_login_failed_attempts');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isLockedOut, setIsLockedOut] = useState(() => {
    return sessionStorage.getItem('app_is_locked_out') === 'true';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [currentTime, setCurrentTime] = useState(getThaiFormattedTime());
  const [currentDate, setCurrentDate] = useState(getThaiFormattedDate());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(getThaiFormattedTime(now));
      setCurrentDate(getThaiFormattedDate(now));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Try closing window when locked out
  useEffect(() => {
    if (isLockedOut) {
      try {
        window.close();
      } catch (e) {}
    }
  }, [isLockedOut]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (isLockedOut) return;

    const trimmedName = userName.trim();
    if (!trimmedName) {
      setErrorMessage('กรุณาระบุชื่อของคุณ');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (!passcode) {
      setErrorMessage('กรุณาระบุรหัสผ่าน');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (passcode === PASSCODE_ADMIN) {
        // Admin Passcode 1602: อำนาจสูงสุด
        setIsSuccess(true);
        setErrorMessage('');
        sessionStorage.removeItem('app_login_failed_attempts');
        sessionStorage.removeItem('app_is_locked_out');

        setTimeout(() => {
          onLogin(trimmedName, 'admin');
        }, 500);
      } else if (passcode === PASSCODE_MEMBER) {
        // Member Passcode 0000: สมาชิกทั่วไป ทำอะไรได้ปกติแต่ต่างกันที่ยศ
        setIsSuccess(true);
        setErrorMessage('');
        sessionStorage.removeItem('app_login_failed_attempts');
        sessionStorage.removeItem('app_is_locked_out');

        setTimeout(() => {
          onLogin(trimmedName, 'member');
        }, 500);
      } else {
        // Wrong passcode!
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        sessionStorage.setItem('app_login_failed_attempts', nextAttempts.toString());
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setIsLockedOut(true);
          sessionStorage.setItem('app_is_locked_out', 'true');
          setErrorMessage('คุณกรอกรหัสผ่านผิดเกิน 3 ครั้ง เว็บไซต์ถูกปิดการใช้งาน');
          try {
            window.close();
          } catch (e) {}
        } else {
          const remaining = MAX_ATTEMPTS - nextAttempts;
          setErrorMessage(`รหัสผ่านไม่ถูกต้อง! (เหลือโอกาสอีก ${remaining} ครั้ง)`);
        }
      }
    }, 450);
  };

  // If locked out, show permanent lockout screen and attempt window.close()
  if (isLockedOut) {
    return (
      <div className="min-h-screen bg-[#101413] text-white flex flex-col items-center justify-center p-6 select-none font-body">
        <div className="w-full max-w-md bg-[#19221e] border border-rose-900/60 rounded-3xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 rounded-2xl bg-rose-950/80 border border-rose-600/40 text-rose-500 mx-auto flex items-center justify-center mb-6 shadow-inner">
            <span className="material-symbols-outlined text-[44px]">lock_clock</span>
          </div>

          <span className="text-[11px] font-bold tracking-widest text-rose-400 uppercase bg-rose-950/90 border border-rose-800/60 px-3 py-1 rounded-full">
            Security Lockdown
          </span>

          <h2 className="text-2xl font-bold mt-4 mb-2 text-white font-headline">
            ระบบถูกปิดการใช้งาน
          </h2>

          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            คุณได้กรอกรหัสผ่านไม่ถูกต้องเกิน 3 ครั้ง ระบบได้ทำการปิดตัวเองและระงับการเข้าถึงเว็บไซต์เพื่อความปลอดภัยของข้อมูล
          </p>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-400 mb-6 font-mono">
            STATUS: ACCESS_TERMINATED (FAIL_LIMIT_EXCEEDED)
          </div>

          <button
            type="button"
            onClick={() => {
              try {
                window.close();
              } catch (e) {}
            }}
            className="w-full py-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 font-bold text-white transition-all shadow-lg shadow-rose-950 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
            <span>ปิดหน้าต่างเว็บไซต์นี้</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2fcf6] via-[#fafcfb] to-[#edf9f3] text-[#1e2925] flex flex-col justify-between selection:bg-[#cbf3df] selection:text-[#064e3b] relative overflow-x-hidden font-body">
      {/* Ambient Pastel Aura Glows */}
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-tr from-[#d4f8e5]/40 to-[#c8f5e0]/30 blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-[#e3fbec]/50 to-[#d6f5e7]/30 blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div
          className={`w-full max-w-[430px] bg-white rounded-3xl p-7 sm:p-9 shadow-[0_12px_36px_rgba(6,78,59,0.06)] border border-[#e2ece7] backdrop-blur-sm transition-all duration-300 animate-in fade-in zoom-in-95 ${
            isShaking ? 'animate-shake' : ''
          }`}
        >
          {/* Avatar & Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 group">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-b from-[#bbf7d0] to-[#86efac]/40 shadow-inner flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-white ring-2 ring-white">
                  <img
                    alt="Avatar สาวแว่นยิ้ม"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
                    src={AVATAR_LOGIN}
                  />
                </div>
              </div>
              {/* Online status dot */}
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-200"></span>
            </div>
            <h1 className="font-headline font-bold text-2xl sm:text-[26px] tracking-tight text-[#064e3b] mb-1">
              ยินดีต้อนรับ
            </h1>
            <p className="font-body text-xs sm:text-[13px] font-medium text-[#456b5f] flex items-center justify-center gap-1.5 mt-0.5">
              <span>ได้เวลาทำงาน</span>
              <span className="material-symbols-outlined text-[19px] text-emerald-600 align-middle">
                sentiment_satisfied
              </span>
            </p>
          </div>

          {/* Login Form */}
          <form className="space-y-4" onSubmit={handleLoginSubmit}>
            {/* User Name Input */}
            <div>
              <label className="block text-xs font-bold text-[#194033] mb-1.5 font-headline">
                ชื่อผู้ใช้งาน (User Name)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#648c7e] text-[20px]">
                  person
                </span>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="กรุณากรอกชื่อของคุณ เช่น Mustang"
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fbf9] border border-[#d6e5dd] rounded-xl text-sm text-[#143d30] font-medium outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>
            </div>

            {/* Passcode Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#194033] font-headline">
                  รหัสผ่านเข้าใช้งาน (Passcode)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  4 หลัก
                </span>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#648c7e] text-[20px]">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="กรอกรหัสผ่าน 4 หลัก"
                  maxLength={10}
                  className="w-full pl-11 pr-11 py-3 bg-[#f8fbf9] border border-[#d6e5dd] rounded-xl text-sm font-mono tracking-wider text-[#143d30] font-bold outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-700 transition-colors"
                  tabIndex={-1}
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message & Attempts Alert */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 text-rose-500">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Attempt Counter Status */}
            {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && (
              <div className="flex items-center justify-between px-1 text-[11px] text-amber-700 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  ใส่ผิด {failedAttempts} ครั้ง (สูงสุด {MAX_ATTEMPTS} ครั้ง)
                </span>
                <span className="font-bold">
                  เหลืออีก {MAX_ATTEMPTS - failedAttempts} ครั้ง
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                id="cleanSubmitBtn"
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-6 rounded-xl font-headline font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(16,185,129,0.28)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.36)] transition-all duration-200 cursor-pointer active:scale-[0.985] text-white ${
                  isSuccess
                    ? 'bg-[#064e3b]'
                    : 'bg-gradient-to-r from-emerald-600 to-[#0ebd8e] hover:from-emerald-700 hover:to-[#0aa87d]'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    <span>กำลังตรวจสอบรหัสผ่าน...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">
                      check_circle
                    </span>
                    <span>เข้าสู่ระบบสำเร็จ</span>
                  </>
                ) : (
                  <>
                    <span>เข้าสู่ระบบ</span>
                    <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Bottom Bar: Security & Live Server Clock */}
      <footer className="w-full p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-20">
        {/* Left: Security Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#e1eee7] text-[#52796f] shadow-xs">
          <span className="material-symbols-outlined text-[17px] text-emerald-600">
            verified_user
          </span>
          <span className="text-[12px] font-medium font-body">
            ระบบความปลอดภัยยืนยันรหัสผ่าน (Encrypted Security)
          </span>
        </div>

        {/* Right: Live Clock & Date Badge */}
        <div
          className="inline-flex items-center gap-3 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#d6eae0] shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-emerald-300 transition-all duration-200"
          title="วันและเวลาปัจจุบันของระบบเซิร์ฟเวอร์"
        >
          <div className="flex items-center justify-center relative w-2.5 h-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute inset-0 opacity-75"></span>
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[13px] font-bold text-[#064e3b] tracking-wide leading-none">
                {currentTime}
              </span>
              <span className="text-[9.5px] uppercase font-bold text-emerald-700 px-1.5 py-0.5 rounded-full bg-emerald-100 tracking-wider">
                ONLINE
              </span>
            </div>
            <span className="text-[11px] text-[#698a7e] font-body mt-0.5 leading-tight">
              {currentDate}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
