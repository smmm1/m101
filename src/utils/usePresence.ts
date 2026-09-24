import { useState, useEffect, useRef, useCallback } from 'react';
import { OnlineUser, ChatMessage, UserRole } from '../types';
import { playNotificationSound } from './sound';

const STORAGE_KEY_CHAT_CACHE = 'chat_messages_cache_v1';
const STORAGE_KEY_CHAT_POPUP = 'chat_popup_open_v1';
const STORAGE_KEY_TAB_SESSION = 'tab_session_id';
const STORAGE_KEY_MY_CHAT_CLEARED_AT = 'my_chat_cleared_at_v1';
const STORAGE_KEY_CHAT_SOUND = 'chat_sound_enabled_v1';

export function usePresence(
  userName: string,
  currentScreen: string,
  isLoggedIn: boolean,
  userRole: UserRole = 'member',
  onKicked?: (reason: string) => void
) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const onKickedRef = useRef(onKicked);

  useEffect(() => {
    onKickedRef.current = onKicked;
  }, [onKicked]);
  const [clearedAt, setClearedAt] = useState<number>(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY_MY_CHAT_CLEARED_AT);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAT_CACHE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_CHAT_POPUP) === 'true';
  });

  // Sound notification preference
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHAT_SOUND);
      return saved !== null ? saved === 'true' : true; // Default ON
    } catch {
      return true;
    }
  });
  const isSoundEnabledRef = useRef<boolean>(isSoundEnabled);

  // Latest incoming message for on-icon bubble notification
  const [latestIncomingMessage, setLatestIncomingMessage] = useState<ChatMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const isChatOpenRef = useRef<boolean>(isChatOpen);

  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
    try {
      localStorage.setItem(STORAGE_KEY_CHAT_SOUND, isSoundEnabled ? 'true' : 'false');
    } catch {}
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      if (next) {
        playNotificationSound();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
    localStorage.setItem(STORAGE_KEY_CHAT_POPUP, isChatOpen ? 'true' : 'false');
    if (isChatOpen) {
      setUnreadCount(0);
      setLatestIncomingMessage(null);
    }
  }, [isChatOpen]);

  // Auto clear latest incoming message bubble after 6 seconds
  useEffect(() => {
    if (latestIncomingMessage) {
      const timer = setTimeout(() => {
        setLatestIncomingMessage(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [latestIncomingMessage]);

  // Save messages to cache whenever they change
  useEffect(() => {
    if (chatMessages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_CHAT_CACHE, JSON.stringify(chatMessages.slice(-200)));
      } catch (e) {}
    }
  }, [chatMessages]);

  // Initialize or get unique tab session ID
  if (!sessionIdRef.current) {
    let existing = sessionStorage.getItem(STORAGE_KEY_TAB_SESSION);
    if (!existing) {
      existing = 'user-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem(STORAGE_KEY_TAB_SESSION, existing);
    }
    sessionIdRef.current = existing;
  }

  // Fallback REST fetch for presence
  const fetchPresenceRest = async () => {
    try {
      const res = await fetch('/api/presence');
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setOnlineUsers(data.users);
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  // Fallback REST fetch for chat
  const fetchChatRest = async () => {
    try {
      const res = await fetch('/api/chat/messages');
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setChatMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            prev.forEach((m) => map.set(m.id, m));
            data.messages.forEach((m: ChatMessage) => map.set(m.id, m));
            return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      }
    } catch {
      // Ignore network errors
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/presence`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);

          // Send join event
          ws.send(
            JSON.stringify({
              type: 'join',
              payload: {
                id: sessionIdRef.current,
                userName: userName || 'ผู้ใช้งาน',
                currentScreen: currentScreen || 'dashboard',
                role: userRole,
              },
            })
          );

          // Heartbeat ping every 25s
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'presence_update' && Array.isArray(data.users)) {
              setOnlineUsers(data.users);
            } else if (data.type === 'chat_history' && Array.isArray(data.messages)) {
              setChatMessages((prev) => {
                const map = new Map<string, ChatMessage>();
                prev.forEach((m) => map.set(m.id, m));
                data.messages.forEach((m: ChatMessage) => map.set(m.id, m));
                return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
              });
            } else if (data.type === 'kicked') {
              const reason = data.payload?.reason || 'คุณถูกผู้ดูแลระบบ (Admin) เตะออกจากระบบ';
              if (onKickedRef.current) {
                onKickedRef.current(reason);
              }
            } else if (data.type === 'new_chat_message' && data.message) {
              const msg: ChatMessage = data.message;
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              
              // Notification when message is from someone else
              if (msg.senderId !== sessionIdRef.current) {
                // Play chime sound if enabled
                if (isSoundEnabledRef.current) {
                  playNotificationSound();
                }

                // If chat is closed, increment badge count and display preview on the icon
                if (!isChatOpenRef.current) {
                  setUnreadCount((c) => c + 1);
                  setLatestIncomingMessage(msg);
                }
              }
            }
          } catch (err) {
            console.error('Presence/Chat parse error:', err);
          }
        };

        ws.onclose = () => {
          if (isUnmounted) return;
          setIsConnected(false);
          clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (e) {
        fetchPresenceRest();
        fetchChatRest();
        reconnectTimeout = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
    fetchPresenceRest();
    fetchChatRest();

    const backupInterval = setInterval(() => {
      fetchPresenceRest();
      fetchChatRest();
    }, 15000);

    return () => {
      isUnmounted = true;
      clearInterval(pingInterval);
      clearInterval(backupInterval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isLoggedIn]);

  // Update server whenever userName, currentScreen, or userRole changes
  useEffect(() => {
    if (!isLoggedIn || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'update',
        payload: {
          userName: userName || 'ผู้ใช้งาน',
          currentScreen: currentScreen || 'dashboard',
          role: userRole,
        },
      })
    );
  }, [userName, currentScreen, userRole, isLoggedIn]);

  // Send Chat Message action
  const sendChatMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'send_chat',
            payload: {
              text: trimmed,
              senderId: sessionIdRef.current,
              senderName: userName || 'ผู้ใช้งาน',
              userRole: userRole,
            },
          })
        );
      } else {
        // Fallback to REST API
        try {
          const res = await fetch('/api/chat/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: trimmed,
              senderId: sessionIdRef.current,
              senderName: userName || 'ผู้ใช้งาน',
              userRole: userRole,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.message) {
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
            }
          }
        } catch (err) {
          console.error('Failed to send chat via REST fallback:', err);
        }
      }
    },
    [userName, userRole]
  );

  const kickMember = useCallback(
    async (targetId: string, targetName: string) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'kick_user',
            payload: {
              targetId,
              targetName,
              kickerName: userName || 'Admin',
            },
          })
        );
      }

      try {
        await fetch('/api/presence/kick', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetId,
            targetName,
            kickerName: userName || 'Admin',
          }),
        });
      } catch (err) {
        console.error('Failed to kick member via REST:', err);
      }
    },
    [userName]
  );

  const clearMyChat = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY_MY_CHAT_CLEARED_AT, now.toString());
    } catch {}
    setClearedAt(now);
    setUnreadCount(0);
  }, []);

  const restoreMyChat = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_MY_CHAT_CLEARED_AT);
    } catch {}
    setClearedAt(0);
  }, []);

  const visibleChatMessages = clearedAt > 0
    ? chatMessages.filter((m) => m.timestamp > clearedAt)
    : chatMessages;

  return {
    onlineUsers,
    isConnected,
    mySessionId: sessionIdRef.current,
    chatMessages: visibleChatMessages,
    sendChatMessage,
    kickMember,
    clearMyChat,
    restoreMyChat,
    isChatCleared: clearedAt > 0,
    unreadCount,
    setUnreadCount,
    isChatOpen,
    setIsChatOpen,
    isSoundEnabled,
    toggleSound,
    latestIncomingMessage,
    clearLatestIncomingMessage: () => setLatestIncomingMessage(null),
  };
}
