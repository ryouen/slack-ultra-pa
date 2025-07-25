const { spawn } = require('child_process');
const http = require('http');

console.log('[START] Starting Development Environment with ngrok');
console.log('==================================================\n');

const PORT = process.env.PORT || 3000;
const NGROK_API_PORT = 4040;

let appProcess = null;
let ngrokProcess = null;

// Get ngrok URL from API
async function getNgrokUrl(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const url = await new Promise((resolve) => {
        const req = http.get(`http://localhost:${NGROK_API_PORT}/api/tunnels`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const tunnels = JSON.parse(data);
              if (tunnels.tunnels && tunnels.tunnels.length > 0) {
                const tunnel = tunnels.tunnels.find(t => t.proto === 'https') || tunnels.tunnels[0];
                resolve(tunnel.public_url);
              } else {
                resolve(null);
              }
            } catch {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.end();
      });
      
      if (url) return url;
    } catch {
      // Continue trying
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return null;
}

// Start the app
function startApp() {
  console.log('[STEP 2] Starting Slack app...');
  
  appProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  appProcess.on('error', (err) => {
    console.error('[ERROR] Failed to start app:', err.message);
  });
  
  appProcess.on('close', (code) => {
    console.log(`[EXIT] App exited with code ${code}`);
    shutdown();
  });
}

// Start ngrok
async function startNgrok() {
  console.log('[STEP 1] Starting ngrok...');
  
  // Determine ngrok command
  const ngrokCommand = process.platform === 'win32' 
    ? 'C:\\Users\\ryosu\\ngrok\\ngrok.exe'
    : 'ngrok';
  
  ngrokProcess = spawn(ngrokCommand, ['http', PORT], {
    shell: true,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let startupDetected = false;
  
  ngrokProcess.stdout.on('data', (data) => {
    const message = data.toString();
    if (!startupDetected && message.includes('started tunnel')) {
      startupDetected = true;
    }
  });
  
  ngrokProcess.stderr.on('data', (data) => {
    const error = data.toString();
    if (error.includes('authtoken')) {
      console.error('\n[ERROR] ngrok authtoken required!');
      console.log('[HELP] Please follow these steps:');
      console.log('1. Sign up at: https://dashboard.ngrok.com/signup');
      console.log('2. Get token at: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('3. Run: npm run config:ngrok\n');
      shutdown();
    } else {
      console.error('[NGROK]', error.trim());
    }
  });
  
  ngrokProcess.on('error', (err) => {
    console.error('[ERROR] Failed to start ngrok:', err.message);
    shutdown();
  });
  
  ngrokProcess.on('close', (code) => {
    if (code !== 0) {
      console.log(`[ERROR] ngrok exited with code ${code}`);
    }
    shutdown();
  });
  
  // Wait for ngrok to start and get URL
  console.log('[WAIT] Waiting for ngrok to establish tunnel...');
  
  // Give ngrok time to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const url = await getNgrokUrl();
  
  if (url) {
    console.log(`\n[SUCCESS] ngrok tunnel established!`);
    console.log(`[URL] ${url}`);
    console.log(`\n[ACTION] Update your Slack app settings:`);
    console.log(`Request URL: ${url}/slack/events`);
    console.log(`Redirect URL: ${url}/slack/oauth/redirect`);
    console.log(`Slash Commands: ${url}/slack/slash`);
    console.log(`\n[INFO] ngrok inspector: http://localhost:${NGROK_API_PORT}`);
    console.log(`[INFO] Keep this terminal open\n`);
    
    // Start the app after ngrok is ready
    startApp();
  } else {
    console.error('[ERROR] Failed to get ngrok URL');
    console.log('[INFO] Check if ngrok is running properly');
    shutdown();
  }
}

// Graceful shutdown
function shutdown() {
  console.log('\n[SHUTDOWN] Stopping services...');
  
  if (appProcess) {
    appProcess.kill();
  }
  
  if (ngrokProcess) {
    ngrokProcess.kill();
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

// Handle exit signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start everything
startNgrok().catch(err => {
  console.error('[ERROR] Startup failed:', err);
  shutdown();
});