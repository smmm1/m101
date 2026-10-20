import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type VisitStats = { today_count: number; total_count: number };

const VISITOR_KEY = 'm101_public_stats_visitor_v1';

function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      if (!globalThis.crypto?.randomUUID) return null;
      id = globalThis.crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function LiveStatsBar() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const loadStats = async () => {
      const { data, error } = await supabase.rpc('get_m101_page_visit_stats');
      if (!active || error || !data?.[0]) return;
      setStats({
        today_count: Number(data[0].today_count ?? 0),
        total_count: Number(data[0].total_count ?? 0),
      });
    };

    const visitorId = getVisitorId();
    if (visitorId) {
      void supabase.rpc('record_m101_page_visit', { p_visitor_id: visitorId })
        .then(() => loadStats())
        .catch(() => loadStats());
    } else {
      void loadStats();
    }

    const channel = supabase.channel('m101-public-online-count', {
      config: { presence: { key: globalThis.crypto?.randomUUID?.() ?? `tab-${Date.now()}-${Math.random()}` } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const state = channel.presenceState();
        const count = Object.values(state).reduce((total, presences) => total + presences.length, 0);
        setOnlineCount(count);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ online: true, joined_at: new Date().toISOString() });
        }
      });

    return () => {
      active = false;
      void supabase?.removeChannel(channel);
    };
  }, []);

  return (
    <section aria-label="สถิติการเข้าชมเว็บไซต์" className="w-full border-b border-slate-200 bg-white/95 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300 sm:justify-end">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          ออนไลน์ขณะนี้ <strong className="tabular-nums text-slate-900 dark:text-white">{onlineCount ?? '—'}</strong>
        </span>
        <span>เข้าชมวันนี้ <strong className="tabular-nums text-slate-900 dark:text-white">{stats ? stats.today_count.toLocaleString('th-TH') : '—'}</strong></span>
        <span>ยอดสะสม <strong className="tabular-nums text-slate-900 dark:text-white">{stats ? stats.total_count.toLocaleString('th-TH') : '—'}</strong></span>
      </div>
    </section>
  );
}
