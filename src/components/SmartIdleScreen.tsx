import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_AFTER_MS = 180000;
const MAX_LINES = 160;

type LogLine = { id: number; time: string; level: 'INFO' | 'DEBUG' | 'NOTICE' | 'WARN'; message: string };

const templates = [
  'worker[{pid}]: request completed; duration={ms}ms status=200',
  'edge-router: upstream connection reused; keepalive=true',
  'directory-index: lookup completed; result=HIT key={hex}',
  'db-pool: connection returned to pool; active={n}/32',
  'query-engine: statement completed; duration={ms}ms rows={n}',
  'storage-adapter: metadata read; object=records/{hex}',
  'http: GET /api/session/status HTTP/1.1 200 bytes={bytes}',
  'http: GET /api/directory/summary HTTP/1.1 304 bytes=0',
  'scheduler: background maintenance cycle completed',
  'runtime: heap usage stable; allocated={n}MB',
  'network: socket established; rtt={ms}ms retransmits=0',
  'file-indexer: manifest checksum verified; sha256={hex}',
  'process[{pid}]: event loop delay={ms}ms',
  'health-check: component={component} result=ok',
  'queue: consumer idle; pending=0 acknowledged=0',
  'metrics: sample flushed; series={n} labels={small}',
  'cache: entry expiration evaluated; stale=false',
  'database: transaction committed; isolation=read committed',
  'connection: peer closed normally; code=1000',
  'worker[{pid}]: scheduled task completed; result=success',
];

const opening = [
  'terminal output stream attached',
  'runtime environment loaded; profile=production',
  'application process manager connected',
  'configuration checksum verified',
  'database connection pool ready',
  'edge request router listening',
  'background task scheduler initialized',
  'system monitor entered steady state',
];

function hex() {
  return Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function format(template: string) {
  return template
    .replace('{hex}', hex())
    .replace('{pid}', String(1200 + Math.floor(Math.random() * 8000)))
    .replace('{ms}', String(2 + Math.floor(Math.random() * 40)))
    .replace('{bytes}', String(120 + Math.floor(Math.random() * 1800)))
    .replace('{n}', String(1 + Math.floor(Math.random() * 18)))
    .replace('{small}', String(1 + Math.floor(Math.random() * 8)))
    .replace('{component}', ['directory-api', 'edge-cache', 'database', 'session-store'][Math.floor(Math.random() * 4)]);
}

function makeLog(id: number, message?: string): LogLine {
  const roll = Math.random();
  return {
    id,
    time: new Date().toISOString().replace('T', ' ').replace('Z', ''),
    level: roll > 0.97 ? 'WARN' : roll > 0.76 ? 'DEBUG' : roll > 0.55 ? 'NOTICE' : 'INFO',
    message: message ?? format(templates[Math.floor(Math.random() * templates.length)]),
  };
}

export function SmartIdleScreen({ ownerPreviewEnabled = false }: { ownerPreviewEnabled?: boolean }) {
  const [isIdle, setIsIdle] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logId = useRef(0);
  const logContainer = useRef<HTMLDivElement>(null);
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
    const preview = () => {
      if (ownerPreviewEnabled) {
        lastActivity.current = Date.now();
        setIsIdle(true);
      }
    };
    window.addEventListener('m101:owner-preview-afk', preview);
    const visibility = () => {
      if (document.visibilityState === 'hidden') clearTimer();
      else if (Date.now() - lastActivity.current >= IDLE_AFTER_MS) setIsIdle(true);
      else schedule();
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

  useEffect(() => {
    if (!isIdle) {
      if (streamTimer.current) clearInterval(streamTimer.current);
      streamTimer.current = null;
      return;
    }
    setLogs(opening.map((message) => makeLog(++logId.current, message)));
    streamTimer.current = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const next = makeLog(++logId.current);
      setLogs((current) => [...current.slice(-(MAX_LINES - 1)), next]);
    }, 420);
    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
      streamTimer.current = null;
    };
  }, [isIdle]);

  useEffect(() => {
    if (logContainer.current && isIdle) logContainer.current.scrollTop = logContainer.current.scrollHeight;
  }, [logs, isIdle]);

  if (!isIdle) return null;
  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#050707] text-[#c5d0ca]" role="status" aria-label="M101 terminal idle display">
      <div className="flex h-full min-h-0 flex-col font-mono text-[11px] sm:text-xs">
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-[#26312d] bg-[#0b100e] px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[#7c9a89]">m101</span><span className="text-[#45534c]">/</span>
            <span className="truncate text-[#a9b8ae]">var/log/application.log</span>
          </div>
          <span className="ml-3 shrink-0 text-[#66766c]">tail -f</span>
        </header>
        <div ref={logContainer} className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-5 sm:py-4" aria-live="off">
          <div className="mb-3 text-[#87968c]">
            <div>Linux m101-node 6.8.0-runtime #1 SMP PREEMPT_DYNAMIC x86_64</div>
            <div>Application logging service — output stream attached</div>
            <div className="mt-2 text-[#9bb0a1]">--- log stream started ---</div>
          </div>
          <div className="space-y-[3px]">
            {logs.map((line) => (
              <div key={line.id} className="grid grid-cols-[auto_3.6rem_minmax(0,1fr)] gap-x-2 leading-[1.55] sm:grid-cols-[10.5rem_4rem_minmax(0,1fr)] sm:gap-x-3">
                <span className="whitespace-nowrap text-[#64736a]">{line.time}</span>
                <span className={line.level === 'WARN' ? 'text-[#c6a36a]' : line.level === 'DEBUG' ? 'text-[#718b9a]' : line.level === 'NOTICE' ? 'text-[#8bb5a0]' : 'text-[#76a889]'}>{line.level}</span>
                <span className="break-all text-[#b8c4bc]">{line.message}</span>
              </div>
            ))}
            <div className="pt-1 text-[#8eaa98]">_</div>
          </div>
        </div>
        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[#202a25] px-3 text-[10px] text-[#58675e] sm:px-5">
          <span>M101 / SESSION MONITOR</span><span>USER AFK · WAITING FOR INPUT</span>
        </footer>
      </div>
    </div>
  );
}
