import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type VisitStats = { today_count: number; total_count: number };

const VISITOR_KEY = 'm101_public_stats_visitor_v1';
const TAB_KEY = 'm101_public_stats_tab_v1';
const JOINED_AT_KEY = 'm101_public_stats_joined_at_v1';
const ONLINE_GRACE_MS = 5_000;

function getStoredId(key: string): string | null {
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      if (!globalThis.crypto?.randomUUID) return null;
      id = globalThis.crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return null;
  }
}

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

function getJoinedAt(): number {
  try {
    const stored = Number(sessionStorage.getItem(JOINED_AT_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const now = Date.now();
    sessionStorage.setItem(JOINED_AT_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function LiveStatsBar() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [stats, setStats] = useState<VisitStats | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_m101_page_visit_stats');
        if (!active || error || !data?.[0]) return;
        setStats({
          today_count: Number(data[0].today_count ?? 0),
          total_count: Number(data[0].total_count ?? 0),
        });
      } catch {
        // Stats are optional and must never block the directory.
      }
    };

    // The database primary key (visitor_id, visit_date) makes refreshes idempotent.
    const visitorId = getVisitorId();
    if (visitorId) {
      void (async () => {
        try {
          await supabase.rpc('record_m101_page_visit', { p_visitor_id: visitorId });
        } finally {
          if (active) await loadStats();
        }
      })().catch(() => {
        // Keep the page usable if visit tracking is unavailable.
      });
    } else {
      void loadStats();
    }

    // A stable per-tab presence key prevents a refresh from briefly counting
    // the same tab as two separate visitors.
    const tabId = getStoredId(TAB_KEY) ?? `tab-${Date.now()}-${Math.random()}`;
    const joinedAt = getJoinedAt();
    const channel = supabase.channel('m101-public-online-count', {
      config: { presence: { key: tabId } },
    });

    type PresenceEntry = { joinedAt: number; offlineAt: number | null };
    const entries = new Map<string, PresenceEntry>();
    let currentlyPresent = new Set<string>();

    const updateCount = () => {
      if (!active) return;
      const now = Date.now();
      let count = 0;
      entries.forEach((entry, key) => {
        const isWithinOfflineGrace = entry.offlineAt === null || now - entry.offlineAt <= ONLINE_GRACE_MS;
        const hasBeenHereLongEnough = now - entry.joinedAt > ONLINE_GRACE_MS;
        if (isWithinOfflineGrace && hasBeenHereLongEnough) count += 1;
        if (entry.offlineAt !== null && now - entry.offlineAt > ONLINE_GRACE_MS) {
          entries.delete(key);
        }
      });
      setOnlineCount(count);
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        if (!active) return;
        const state = channel.presenceState();
        const nextPresent = new Set(Object.keys(state));
        const now = Date.now();

        nextPresent.forEach((key) => {
          const existing = entries.get(key);
          // Preserve this tab's original timer across refreshes in the same tab.
          const firstSeen = key === tabId ? joinedAt : existing?.joinedAt ?? now;
          entries.set(key, { joinedAt: firstSeen, offlineAt: null });
        });

        currentlyPresent.forEach((key) => {
          if (!nextPresent.has(key)) {
            const existing = entries.get(key);
            if (existing && existing.offlineAt === null) {
              entries.set(key, { ...existing, offlineAt: now });
            }
          }
        });

        currentlyPresent = nextPresent;
        updateCount();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({ online: true, joined_at: new Date(joinedAt).toISOString() });
        }
      });

    const interval = window.setInterval(updateCount, 500);

    return () => {
      active = false;
      window.clearInterval(interval);
      // removeChannel untracks presence; do not leave a manual stale online entry.
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <aside
      aria-label="สถิติการเข้าชมเว็บไซต์"
      className="fixed bottom-3 left-3 z-40 rounded-full border border-slate-300/20 bg-[#f4f5f7]/65 px-3 py-1.5 text-[10px] font-medium text-slate-500/80 opacity-75 shadow-none backdrop-blur-sm transition-opacity hover:opacity-100 dark:border-slate-700/30 dark:bg-[#0b0f19]/65 dark:text-slate-400/80"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
          ออนไลน์ <strong className="tabular-nums font-semibold">{onlineCount ?? '—'}</strong>
        </span>
        <span>วันนี้ <strong className="tabular-nums font-semibold">{stats ? stats.today_count.toLocaleString('th-TH') : '—'}</strong></span>
        <span>ทั้งหมด <strong className="tabular-nums font-semibold">{stats ? stats.total_count.toLocaleString('th-TH') : '—'}</strong></span>
      </div>
    </aside>
  );
}
