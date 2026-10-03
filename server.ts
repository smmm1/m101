import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.development.local', '.env'], quiet: true });

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const { loadData, saveData, isValidPayload } = await import('./api/data');

app.get('/api/data', async (_req, res) => {
  try {
    res.json(await loadData());
  } catch (error) {
    console.error('Failed to load data', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

const handleSave: express.RequestHandler = async (req, res) => {
  if (!isValidPayload(req.body)) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  try {
    await saveData(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to save data', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
};

app.put('/api/data', handleSave);
app.post('/api/data', handleSave);

async function start() {
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Share the HTTP server so the HMR WebSocket uses the same port the preview proxies.
        ws: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
