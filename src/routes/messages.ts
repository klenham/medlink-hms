import express from 'express';
import Thread  from '../models/Thread.js';
import Message from '../models/Message.js';
import User    from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/* ── GET /threads  — all conversations for the logged-in user ── */
router.get('/threads', authenticateToken, async (req: any, res) => {
  try {
    const threads = await Thread.find({ participants: req.user.id })
      .populate('participants', 'name role')
      .populate('lastSenderId', 'name')
      .sort({ lastMessageAt: -1 })
      .lean();

    // Attach unread count per thread
    const withUnread = await Promise.all(
      threads.map(async (t: any) => {
        const unread = await Message.countDocuments({
          thread: t._id,
          readBy: { $nin: [req.user.id] },
          sender: { $ne: req.user.id },
        });
        return {
          ...t,
          id: t._id.toString(),
          participants: t.participants.map((p: any) => ({ ...p, id: p._id.toString() })),
          unread,
        };
      })
    );

    res.json(withUnread);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /threads  — create or retrieve a 1-on-1 thread ── */
router.post('/threads', authenticateToken, async (req: any, res) => {
  const { recipientId } = req.body;
  if (!recipientId) return res.status(400).json({ error: 'recipientId is required' });
  if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });

  try {
    // Find existing thread with exactly these two participants
    let thread = await Thread.findOne({
      participants: { $all: [req.user.id, recipientId], $size: 2 },
    });

    if (!thread) {
      thread = await Thread.create({ participants: [req.user.id, recipientId] });
    }

    const populated = await Thread.findById(thread._id)
      .populate('participants', 'name role')
      .lean() as any;

    res.json({
      ...populated,
      id: populated._id.toString(),
      participants: populated.participants.map((p: any) => ({ ...p, id: p._id.toString() })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /threads/:id/messages ── */
router.get('/threads/:id/messages', authenticateToken, async (req: any, res) => {
  try {
    // Verify requester is a participant
    const thread = await Thread.findOne({ _id: req.params.id, participants: req.user.id });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const messages = await Message.find({ thread: req.params.id })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    res.json(
      messages.map((m: any) => ({
        ...m,
        id: m._id.toString(),
        sender: { ...m.sender, id: m.sender._id.toString() },
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /threads/:id/messages  — send a message ── */
router.post('/threads/:id/messages', authenticateToken, async (req: any, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

  try {
    const thread = await Thread.findOne({ _id: req.params.id, participants: req.user.id });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const msg = await Message.create({
      thread:  req.params.id,
      sender:  req.user.id,
      content: content.trim(),
      readBy:  [req.user.id],
    });

    await Thread.findByIdAndUpdate(req.params.id, {
      lastMessage:   content.trim().substring(0, 80),
      lastMessageAt: new Date(),
      lastSenderId:  req.user.id,
    });

    const populated = await Message.findById(msg._id)
      .populate('sender', 'name role')
      .lean() as any;

    res.status(201).json({
      ...populated,
      id: populated._id.toString(),
      sender: { ...populated.sender, id: populated.sender._id.toString() },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── PUT /threads/:id/read  — mark all messages in thread as read ── */
router.put('/threads/:id/read', authenticateToken, async (req: any, res) => {
  try {
    await Message.updateMany(
      { thread: req.params.id, readBy: { $nin: [req.user.id] } },
      { $addToSet: { readBy: req.user.id } }
    );
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /unread-count  — total unread for badge ── */
router.get('/unread-count', authenticateToken, async (req: any, res) => {
  try {
    const threads = await Thread.find({ participants: req.user.id }, '_id');
    const count = await Message.countDocuments({
      thread: { $in: threads.map(t => t._id) },
      readBy: { $nin: [req.user.id] },
      sender: { $ne: req.user.id },
    });
    res.json({ count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ── GET /staff  — all other users (for new conversation picker) ── */
router.get('/staff', authenticateToken, async (req: any, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id }, is_active: { $ne: false } })
      .select('name role specialty')
      .sort({ name: 1 })
      .lean();
    res.json(users.map((u: any) => ({ ...u, id: u._id.toString() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
