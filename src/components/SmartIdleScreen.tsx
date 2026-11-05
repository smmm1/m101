import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_AFTER_MS = 180000;
const MAX_LINES = 180;
const STREAM_INTERVAL_MS = 680;

type LogLine = {
  id: number;
  time: string;
  host: string;
  unit: string;
  pid: number;
  level: 'INFO' | 'DEBUG' | 'NOTICE' | 'WARNING';
  message: string;
};

// Synthetic, internally consistent sample output for the AFK presentation.
// Reserved TEST-NET addresses are used so the display cannot be mistaken for live telemetry.
const scenario = [
  ['INFO', 'systemd[1]', 'Started Session 4 of User m101.'],
  ['INFO', 'systemd[1]', 'Reached target Network is Online.'],
  ['INFO', 'systemd[1]', 'Started nginx.service - A high performance web server.'],
  ['INFO', 'systemd[1]', 'Started m101-web.service - M101 application server.'],
  ['INFO', 'sshd[1842]', 'Server listening on 0.0.0.0 port 22.'],
  ['INFO', 'kernel', 'nf_conntrack: default automatic helper assignment has been turned off'],
  ['INFO', 'm101-web[2318]', 'Starting application runtime; environment=production node=v22.'],
  ['INFO', 'm101-web[2318]', 'Database pool initialized; min=2 max=10 idle_timeout=30000ms'],
  ['DEBUG', 'm101-web[2318]', 'Route registered GET /api/session/status'],
  ['DEBUG', 'm101-web[2318]', 'Route registered GET /api/directory/summary'],
  ['INFO', 'postgres[902]', 'connection authorized: user=directory_app database=m101 ssl=on'],
  ['DEBUG', 'postgres[902]', 'execute <unnamed>: SELECT id, updated_at FROM directory_entries ORDER BY updated_at DESC LIMIT 20'],
  ['INFO', 'postgres[902]', 'duration: 4.82 ms  rows=20'],
  ['INFO', 'nginx[1776]', '198.51.100.24 - - "GET /api/session/status HTTP/1.1" 200 184 "-" "Mozilla/5.0"'],
  ['INFO', 'm101-web[2318]', 'GET /api/session/status 200 7.6ms request_id=8f2a91c4'],
  ['DEBUG', 'm101-web[2318]', 'Session lookup completed; cache=HIT principal=owner'],
  ['INFO', 'nginx[1776]', '198.51.100.24 - - "GET /api/directory/summary HTTP/1.1" 200 1284 "-" "Mozilla/5.0"'],
  ['INFO', 'm101-web[2318]', 'GET /api/directory/summary 200 18.3ms request_id=8f2a91c5'],
  ['DEBUG', 'postgres[902]', 'execute <unnamed>: SELECT count(*) FROM directory_entries WHERE archived_at IS NULL'],
  ['INFO', 'postgres[902]', 'duration: 2.14 ms  rows=1'],
  ['INFO', 'nginx[1776]', '198.51.100.24 - - "GET /assets/app.css HTTP/1.1" 304 0 "-" "Mozilla/5.0"'],
  ['NOTICE', 'sshd[1901]', 'Accepted publickey for deploy from 203.0.113.18 port 52144 ssh2: ED25519 SHA256:sampleFingerprint'],
  ['INFO', 'systemd[1]', 'Started User Manager for UID 1001.'],
  ['DEBUG', 'm101-web[2318]', 'Background task queue checked; pending=0 running=0'],
  ['INFO', 'nginx[1776]', '203.0.113.77 - - "GET /.env HTTP/1.1" 404 153 "-" "curl/8.4.0"'],
  ['NOTICE', 'nginx[1776]', 'request blocked by location rule; path=/.env client=203.0.113.77 status=404'],
  ['INFO', 'm101-web[2318]', 'GET /.env 404 1.2ms request_id=8f2a91c6'],
  ['WARNING', 'sshd[1944]', 'Invalid user admin from 203.0.113.77 port 41822'],
  ['NOTICE', 'sshd[1944]', 'Connection closed by invalid user admin 203.0.113.77 port 41822 [preauth]'],
  ['INFO', 'kernel', 'UFW BLOCK IN=eth0 OUT= MAC=00:00:00:00:00:00 SRC=203.0.113.77 DST=192.0.2.10 PROTO=TCP DPT=23'],
  ['INFO', 'm101-web[2318]', 'Request completed; status=404 duration=1.2ms request_id=8f2a91c6'],
  ['DEBUG', 'postgres[902]', 'checkpoint starting: time'],
  ['DEBUG', 'postgres[902]', 'checkpoint complete: wrote 3 buffers; write=0.031s sync=0.002s'],
  ['INFO', 'systemd[1]', 'nginx.service: Main process exited, code=killed, status=0/SUCCESS'],
  ['INFO', 'systemd[1]', 'nginx.service: Scheduled restart job, restart counter is at 1.'],
  ['INFO', 'nginx[2055]', 'nginx/1.26.2 configured; worker process started'],
  ['INFO', 'm101-web[2318]', 'Health probe passed; database=ready cache=ready storage=ready'],
  ['DEBUG', 'm101-web[2318]', 'Event loop delay p95=8.4ms p99=14.1ms'],
  ['INFO', 'nginx[1776]', '198.51.100.24 - - "GET /api/directory/summary HTTP/1.1" 304 0 "-" "Mozilla/5.0"'],
  ['INFO', 'm101-web[2318]', 'GET /api/directory/summary 304 3.1ms request_id=8f2a91c7'],
  ['INFO', 'systemd[1]', 'Finished man-db.service - Daily man-db regeneration.'],
  ['DEBUG', 'm101-web[2318]', 'No pending background jobs; worker state=idle'],
] as const;

const levelColor: Record<LogLine['level'], string> = {
  INFO: 'text-[#8fa49a]',
  DEBUG: 'text-[#788b9c]',
  NOTICE: 'text-[#a5aa7d]',
  WARNING: 'text-[#c3a078]',
};

function createLine(id: number, index: number, baseTime: number): LogLine {
  const [level, source, message] = scenario[index % scenario.length];
  const match = /^(.*)\\[(\\d+)\\]$/.exec(source);
  const unit = match?.[1] ?? source;
  const pid = match ? Number(match[2]) : 0;
  const date = new Date(baseTime + index * 1100);
  const time = date.toISOString().replace('T', ' ').replace('Z', ' UTC');
  return {
    id,
    time,
    host: 'm101-node',
    unit,
    pid,
    level,
    message,
  };
}

export function SmartIdleScreen({ ownerPreviewEnabled = false }: { ownerPreviewEnabled?: boolean }) {
  const [isIdle, setIsIdle] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const logId = useRef(0);
  const scenarioIndex = useRef(0);
  const scenarioStart = useRef(Date.now());
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
    timer.current = setTimeout(
      () => setIsIdle(true),
      Math.max(0, IDLE_AFTER_MS - (Date.now() - lastActivity.current)),
    );
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

    scenarioIndex.current = 0;
    scenarioStart.current = Date.now() - 12 * 60 * 1000;
    logId.current = 0;
    const initial = Array.from({ length: 18 }, (_, i) => {
      scenarioIndex.current = i;
      return createLine(++logId.current, i, scenarioStart.current);
    });
    scenarioIndex.current = 18;
    setLogs(initial);

    streamTimer.current = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const index = scenarioIndex.current++;
      const next = createLine(++logId.current, index, scenarioStart.current);
      setLogs((current) => [...current.slice(-(MAX_LINES - 1)), next]);
    }, STREAM_INTERVAL_MS);

    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
      streamTimer.current = null;
    };
  }, [isIdle]);

  useEffect(() => {
    if (logContainer.current && isIdle) {
      logContainer.current.scrollTop = logContainer.current.scrollHeight;
    }
  }, [logs, isIdle]);

  if (!isIdle) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-[#080a09] text-[#c1c9c4]" role="status" aria-label="M101 terminal idle display">
      <div className="flex h-full min-h-0 flex-col font-mono text-[10px] sm:text-xs">
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-[#29312d] bg-[#101411] px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[#a5b2aa]">root@m101-node</span>
            <span className="text-[#58635c]">:</span>
            <span className="truncate text-[#87958c]">/var/log</span>
          </div>
          <span className="ml-3 shrink-0 text-[#78847c]">journalctl -f</span>
        </header>

        <div ref={logContainer} className="min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-5 sm:py-4" aria-live="off">
          <div className="mb-3 space-y-1 text-[#77857c]">
            <div>-- Logs begin at {new Date(scenarioStart.current).toISOString().replace('T', ' ').slice(0, 19)} UTC --</div>
            <div>m101-node systemd[1]: System journal stream attached.</div>
            <div className="text-[#68766d]">Following units: systemd · sshd · nginx · m101-web · postgres</div>
          </div>

          <div className="space-y-[3px]">
            {logs.map((line) => (
              <div key={line.id} className="grid grid-cols-[5.2rem_3.2rem_minmax(0,1fr)] gap-x-2 leading-[1.55] sm:grid-cols-[12.2rem_5.4rem_4.2rem_minmax(0,1fr)] sm:gap-x-3">
                <span className="hidden whitespace-nowrap text-[#65736a] sm:block">{line.time}</span>
                <span className="whitespace-nowrap text-[#65736a] sm:hidden">{line.time.slice(11, 19)}</span>
                <span className="truncate text-[#8d9a91]">{line.unit}{line.pid ? `[${line.pid}]` : ''}:</span>
                <span className={`hidden sm:block ${levelColor[line.level]}`}>{line.level}</span>
                <span className="break-all text-[#b8c2bb]">{line.message}</span>
              </div>
            ))}
            <div className="pt-1 text-[#9aa69e]">_</div>
          </div>
        </div>

        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-[#29312d] px-3 text-[9px] text-[#69766e] sm:px-5 sm:text-[10px]">
          <span>M101 / SYSTEM JOURNAL</span>
          <span>SIMULATED OUTPUT · WAITING FOR INPUT</span>
        </footer>
      </div>
    </div>
  );
}
