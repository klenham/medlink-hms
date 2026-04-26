import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './src/db/index.js';
import authRoutes   from './src/routes/auth.js';
import patientRoutes from './src/routes/patients.js';
import adminRoutes  from './src/routes/admin.js';
import historyRoutes from './src/routes/history.js';
import stationRoutes from './src/routes/stations.js';
import rolesRoutes    from './src/routes/roles.js';
import messagesRoutes      from './src/routes/messages.js';
import notificationRoutes from './src/routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

async function startServer() {
  const app  = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Connect to MongoDB and seed admin (if ADMIN_PASSWORD is set in .env)
  await initDb();

  app.use(express.json());

  app.use('/api/auth',     authRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/admin',    adminRoutes);
  app.use('/api/history',  historyRoutes);
  app.use('/api/stations', stationRoutes);
  app.use('/api/roles',    rolesRoutes);
  app.use('/api/messages',       messagesRoutes);
  app.use('/api/notifications',  notificationRoutes);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('SERVER ERROR:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Medlink HMS running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
