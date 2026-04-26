import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import Notification from '../models/Notification.js';
import { registerSSEClient, unregisterSSEClient } from '../lib/sse.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medlink_secret';

/* SSE — EventSource can't set headers, so token comes via ?token= query param */
router.get('/stream', (req: any, res) => {
  const token = req.query.token as string;
  if (!token) return res.sendStatus(401);
  let user: any;
  try { user = jwt.verify(token, JWT_SECRET); } catch { return res.sendStatus(403); }
  req.user = user;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  res.write('event: connected\ndata: {}\n\n');

  registerSSEClient(user.id, res);
  const ping = setInterval(() => { try { res.write('event: ping\ndata: {}\n\n'); } catch { /* ignore */ } }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    unregisterSSEClient(user.id);
  });
});

/* Get all notifications for the logged-in doctor */
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const list = await Notification.find({ doctor: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(list.map((n: any) => ({ ...n, id: n._id.toString() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Mark one read */
router.put('/:id/read', authenticateToken, async (req: any, res) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, doctor: req.user.id }, { read: true });
    res.json({ message: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* Mark all read */
router.put('/read-all', authenticateToken, async (req: any, res) => {
  try {
    await Notification.updateMany({ doctor: req.user.id, read: false }, { read: true });
    res.json({ message: 'ok' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
