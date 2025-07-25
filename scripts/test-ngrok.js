const { spawn } = require('child_process');

console.log('[TEST] Testing ngrok installation...\n');

const ngrokPath = 'C:\\Users\\ryosu\\ngrok\\ngrok.exe';
const port = 3000;

console.log(`[INFO] Starting ngrok on port ${port}...`);
console.log('[INFO] This will show if authtoken is needed\n');

const ngrok = spawn(ngrokPath, ['http', port], {
  stdio: 'inherit',
  shell: true
});

ngrok.on('error', (err) => {
  console.error('[ERROR] Failed to start ngrok:', err.message);
  console.log('\n[HELP] Make sure ngrok is installed at:', ngrokPath);
});

ngrok.on('close', (code) => {
  if (code !== 0) {
    console.log(`\n[INFO] ngrok exited with code ${code}`);
    console.log('[INFO] If you see "authtoken required", you need to:');
    console.log('1. Sign up at: https://dashboard.ngrok.com/signup');
    console.log('2. Get token at: https://dashboard.ngrok.com/get-started/your-authtoken');
    console.log('3. Run: npm run config:ngrok');
  }
});

console.log('[INFO] Press Ctrl+C to stop\n');