import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_AFTER_MS = 180000;

export function SmartIdleScreen({ ownerPreviewEnabled = false }: { ownerPreviewEnabled?: boolean }) {
  const [isIdle, setIsIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivity = useRef(Date.now());
  const lastPointerMove = useRef(0);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const schedule = useCallback(() => {
    clearTimer();
    if (document.visibilityState !== 'visible') return;
    timer.current = setTimeout(() => setIsIdle(true), Math.max(0, IDLE_AFTER_MS - (Date.now() - lastActivity.current)));
  }, [clearTimer]);

  const activity = useCallback((event?: Event) => {
    if (event?.type === 'pointermove') {
      const now = Date.now();
      if (now - lastPointerMove.current < 800) return;
      lastPointerMove.current = now;
    }
    lastActivity.current = Date.now();
    setIsIdle(false);
    schedule();
  }, [schedule]);

  useEffect(() => {
    const preview = () => { if (ownerPreviewEnabled) setIsIdle(true); };
    window.addEventListener('m101:owner-preview-afk', preview);
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        clearTimer();
      } else if (Date.now() - lastActivity.current >= IDLE_AFTER_MS) {
        setIsIdle(true);
      } else {
        schedule();
      }
    };
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'];
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }));
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', visibility);
    schedule();
    return () => {
      clearTimer();
      window.removeEventListener('m101:owner-preview-afk', preview);
      events.forEach((name) => window.removeEventListener(name, activity));
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', visibility);
    };
  }, [activity, clearTimer, schedule, ownerPreviewEnabled]);

  if (!isIdle) return null;
  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#080d10]" role="status" aria-live="polite">
      <img src="/smart-idle-scene.svg" alt="M101 developer terminal showing User AFK / Away From Keyboard" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    </div>
  );
}
