import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Active Online Users Management (Presence)
export type UserRole = 'admin' | 'member';

export interface OnlineUser {
  id: string;
  userName: string;
  currentScreen: string;
  joinedAt: number;
  lastActive: number;
  color?: string;
  role?: UserRole;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  color?: string;
  role?: 'user' | 'system';
  userRole?: UserRole;
}

const CHAT_STORAGE_FILE = path.join(process.cwd(), 'data', 'chat_messages.json');

function loadChatMessages(): ChatMessage[] {
  try {
    if (fs.existsSync(CHAT_STORAGE_FILE)) {
      const data = fs.readFileSync(CHAT_STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load chat messages:', e);
  }
  return [
    {
      id: 'sys-welcome',
      senderId: 'system',
      senderName: 'ระบบสื่อสาร Mustang',
      text: 'ยินดีต้อนรับสู่ห้องแชทสื่อสารทีม Mustang! ข้อความทั้งหมดจะถูกบันทึกไว้อย่างปลอดภัย แม้ออกจากระบบแชทก็ยังคงอยู่',
      timestamp: Date.now() - 3600000,
      color: '#059669',
      role: 'system',
    },
  ];
}

let chatMessages: ChatMessage[] = loadChatMessages();

function saveChatMessages() {
  try {
    const dir = path.dirname(CHAT_STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const trimmed = chatMessages.slice(-500);
    fs.writeFileSync(CHAT_STORAGE_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save chat messages:', e);
  }
}

const activeSockets = new Map<WebSocket, OnlineUser>();

function getActiveUsersList(): OnlineUser[] {
  const users: OnlineUser[] = [];
  activeSockets.forEach((user) => {
    users.push(user);
  });
  return users;
}

function broadcastPresence() {
  const payload = JSON.stringify({
    type: 'presence_update',
    users: getActiveUsersList(),
  });
  activeSockets.forEach((_, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

function broadcastChatMessage(message: ChatMessage) {
  const payload = JSON.stringify({
    type: 'new_chat_message',
    message,
  });
  activeSockets.forEach((_, socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

// REST API for chat messages
app.get('/api/chat/messages', (_req, res) => {
  res.json({ success: true, messages: chatMessages });
});

app.post('/api/chat/messages', (req, res) => {
  const { text, senderId, senderName, color, userRole } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }
  const newMsg: ChatMessage = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    senderId: senderId || 'user',
    senderName: senderName || 'ผู้ใช้งาน',
    userRole: userRole || 'member',
    text: text.trim(),
    timestamp: Date.now(),
    color: color || '#10b981',
    role: 'user',
  };
  chatMessages.push(newMsg);
  saveChatMessages();
  broadcastChatMessage(newMsg);
  res.json({ success: true, message: newMsg });
});

// REST API fallback for presence
app.get('/api/presence', (_req, res) => {
  res.json({ success: true, users: getActiveUsersList() });
});

// REST API to kick a member (Admin action)
app.post('/api/presence/kick', (req, res) => {
  const { targetId, targetName, kickerName } = req.body;
  if (!targetId && !targetName) {
    return res.status(400).json({ error: 'Missing targetId or targetName' });
  }

  let kickedCount = 0;
  for (const [ws, user] of activeSockets.entries()) {
    if ((targetId && user.id === targetId) || (targetName && user.userName === targetName)) {
      if (user.role !== 'admin') {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'kicked',
                payload: {
                  reason: 'คุณถูกผู้ดูแลระบบ (Admin) เตะออกจากระบบ',
                  kickerName: kickerName || 'Admin',
                },
              })
            );
            ws.close();
          }
        } catch (e) {}
        activeSockets.delete(ws);
        kickedCount++;
      }
    }
  }

  broadcastPresence();
  res.json({ success: true, kickedCount });
});

// Initialize Google GenAI on server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API endpoint to parse documents (PDF, Images, etc.)
app.post('/api/extract-documents', async (req, res) => {
  try {
    const { fileData, mimeType, fileName } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ error: 'กรุณาส่งข้อมูลไฟล์ (fileData) และ mimeType' });
    }

    const prompt = `คุณคือระบบ OCR และผู้เชี่ยวชาญการอ่านเอกสารบัญชีและทะเบียนนิติบุคคลไทย (DBD / หนังสือรับรองนิติบุคคล / สรรพากร / ภ.ง.ด. / บอจ.5 / ตารางรายชื่อบริษัท)
โปรดอ่านและสกัดข้อมูลกิจการทั้งหมดที่ปรากฏในไฟล์ (${fileName || 'document'}) ออกมาเป็น JSON Array ของกิจการ:
แต่ละรายการต้องประกอบด้วย:
- sequenceNo: ลำดับ เช่น 01, 02 (ถ้ามี)
- taxId: เลขประจำตัวผู้เสียภาษี 13 หลัก (จัดรูปแบบ 0-1055-xxxxx-xx-x หรือรูปแบบ 13 หลัก)
- companyName: ชื่อบริษัท / ห้างหุ้นส่วนจำกัด / ร้านค้า
- type: ประเภท "company" (บริษัทจำกัด), "partnership" (ห้างหุ้นส่วนจำกัด), หรือ "individual" (บุคคลธรรมดา/ร้านค้า)
- auditorDate: วันที่แจ้งผู้สอบ หรือชื่อผู้สอบ (ถ้ามี)
- password: รหัสผ่าน (ถ้ามี)
- remark: หมายเหตุ / รายละเอียดเพิ่มเติม
- eFilingCode: รหัสยื่น e-Filing (ถ้ามี)
- ssoCode: เลขประกันสังคม (ถ้ามี)
- status: "completed" | "in_progress" | "pending"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: fileData
          }
        },
        {
          text: prompt
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sequenceNo: { type: Type.STRING },
              taxId: { type: Type.STRING },
              companyName: { type: Type.STRING },
              type: { type: Type.STRING },
              auditorDate: { type: Type.STRING },
              password: { type: Type.STRING },
              remark: { type: Type.STRING },
              eFilingCode: { type: Type.STRING },
              ssoCode: { type: Type.STRING },
              status: { type: Type.STRING }
            },
            required: ['companyName']
          }
        }
      }
    });

    const responseText = response.text || '[]';
    let records = [];
    try {
      records = JSON.parse(responseText);
    } catch {
      records = [];
    }

    return res.json({ success: true, records });
  } catch (error: any) {
    console.error('Document extraction error:', error);
    return res.status(500).json({ error: error.message || 'ไม่สามารถสกัดข้อมูลจากเอกสารได้' });
  }
});

async function start() {
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ec4899', '#06b6d4', '#14b8a6', '#6366f1'
  ];

  wss.on('connection', (ws) => {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'join') {
          const user: OnlineUser = {
            id: data.payload.id || Math.random().toString(36).substring(2, 9),
            userName: data.payload.userName || 'ผู้ใช้งาน',
            currentScreen: data.payload.currentScreen || 'dashboard',
            role: data.payload.role || 'member',
            joinedAt: Date.now(),
            lastActive: Date.now(),
            color: data.payload.color || colors[Math.floor(Math.random() * colors.length)],
          };
          activeSockets.set(ws, user);
          broadcastPresence();
          // Send chat history to user
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'chat_history',
                messages: chatMessages,
              })
            );
          }
        } else if (data.type === 'send_chat') {
          const text = (data.payload?.text || '').trim();
          if (text) {
            const sender = activeSockets.get(ws);
            const newMsg: ChatMessage = {
              id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              senderId: sender?.id || data.payload?.senderId || 'user',
              senderName: sender?.userName || data.payload?.senderName || 'ผู้ใช้งาน',
              userRole: sender?.role || data.payload?.userRole || 'member',
              text,
              timestamp: Date.now(),
              color: sender?.color || data.payload?.color || '#10b981',
              role: 'user',
            };
            chatMessages.push(newMsg);
            saveChatMessages();
            broadcastChatMessage(newMsg);
          }
        } else if (data.type === 'update') {
          const existing = activeSockets.get(ws);
          if (existing) {
            if (data.payload.userName) existing.userName = data.payload.userName;
            if (data.payload.currentScreen) existing.currentScreen = data.payload.currentScreen;
            if (data.payload.role) existing.role = data.payload.role;
            existing.lastActive = Date.now();
            activeSockets.set(ws, existing);
            broadcastPresence();
          }
        } else if (data.type === 'kick_user') {
          const { targetId, targetName, kickerName } = data.payload || {};
          let kickedCount = 0;
          for (const [targetWs, user] of activeSockets.entries()) {
            if ((targetId && user.id === targetId) || (targetName && user.userName === targetName)) {
              if (user.role !== 'admin') {
                try {
                  if (targetWs.readyState === WebSocket.OPEN) {
                    targetWs.send(
                      JSON.stringify({
                        type: 'kicked',
                        payload: {
                          reason: 'คุณถูกผู้ดูแลระบบ (Admin) เตะออกจากระบบ',
                          kickerName: kickerName || 'Admin',
                        },
                      })
                    );
                    targetWs.close();
                  }
                } catch (e) {}
                activeSockets.delete(targetWs);
                kickedCount++;
              }
            }
          }
          broadcastPresence();
        } else if (data.type === 'ping') {
          const existing = activeSockets.get(ws);
          if (existing) {
            existing.lastActive = Date.now();
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      activeSockets.delete(ws);
      broadcastPresence();
    });

    ws.on('error', () => {
      activeSockets.delete(ws);
      broadcastPresence();
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname : '';
    if (pathname === '/ws/presence') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server listening with WebSocket presence on port ${port}`);
  });
}

start();
