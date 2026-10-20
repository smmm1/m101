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
      className="flex min-h-8 w-full shrink-0 items-center justify-end gap-2 border-b border-slate-200/40 bg-[#f4f5f7]/70 px-4 py-1 text-[11px] font-medium text-slate-500/90 dark:border-slate-800/40 dark:bg-[#0b0f19]/70 dark:text-slate-400/90 sm:px-6"
    >
      <span>{dateTime.date}</span>
      <span className="opacity-40">·</span>
      <time className="tabular-nums tracking-wide">{dateTime.time}</time>
    </div>
  );
}
