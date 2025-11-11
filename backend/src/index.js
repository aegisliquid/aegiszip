import { startServer } from './server.js';

startServer().catch((error) => {
  console.error('Failed to start backend server:', error);
  process.exit(1);
});

