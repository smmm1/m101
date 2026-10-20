import { useEffect, useState } from 'react';

function getBangkokDateTime() {
  const now = new Date();
  return {
    date: new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(now),
    time: new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  };
}

export function LiveStatsBar() {
  const [dateTime, setDateTime] = useState(getBangkokDateTime);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDateTime(getBangkokDateTime());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      aria-label="วันที่และเวลาปัจจุบัน"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-slate-300/20 bg-white/65 px-3 py-2 text-[11px] font-medium text-slate-500/90 shadow-sm backdrop-blur-md transition-opacity hover:bg-white/85 dark:border-slate-700/30 dark:bg-slate-950/55 dark:text-slate-400/90 dark:hover:bg-slate-950/80"
    >
      <span className="whitespace-nowrap">{dateTime.date}</span>
      <span className="opacity-40">·</span>
      <time className="whitespace-nowrap tabular-nums tracking-wide">{dateTime.time}</time>
    </div>
  );
}
