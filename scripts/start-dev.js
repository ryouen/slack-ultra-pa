const { spawn } = require('child_process');

console.log('[START] Starting Development Environment...');

// Start tunnel keeper
console.log('[STEP 1] Starting tunnel keeper...');
const tunnelKeeper = spawn('node', ['scripts/tunnel-keeper.js'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for tunnel to establish
setTimeout(() => {
  console.log('[STEP 2] Starting application...');
  
  const app = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle app exit
  app.on('close', (code) => {
    console.log(`[EXIT] App exited with code ${code}`);
    tunnelKeeper.kill();
    process.exit(code);
  });
  
}, 5000); // Wait 5 seconds for tunnel

// Handle exit
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Shutting down...');
  tunnelKeeper.kill();
  process.exit(0);
});