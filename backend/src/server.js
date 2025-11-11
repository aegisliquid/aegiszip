import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './env.js';
import { tokenEvents } from './events/tokenEvents.js';
import { TokenService } from './services/tokenService.js';

export async function startServer() {
  const app = express();
  const server = http.createServer(app);

  const tokenService = new TokenService();
  const corsOrigins = env.cors.origins.length > 0 ? env.cors.origins : ['*'];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/tokens', async (req, res, next) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tokens = await tokenService.listTokens({
        limit: Number.isNaN(limit) ? undefined : limit,
      });
      res.json({ tokens });
    } catch (error) {
      next(error);
    }
  });

  app.post('/tokens', async (req, res, next) => {
    try {
      const token = await tokenService.createToken(req.body);
      res.status(201).json({ token });
    } catch (error) {
      next(error);
    }
  });

  app.get('/tokens/:externalId', async (req, res, next) => {
    try {
      const token = await tokenService.getTokenByExternalId(
        req.params.externalId
      );
      res.json({ token });
    } catch (error) {
      next(error);
    }
  });

  app.get('/tokens/:externalId/history', async (req, res, next) => {
    try {
      const history = await tokenService.getHistory(req.params.externalId);
      res.json({ history });
    } catch (error) {
      next(error);
    }
  });

  app.post('/tokens/:externalId/status', async (req, res, next) => {
    try {
      const updatedToken = await tokenService.updateStatus(
        req.params.externalId,
        req.body.status,
        {
          transactionId: req.body.transactionId,
          error: req.body.error,
          finalized: req.body.finalized,
          totalSupply: req.body.totalSupply,
        }
      );
      res.json({ token: updatedToken });
    } catch (error) {
      next(error);
    }
  });

  app.use((err, _req, res, _next) => {
    const status = err.status ?? 400;
    res.status(status).json({
      error: err.message ?? 'Unexpected error',
      details: err.details ?? null,
    });
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('connection:ack', { message: 'connected' });
  });

  const forwardEvent = (eventName) => (payload) => {
    io.emit(eventName, payload);
  };

  tokenEvents.on('token.created', forwardEvent('token.created'));
  tokenEvents.on('token.updated', forwardEvent('token.updated'));
  tokenEvents.on(
    'token.history-appended',
    forwardEvent('token.history-appended')
  );

  server.listen(env.port, () => {
    console.log(`Backend service listening on port ${env.port}`);
  });

  return { app, server, io };
}

