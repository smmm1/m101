import React, { useState, useRef, useEffect } from 'react';
import { ThemeToggleButton } from './ThemeToggleButton';

interface LoginScreenProps {
  onLogin: (userName: string) => void;
  defaultUserName?: string;
}

const VALID_PASSCODES = ['1602', '0000', '1234'];
const MAX_ATTEMPTS = 3;

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
}) => {
  const userName = 'Mustang';
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Popup state for "อะอะตาวิเศษเห็นหน้า"
  const [showMagicEyePopup, setShowMagicEyePopup] = useState(false);

  // Easter Egg: 5 consecutive eye clicks triggers running eyeball
  const [eyeClickCount, setEyeClickCount] = useState(0);
  const [isEyeRunning, setIsEyeRunning] = useState(false);
  const eyeResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Easter Egg: 6 consecutive clicks on 'M' logo spawns runaway "เข้าสู่ระบบทันที" button
  const [logoClicks, setLogoClicks] = useState(0);
  const [showRunawayButton, setShowRunawayButton] = useState(false);
  const [isRunawayTamed, setIsRunawayTamed] = useState(false);
  const [tameEyeClicks, setTameEyeClicks] = useState(0);
  const [runawayPos, setRunawayPos] = useState({ x: 100, y: 100 });
  const [dodgeCount, setDodgeCount] = useState(0);
  const logoResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const runawayAutoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all pending timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (eyeResetTimerRef.current) clearTimeout(eyeResetTimerRef.current);
      if (logoResetTimerRef.current) clearTimeout(logoResetTimerRef.current);
      if (runawayAutoHideTimerRef.current) clearTimeout(runawayAutoHideTimerRef.current);
    };
  }, []);

  // Auto-hide helper: if no interaction/chase, button disappears after a while (6 seconds)
  const resetRunawayAutoHide = () => {
    if (runawayAutoHideTimerRef.current) {
      clearTimeout(runawayAutoHideTimerRef.current);
    }
    // If already tamed, do not auto-hide so the user can take their time to click it
    if (isRunawayTamed) return;

    runawayAutoHideTimerRef.current = setTimeout(() => {
      setShowRunawayButton(false);
      setIsRunawayTamed(false);
      setTameEyeClicks(0);
    }, 6000);
  };

  const handleLogoClick = () => {
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);

    if (logoResetTimerRef.current) {
      clearTimeout(logoResetTimerRef.current);
    }

    if (nextClicks >= 6) {
      setLogoClicks(0);
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 768;
      const startX = Math.min(winW - 180, Math.max(40, winW / 2 + 160));
      const startY = Math.min(winH - 80, Math.max(60, winH / 2 - 40));
      setRunawayPos({ x: startX, y: startY });
      setShowRunawayButton(true);
      setIsRunawayTamed(false);
      setTameEyeClicks(0);
      setDodgeCount(0);
      resetRunawayAutoHide();
    } else {
      logoResetTimerRef.current = setTimeout(() => {
        setLogoClicks(0);
      }, 2500);
    }
  };

  const handleRunawayDodge = () => {
    if (isRunawayTamed) return; // When tamed by eye clicks, it will never dodge!

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 768;
    const padding = 50;
    const btnW = 170;
    const btnH = 50;
    const maxW = Math.max(winW - btnW - padding, padding);
    const maxH = Math.max(winH - btnH - padding, padding);

    const newX = padding + Math.floor(Math.random() * (maxW - padding));
    const newY = padding + Math.floor(Math.random() * (maxH - padding));

    setRunawayPos({ x: newX, y: newY });
    setDodgeCount((prev) => prev + 1);

    // Reset inactivity auto-hide timer whenever dodged
    resetRunawayAutoHide();
  };

  const handleRunawayButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isRunawayTamed) {
      handleRunawayDodge();
      return;
    }
    // Successfully logged in via the tamed secret button!
    setIsSuccess(true);
    setShowRunawayButton(false);
    try {
      sessionStorage.removeItem('app_login_failed_attempts');
      sessionStorage.removeItem('app_is_locked_out');
    } catch {}
    setTimeout(() => onLogin(userName), 350);
  };

  const handleEyeToggle = () => {
    if (isEyeRunning) return;

    setShowPassword((prev) => !prev);

    // If the runaway button is currently active and not yet tamed:
    if (showRunawayButton && !isRunawayTamed) {
      const nextTameClicks = tameEyeClicks + 1;
      setTameEyeClicks(nextTameClicks);

      // Keep it from vanishing while user is actively clicking the eye
      resetRunawayAutoHide();

      if (nextTameClicks >= 4) {
        // Tame the runaway button: it stops fleeing and can now be clicked to login!
        setIsRunawayTamed(true);
        setTameEyeClicks(0);
        if (runawayAutoHideTimerRef.current) {
          clearTimeout(runawayAutoHideTimerRef.current);
        }
        return;
      }
    }

    const nextCount = eyeClickCount + 1;
    setEyeClickCount(nextCount);

    if (eyeResetTimerRef.current) {
      clearTimeout(eyeResetTimerRef.current);
    }

    if (nextCount >= 5) {
      // Trigger wild running eyeball easter egg!
      setIsEyeRunning(true);
      setEyeClickCount(0);

      setTimeout(() => {
        setIsEyeRunning(false);
      }, 2800);
    } else {
      // Reset counter after 3 seconds of inactivity
      eyeResetTimerRef.current = setTimeout(() => {
        setEyeClickCount(0);
      }, 3000);
    }
  };

  const [failedAttempts, setFailedAttempts] = useState(() => {
    try {
      const saved = sessionStorage.getItem('app_login_failed_attempts');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [isLockedOut, setIsLockedOut] = useState(() => {
    try {
      return sessionStorage.getItem('app_is_locked_out') === 'true';
    } catch {
      return false;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (isLockedOut) return;

    if (!passcode) {
      setErrorMessage('กรุณาระบุรหัสผ่าน');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      passwordInputRef.current?.focus();
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (VALID_PASSCODES.includes(passcode)) {
        setIsSuccess(true);
        setErrorMessage('');
        try {
          sessionStorage.removeItem('app_login_failed_attempts');
          sessionStorage.removeItem('app_is_locked_out');
        } catch {}
        setTimeout(() => onLogin(userName), 400);
      } else {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        try {
          sessionStorage.setItem('app_login_failed_attempts', nextAttempts.toString());
        } catch {}
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // Auto-clear password input when wrong and refocus
        setPasscode('');
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 50);

        if (nextAttempts >= MAX_ATTEMPTS) {
          setIsLockedOut(true);
          try {
            sessionStorage.setItem('app_is_locked_out', 'true');
          } catch {}
          setErrorMessage('กรอกรหัสผ่านผิดเกิน 3 ครั้ง ระบบถูกระงับชั่วคราว');
        } else {
          setErrorMessage(`รหัสผ่านไม่ถูกต้อง (เหลือโอกาส ${MAX_ATTEMPTS - nextAttempts} ครั้ง)`);
        }
      }
    }, 400);
  };

  if (isLockedOut) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4 font-body select-none relative">
        <div className="w-full max-w-sm bg-white dark:bg-[#121215] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col items-center gap-4 text-center animate-in fade-in">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">lock_clock</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#18181b] dark:text-[#f4f4f5] font-headline">ระบบถูกระงับการใช้งานชั่วคราว</h2>
            <p className="text-xs text-[#71717a] dark:text-[#a1a1aa] mt-1">
              กรอกรหัสผ่านผิดเกิน 3 ครั้ง
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem('app_is_locked_out');
                sessionStorage.removeItem('app_login_failed_attempts');
              } catch {}
              setIsLockedOut(false);
              setFailedAttempts(0);
              setPasscode('');
              setErrorMessage('');
            }}
            className="w-full h-9 rounded-xl bg-white dark:bg-[#18181b] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a] border border-[#e4e4e7] dark:border-[#27272a] text-xs font-medium text-[#18181b] dark:text-[#f4f4f5] transition-colors cursor-pointer shadow-2xs mt-2"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex items-center justify-center p-4 font-body select-none relative">
      {/* Top Right Theme Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggleButton />
      </div>

      {/* Main Login Card matching internal app components */}
      <div className="w-full max-w-sm bg-white dark:bg-[#121215] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-5 animate-in fade-in zoom-in-95">
        
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#f4f4f5] dark:border-[#27272a]">
          <button
            type="button"
            onClick={handleLogoClick}
            className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 via-blue-600 to-indigo-800 text-white font-bold flex items-center justify-center text-xs shadow-xs border border-blue-300/40 shrink-0 cursor-pointer active:scale-90 transition-transform"
            title="Mustang"
          >
            M
          </button>
          <span className="text-sm font-bold text-[#111827] dark:text-[#f4f4f5] font-headline tracking-tight">
            Mustang
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-[#71717a] dark:text-[#a1a1aa]">
                รหัสผ่าน
              </label>
              <button
                type="button"
                onClick={() => setShowMagicEyePopup(true)}
                className="text-[11px] text-[#71717a] hover:text-[#18181b] dark:text-[#a1a1aa] dark:hover:text-white transition-colors cursor-pointer"
              >
                สมัคร
              </button>
            </div>
            <div className="relative flex items-center">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="กรอกรหัสผ่าน"
                className={`w-full h-10 pl-3.5 pr-10 bg-white dark:bg-[#18181b] border rounded-xl text-xs text-[#18181b] dark:text-[#f4f4f5] placeholder:text-[#a1a1aa] dark:placeholder:text-[#71717a] focus:outline-none transition-colors ${
                  errorMessage
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-[#e4e4e7] dark:border-[#27272a] focus:border-[#18181b] dark:focus:border-[#e4e4e7]'
                } ${isShaking ? 'animate-shake' : ''}`}
                autoFocus
              />
              <button
                type="button"
                onClick={handleEyeToggle}
                className={`absolute right-3 text-[#a1a1aa] hover:text-[#18181b] dark:hover:text-[#f4f4f5] cursor-pointer transition-colors ${
                  isEyeRunning ? 'animate-crazy-eye text-blue-600 dark:text-blue-400 z-50' : ''
                }`}
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {isEyeRunning ? (
                  <span className="relative inline-flex items-center justify-center">
                    <span className="text-[20px] select-none filter drop-shadow-[0_0_8px_rgba(59,130,246,0.9)]">
                      👀
                    </span>
                    <span className="absolute -top-1 -right-2 text-[10px] animate-ping">
                      ✨
                    </span>
                    <span className="absolute -bottom-1 -left-2 text-[10px] animate-bounce">
                      💨
                    </span>
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400 shrink-0">
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full h-10 mt-1 rounded-xl text-xs font-semibold bg-[#18181b] hover:bg-black dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-white transition-colors cursor-pointer disabled:opacity-50 shadow-2xs flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>กำลังตรวจสอบ...</span>
            ) : isSuccess ? (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>เข้าสู่ระบบสำเร็จ</span>
              </>
            ) : (
              <span>เข้าสู่ระบบ</span>
            )}
          </button>
        </form>
      </div>

      {/* Magic Eye Popup Modal */}
      {showMagicEyePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-[#121215] border border-[#e4e4e7] dark:border-[#27272a] rounded-2xl p-6 shadow-xl relative flex flex-col items-center text-center gap-4 animate-in zoom-in-95">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowMagicEyePopup(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="ปิด"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <span className="text-2xl select-none">👀</span>
            </div>

            {/* Message */}
            <div className="px-2">
              <h3 className="text-base font-bold text-[#18181b] dark:text-[#f4f4f5] font-headline tracking-tight">
                อะอะตาวิเศษเห็นหน้า
              </h3>
            </div>

            {/* OK Button */}
            <button
              type="button"
              onClick={() => setShowMagicEyePopup(false)}
              className="w-full h-9 rounded-xl bg-[#18181b] hover:bg-black dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs mt-1"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Easter Egg: Elusive Runaway "เข้าสู่ระบบทันที" Button */}
      {showRunawayButton && (
        <div
          style={{
            position: 'fixed',
            left: `${runawayPos.x}px`,
            top: `${runawayPos.y}px`,
            transition: isRunawayTamed ? 'none' : 'all 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28)',
            zIndex: 9999,
          }}
          onMouseEnter={handleRunawayDodge}
          onMouseMove={handleRunawayDodge}
          onPointerDown={!isRunawayTamed ? (e) => {
            e.preventDefault();
            handleRunawayDodge();
          } : undefined}
          className="select-none pointer-events-auto"
        >
          <div className="relative group">
            <button
              type="button"
              onMouseEnter={handleRunawayDodge}
              onMouseMove={handleRunawayDodge}
              onClick={handleRunawayButtonClick}
              className={`px-4 py-2.5 rounded-full text-white text-xs font-bold shadow-2xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95 transition-all ${
                isRunawayTamed
                  ? 'bg-linear-to-r from-emerald-600 via-teal-600 to-green-600 border-2 border-emerald-300 ring-4 ring-emerald-400/40 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.7)] animate-pulse'
                  : 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 border-2 border-emerald-200/90 filter drop-shadow-[0_8px_16px_rgba(16,185,129,0.45)]'
              }`}
            >
              <span className={`material-symbols-outlined text-[17px] ${isRunawayTamed ? 'text-amber-200' : 'text-amber-300 animate-pulse'}`}>
                {isRunawayTamed ? 'verified' : 'bolt'}
              </span>
              <span>
                {isRunawayTamed ? 'เข้าสู่ระบบทันที (กดได้แล้ว!)' : 'เข้าสู่ระบบทันที'}
              </span>
              <span className="text-[12px] opacity-90">
                {isRunawayTamed ? '✨' : '💨'}
              </span>
            </button>
            {!isRunawayTamed && dodgeCount > 0 && (
              <span className="absolute -top-2.5 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                {dodgeCount}
              </span>
            )}
            {isRunawayTamed && (
              <span className="absolute -top-2.5 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs animate-bounce">
                READY
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
