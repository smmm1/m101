import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastOnlineCount() {
  const activeCount = wss.clients.size;
  const payload = JSON.stringify({ type: 'online_count', count: activeCount });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  broadcastOnlineCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      // ignore non-json
    }
  });

  ws.on('close', () => {
    broadcastOnlineCount();
  });

  ws.on('error', () => {
    broadcastOnlineCount();
  });
});

// HTTP Fallback API endpoint for online user count
app.get('/api/online-count', (_req, res) => {
  res.json({ count: Math.max(1, wss.clients.size) });
});

async function start() {
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
    console.log(`Server listening on port ${port}`);
  });
}

start();
