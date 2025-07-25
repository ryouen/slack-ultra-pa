import * as net from 'net';
import { logger } from '@/utils/logger';

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port);
  });
}

/**
 * Find an available port starting from the preferred port
 */
export async function findAvailablePort(preferredPort: number, maxAttempts: number = 10): Promise<number> {
  let port = preferredPort;
  
  for (let i = 0; i < maxAttempts; i++) {
    const available = await isPortAvailable(port);
    
    if (available) {
      if (port !== preferredPort) {
        logger.info(`Port ${preferredPort} was busy, using port ${port} instead`);
      }
      return port;
    }
    
    logger.warn(`Port ${port} is already in use, trying next port`, { port });
    port++;
  }
  
  throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from port ${preferredPort}`);
}