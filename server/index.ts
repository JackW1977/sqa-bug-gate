import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';

import { createBug } from './handlers/bugHandler';
import { searchDuplicates } from './handlers/searchHandler';
import { getConfig, updateConfig, listProjects } from './handlers/configHandler';
import { rephraseWithGlean, setGleanToken, getGleanTokenStatus } from './handlers/gleanHandler';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

// ─── API Routes ───────────────────────────────────────────────────────────────

const api = express.Router();

api.post('/createBug', async (req, res) => {
  try {
    const result = await createBug(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.post('/searchDuplicates', async (req, res) => {
  try {
    const result = await searchDuplicates(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.get('/getConfig', async (_req, res) => {
  try {
    const result = await getConfig();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.post('/updateConfig', async (req, res) => {
  try {
    const result = await updateConfig(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.get('/listProjects', async (_req, res) => {
  try {
    const result = await listProjects();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.post('/rephraseWithGlean', async (req, res) => {
  try {
    const result = await rephraseWithGlean(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.post('/setGleanToken', async (req, res) => {
  try {
    const result = await setGleanToken(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

api.get('/getGleanTokenStatus', async (_req, res) => {
  try {
    const result = await getGleanTokenStatus();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.use('/api', api);

// ─── Serve frontend in production ─────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`[Software Bug Gate] Server running on http://localhost:${PORT}`);
});
