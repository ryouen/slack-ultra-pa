const { spawn } = require('child_process');

// Configuration
const PORT = process.env.PORT || 3000;
const SUBDOMAIN = 'clear-regions-follow';
const RETRY_DELAY = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

let tunnelProcess = null;
let tunnelUrl = null;
let isShuttingDown = false;
let retryCount = 0;

console.log('[TUNNEL] Starting tunnel keeper...');
console.log(`Port: ${PORT}, Requested subdomain: ${SUBDOMAIN}`);

// Start tunnel
function startTunnel() {
  if (isShuttingDown) return;
  
  retryCount++;
  console.log(`[TUNNEL] Starting localtunnel... (attempt ${retryCount})`);
  
  // Try with different subdomain variations if the original fails
  const subdomainVariations = [
    SUBDOMAIN,
    `${SUBDOMAIN}-${Date.now()}`,
    `${SUBDOMAIN}-${Math.random().toString(36).substring(7)}`
  ];
  
  const currentSubdomain = retryCount <= 3 ? subdomainVariations[0] : subdomainVariations[1];
  
  const args = ['localtunnel', '--port', PORT];
  if (retryCount <= 5) {
    args.push('--subdomain', currentSubdomain);
    console.log(`[TUNNEL] Requesting subdomain: ${currentSubdomain}`);
  } else {
    console.log('[TUNNEL] Using random subdomain (all variations failed)');
  }
  
  tunnelProcess = spawn('npx', args, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let output = '';
  
  tunnelProcess.stdout.on('data', (data) => {
    const message = data.toString();
    output += message;
    
    // Check for URL in output
    const urlMatch = message.match(/your url is: (https:\/\/[^\s]+)/i);
    if (urlMatch) {
      tunnelUrl = urlMatch[1];
      console.log(`[SUCCESS] Tunnel established: ${tunnelUrl}`);
      
      // Check if we got the requested subdomain
      if (tunnelUrl.includes(SUBDOMAIN)) {
        console.log('[SUCCESS] Got requested subdomain!');
        retryCount = 0; // Reset retry count on success
      } else {
        console.log('[WARNING] Got different subdomain than requested');
        console.log('[INFO] Update your Slack app settings with this URL:');
        console.log(`[INFO] Request URL: ${tunnelUrl}/slack/events`);
        console.log(`[INFO] Redirect URL: ${tunnelUrl}/slack/oauth/redirect`);
      }
      
      output = '';
    }
  });
  
  tunnelProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (error.includes('subdomain is already registered')) {
      console.error('[ERROR] Subdomain already in use, will retry with variation');
    } else {
      console.error(`[ERROR] ${error}`);
    }
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

// Start tunnel
startTunnel();

// Start health checks
setInterval(checkTunnelHealth, HEALTH_CHECK_INTERVAL);

console.log('[INFO] Keep this running to maintain tunnel connection');
console.log('[INFO] Press Ctrl+C to stop');
console.log('[INFO] If subdomain is taken, will show actual URL to update in Slack');