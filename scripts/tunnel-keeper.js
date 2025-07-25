const { spawn } = require('child_process');

// Configuration
const PORT = process.env.PORT || 3000;
const SUBDOMAIN = 'clear-regions-follow';
const RETRY_DELAY = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

let tunnelProcess = null;
let tunnelUrl = null;
let isShuttingDown = false;

console.log('[TUNNEL] Starting tunnel keeper...');
console.log(`Port: ${PORT}, Subdomain: ${SUBDOMAIN}`);

// Start tunnel
function startTunnel() {
  if (isShuttingDown) return;
  
  console.log('[TUNNEL] Starting localtunnel...');
  
  tunnelProcess = spawn('npx', ['localtunnel', '--port', PORT, '--subdomain', SUBDOMAIN], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let output = '';
  
  tunnelProcess.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    
    // Extract URL from output
    const urlMatch = message.match(/your url is: (https:\/\/[^\s]+)/i);
    if (urlMatch) {
      tunnelUrl = urlMatch[1];
      console.log(`[SUCCESS] Tunnel established: ${tunnelUrl}`);
      output = '';
    }
  });
  
  tunnelProcess.stderr.on('data', (data) => {
    console.error(`[ERROR] ${data.toString()}`);
  });
  
  tunnelProcess.on('close', (code) => {
    console.log(`[CLOSED] Tunnel closed with code ${code}`);
    tunnelProcess = null;
    tunnelUrl = null;
    
    if (!isShuttingDown) {
      console.log(`[RETRY] Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
      setTimeout(startTunnel, RETRY_DELAY);
    }
  });
  
  tunnelProcess.on('error', (err) => {
    console.error(`[ERROR] Failed to start tunnel: ${err.message}`);
  });
}

// Health check
async function checkTunnelHealth() {
  if (!tunnelUrl || !tunnelProcess) {
    console.log('[CHECK] Tunnel not active, restarting...');
    if (tunnelProcess) {
      tunnelProcess.kill();
    }
    startTunnel();
    return;
  }
  
  try {
    // Simple check if process is still running
    if (tunnelProcess.killed) {
      console.log('[CHECK] Tunnel process died, restarting...');
      startTunnel();
    } else {
      console.log(`[HEALTHY] Tunnel active: ${tunnelUrl}`);
    }
  } catch (error) {
    console.error(`[ERROR] Health check failed: ${error.message}`);
  }
}

// Graceful shutdown
function shutdown() {
  isShuttingDown = true;
  console.log('\n[SHUTDOWN] Shutting down tunnel keeper...');
  
  if (tunnelProcess) {
    tunnelProcess.kill();
  }
  
  process.exit(0);
}

// Handle exit signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGQUIT', shutdown);

// Start
startTunnel();

// Start health checks
setInterval(checkTunnelHealth, HEALTH_CHECK_INTERVAL);

console.log('[INFO] Keep this running to maintain tunnel connection');
console.log('[INFO] Press Ctrl+C to stop');