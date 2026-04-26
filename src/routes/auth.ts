import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'medlink_secret';

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.role !== role) return res.status(403).json({ error: 'Incorrect role selected' });
    if (!user.is_active) return res.status(403).json({ error: 'Account is inactive. Contact admin.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || null,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/* ─── PROFILE (self-service) ─── */

router.get('/me', authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, id: (user._id as any).toString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/profile', authenticateToken, async (req: any, res) => {
  const {
    name, specialty, schedule, phone, room, address, bio,
    emergency_contact_name, emergency_contact_phone, experience, availability,
  } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const user = await User.findById(req.user.id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.name = name;
    const extras: Record<string, any> = {
      specialty, schedule, phone, room, address, bio,
      emergency_contact_name, emergency_contact_phone, experience, availability,
    };
    for (const [k, v] of Object.entries(extras)) {
      if (v !== undefined) user[k] = v;
    }
    await user.save();
    res.json({
      id: user._id.toString(), name: user.name, email: user.email, role: user.role,
      specialty: user.specialty, schedule: user.schedule, phone: user.phone, room: user.room,
      address: user.address, bio: user.bio, experience: user.experience,
      availability: user.availability, emergency_contact_name: user.emergency_contact_name,
      emergency_contact_phone: user.emergency_contact_phone,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/password', authenticateToken, async (req: any, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new passwords are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    user.password = await bcrypt.hash(new_password, 10);
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
