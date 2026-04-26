import { connectDB } from '../lib/db.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

export async function initDb(): Promise<void> {
  await connectDB();
  await seedAdmin();
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@medlink.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn('⚠️  No ADMIN_PASSWORD set in .env — skipping admin seed.');
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 10);
  const existing = await User.findOne({ email: adminEmail });

  if (existing) {
    // Always sync the password from .env so credentials stay consistent
    existing.password = hashed;
    await existing.save();
    console.log(`🔄 Admin password synced: ${adminEmail}`);
  } else {
    await User.create({ name: 'Master Admin', email: adminEmail, password: hashed, role: 'admin' });
    console.log(`✅ Admin account created: ${adminEmail}`);
  }
}
