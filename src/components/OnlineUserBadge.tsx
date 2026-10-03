import React, { useState, useEffect } from 'react';

export const OnlineUserBadge: React.FC = () => {
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: any = null;
    let pingInterval: any = null;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'online_count' && typeof data.count === 'number') {
              setOnlineCount(data.count);
            }
          } catch {
            // silent
          }
        };

        ws.onclose = () => {
          clearInterval(pingInterval);
          startPolling();
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        startPolling();
      }
    };

    const fetchOnlineCount = async () => {
      try {
        const res = await fetch('/api/online-count');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.count === 'number') {
            setOnlineCount(data.count);
          }
        }
      } catch {
        // silent
      }
    };

    const startPolling = () => {
      fetchOnlineCount();
      if (!pollInterval) {
        pollInterval = setInterval(fetchOnlineCount, 5000);
      }
    };

    connectWs();

    return () => {
      if (ws) {
        ws.close();
      }
      clearInterval(pingInterval);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-medium shadow-2xs select-none"
      title="จำนวนคนออนไลน์ปัจจุบัน"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-mono font-bold text-emerald-700">
        {onlineCount}
      </span>
      <span className="text-[11px] text-emerald-800 font-medium">
        คนออนไลน์
      </span>
    </div>
  );
};
