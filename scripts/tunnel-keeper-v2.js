const { spawn } = require('child_process');

// Configuration
const PORT = process.env.PORT || 3000;
const SUBDOMAIN = 'clear-regions-follow';
const RETRY_DELAY = 5000; // 5 seconds

let tunnelProcess = null;
let isShuttingDown = false;

console.log('[TUNNEL] Starting tunnel keeper v2...');
console.log(`[CONFIG] Port: ${PORT}, Subdomain: ${SUBDOMAIN}`);

// Start tunnel
function startTunnel() {
  if (isShuttingDown) return;
  
  console.log('[TUNNEL] Starting localtunnel...');
  
  // Use inherit stdio to see all output
  tunnelProcess = spawn('npx', ['localtunnel', '--port', PORT, '--subdomain', SUBDOMAIN], {
    shell: true,
    stdio: 'inherit'  // This will show all output directly
  });
  
  tunnelProcess.on('close', (code) => {
    console.log(`[CLOSED] Tunnel closed with code ${code}`);
    tunnelProcess = null;
    
    if (!isShuttingDown) {
      console.log(`[RETRY] Waiting ${RETRY_DELAY / 1000} seconds before retry...`);
      setTimeout(startTunnel, RETRY_DELAY);
    }
  });
  
  tunnelProcess.on('error', (err) => {
    console.error(`[ERROR] Failed to start tunnel: ${err.message}`);
  });
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

console.log('[INFO] Keep this running to maintain tunnel connection');
console.log('[INFO] Press Ctrl+C to stop');