const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('[SETUP] ngrok Setup Script');
console.log('==============================\n');

// Check if ngrok is installed
function checkNgrokInstalled() {
  try {
    execSync('ngrok version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Install ngrok
async function installNgrok() {
  console.log('[CHECK] Checking ngrok installation...');
  
  if (checkNgrokInstalled()) {
    console.log('[SUCCESS] ngrok is already installed');
    return true;
  }
  
  console.log('[INFO] ngrok not found. Installing...');
  console.log('[INFO] Please follow these steps:\n');
  
  console.log('1. Download ngrok from: https://ngrok.com/download');
  console.log('2. Extract the downloaded file');
  console.log('3. Add ngrok to your PATH or place it in this project directory');
  console.log('4. Sign up for free account at: https://dashboard.ngrok.com/signup');
  console.log('5. Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken');
  console.log('6. Run: ngrok config add-authtoken YOUR_TOKEN_HERE\n');
  
  return false;
}

// Start ngrok with custom configuration
function startNgrok() {
  const PORT = process.env.PORT || 3000;
  
  console.log('[START] Starting ngrok...');
  console.log(`[INFO] Forwarding to port: ${PORT}`);
  
  // Use simple command without subdomain for free tier
  const ngrokProcess = spawn('ngrok', ['http', PORT], {
    shell: true,
    stdio: 'inherit'
  });
  
  // Show how to get URL
  setTimeout(() => {
    console.log('\n[INFO] To see your ngrok URL:');
    console.log('[INFO] 1. Open another terminal');
    console.log('[INFO] 2. Run: ngrok api tunnels list');
    console.log('[INFO] Or visit: http://localhost:4040\n');
    console.log('[INFO] Update your Slack app with the ngrok URL:');
    console.log('[INFO] - Request URL: https://YOUR-NGROK-URL.ngrok.io/slack/events');
    console.log('[INFO] - Redirect URL: https://YOUR-NGROK-URL.ngrok.io/slack/oauth/redirect\n');
  }, 3000);
  
  ngrokProcess.on('error', (err) => {
    console.error('[ERROR] Failed to start ngrok:', err.message);
  });
  
  return ngrokProcess;
}

// Alternative: Use ngrok programmatically
async function startNgrokProgrammatic() {
  try {
    const ngrok = require('@ngrok/ngrok');
    const PORT = process.env.PORT || 3000;
    
    console.log('[START] Starting ngrok programmatically...');
    const url = await ngrok.connect({
      addr: PORT,
      proto: 'http',
      onStatusChange: status => console.log('[STATUS]', status),
      onLogEvent: data => console.log('[LOG]', data)
    });
    
    console.log(`[SUCCESS] ngrok tunnel established: ${url}`);
    console.log(`[INFO] Update Slack app settings:`);
    console.log(`[INFO] - Request URL: ${url}/slack/events`);
    console.log(`[INFO] - Redirect URL: ${url}/slack/oauth/redirect`);
    
    return url;
  } catch (error) {
    console.error('[ERROR] Failed to start ngrok programmatically:', error);
    return null;
  }
}

// Main
async function main() {
  const isInstalled = await installNgrok();
  
  if (!isInstalled) {
    console.log('\n[ACTION] Please install ngrok and run this script again');
    return;
  }
  
  // Try programmatic approach first
  console.log('\n[TRY] Attempting programmatic ngrok start...');
  console.log('[INFO] Run: npm install @ngrok/ngrok');
  
  try {
    require.resolve('@ngrok/ngrok');
    await startNgrokProgrammatic();
  } catch {
    console.log('[FALLBACK] Using command-line ngrok...\n');
    startNgrok();
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Stopping ngrok...');
  process.exit(0);
});

main();