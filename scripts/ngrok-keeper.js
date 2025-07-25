const { spawn, execSync } = require('child_process');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 3000;
const NGROK_API_PORT = 4040;
let ngrokProcess = null;
let tunnelUrl = null;

console.log('[NGROK] Starting ngrok keeper...');
console.log(`[INFO] Local port: ${PORT}`);

// Get tunnel info from ngrok API
async function getNgrokUrl() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: NGROK_API_PORT,
      path: '/api/tunnels',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const tunnels = JSON.parse(data);
          if (tunnels.tunnels && tunnels.tunnels.length > 0) {
            const httpsTunnel = tunnels.tunnels.find(t => t.proto === 'https') || tunnels.tunnels[0];
            resolve(httpsTunnel.public_url);
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    });
    
    req.on('error', () => {
      resolve(null);
    });
    
    req.end();
  });
}

// Start ngrok
function startNgrok() {
  console.log('[NGROK] Starting ngrok process...');
  
  // Determine ngrok path based on platform
  let ngrokCommand = 'ngrok';
  if (process.platform === 'win32') {
    // Try multiple possible locations on Windows
    const possiblePaths = [
      'C:\\Users\\ryosu\\ngrok\\ngrok.exe',
      'ngrok.exe',
      'ngrok'
    ];
    
    for (const path of possiblePaths) {
      try {
        execSync(`"${path}" version`, { stdio: 'ignore' });
        ngrokCommand = path;
        console.log(`[INFO] Found ngrok at: ${path}`);
        break;
      } catch {
        // Continue to next path
      }
    }
  }
  
  // Kill any existing ngrok processes
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM ngrok.exe', { stdio: 'ignore' });
    } else {
      execSync('killall ngrok', { stdio: 'ignore' });
    }
  } catch {
    // Ignore errors if ngrok not running
  }
  
  // Start new ngrok process
  ngrokProcess = spawn(ngrokCommand, ['http', PORT, '--log', 'stdout'], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let startupComplete = false;
  
  ngrokProcess.stdout.on('data', (data) => {
    const message = data.toString();
    
    if (!startupComplete && message.includes('started tunnel')) {
      startupComplete = true;
      // Wait a bit for API to be ready
      setTimeout(async () => {
        const url = await getNgrokUrl();
        if (url) {
          tunnelUrl = url;
          console.log(`[SUCCESS] ngrok tunnel established: ${url}`);
          console.log('\n[ACTION] Update your Slack app settings:');
          console.log(`Request URL: ${url}/slack/events`);
          console.log(`Redirect URL: ${url}/slack/oauth/redirect`);
          console.log(`\n[INFO] ngrok web interface: http://localhost:${NGROK_API_PORT}`);
          console.log('[INFO] Keep this running to maintain tunnel\n');
        }
      }, 2000);
    }
    
    // Log important messages
    if (message.includes('ERROR') || message.includes('WARN')) {
      console.log(`[NGROK] ${message.trim()}`);
    }
  });
  
  ngrokProcess.stderr.on('data', (data) => {
    console.error(`[ERROR] ${data.toString()}`);
  });
  
  ngrokProcess.on('close', (code) => {
    console.log(`[CLOSED] ngrok process exited with code ${code}`);
    ngrokProcess = null;
    tunnelUrl = null;
    
    // Restart after delay
    console.log('[RETRY] Restarting in 5 seconds...');
    setTimeout(startNgrok, 5000);
  });
  
  ngrokProcess.on('error', (err) => {
    console.error(`[ERROR] Failed to start ngrok: ${err.message}`);
    console.log('\n[HELP] Make sure ngrok is installed:');
    console.log('1. Download from: https://ngrok.com/download');
    console.log('2. Add to PATH or place in project directory');
    console.log('3. Run: ngrok config add-authtoken YOUR_TOKEN');
  });
}

// Health check
async function checkHealth() {
  const url = await getNgrokUrl();
  if (url && url !== tunnelUrl) {
    tunnelUrl = url;
    console.log(`[UPDATE] Tunnel URL changed: ${url}`);
  } else if (!url && tunnelUrl) {
    console.log('[WARNING] Lost tunnel connection');
    tunnelUrl = null;
  }
}

// Graceful shutdown
function shutdown() {
  console.log('\n[SHUTDOWN] Stopping ngrok...');
  
  if (ngrokProcess) {
    ngrokProcess.kill();
  }
  
  process.exit(0);
}

// Handle exit signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start ngrok
startNgrok();

// Start health checks
setInterval(checkHealth, 10000);

// Show instructions
console.log('\n[SETUP] First time setup:');
console.log('1. Sign up at: https://dashboard.ngrok.com/signup');
console.log('2. Get authtoken: https://dashboard.ngrok.com/get-started/your-authtoken');
console.log('3. Run: ngrok config add-authtoken YOUR_TOKEN');
console.log('4. Restart this script\n');