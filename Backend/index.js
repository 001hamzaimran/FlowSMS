import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './Utils/db.js';
import { errorHandler } from './Middlewares/errorHandler.js';
import { apiLimiter } from './Middlewares/rateLimiter.js';
import authRoutes from './Routes/authRoutes.js';
import sheetsRoutes from './Routes/sheetsRoutes.js';
import flowRoutes from './Routes/flowRoutes.js';
import webhookRoutes from './Routes/webhookRoutes.js';
import { initializeScheduler } from './Utils/scheduler.js';

dotenv.config();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/sheets', sheetsRoutes);
app.use('/flows', flowRoutes);
app.use('/webhooks', webhookRoutes);

// Central Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect DB and start server & scheduler
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeScheduler();
  });
});
