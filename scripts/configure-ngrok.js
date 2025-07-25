const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('[NGROK] Configuration Helper');
console.log('===========================\n');

console.log('[INFO] This script will help you configure ngrok with your authtoken.\n');

console.log('[STEPS] To get your authtoken:');
console.log('1. Sign up at: https://dashboard.ngrok.com/signup');
console.log('2. Get token at: https://dashboard.ngrok.com/get-started/your-authtoken\n');

// Check if ngrok exists
const ngrokPath = 'C:\\Users\\ryosu\\ngrok\\ngrok.exe';
if (!fs.existsSync(ngrokPath)) {
  console.error('[ERROR] ngrok not found at expected location:', ngrokPath);
  console.log('[INFO] Please run: npm run install:ngrok first');
  process.exit(1);
}

console.log('[FOUND] ngrok at:', ngrokPath);

rl.question('\nEnter your ngrok authtoken (or press Enter to skip): ', (token) => {
  if (!token || token.trim() === '') {
    console.log('\n[SKIP] No token provided. You can configure it later with:');
    console.log(`${ngrokPath} config add-authtoken YOUR_TOKEN`);
    rl.close();
    return;
  }

  try {
    console.log('\n[CONFIG] Adding authtoken to ngrok...');
    execSync(`"${ngrokPath}" config add-authtoken ${token.trim()}`, { stdio: 'inherit' });
    console.log('[SUCCESS] ngrok configured successfully!');
    
    console.log('\n[TEST] Would you like to test ngrok now? (y/n)');
    rl.question('', (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\n[START] Starting ngrok on port 3000...');
        console.log('[INFO] Press Ctrl+C to stop\n');
        
        // Start ngrok
        require('child_process').spawn(ngrokPath, ['http', '3000'], {
          stdio: 'inherit',
          shell: true
        });
      } else {
        console.log('\n[DONE] Configuration complete!');
        console.log('[INFO] Start ngrok anytime with: npm run dev:ngrok');
        rl.close();
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to configure ngrok:', error.message);
    rl.close();
  }
});