const { exec } = require('child_process');
const os = require('os');

console.log('[STOP] Stopping Slack Personal Assistant...');

if (os.platform() === 'win32') {
  // Windows
  exec('tasklist | findstr "node.exe"', (err, stdout) => {
    if (err || !stdout) {
      console.log('[STOP] No node processes found');
      return;
    }

    // Find our specific app process
    const lines = stdout.split('\n');
    lines.forEach(line => {
      if (line.includes('node.exe')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        
        // Check if this is our app
        exec(`wmic process where ProcessId=${pid} get CommandLine`, (err2, stdout2) => {
          if (!err2 && stdout2 && (stdout2.includes('app.ts') || stdout2.includes('app.js'))) {
            console.log(`[STOP] Killing process ${pid}`);
            exec(`taskkill /F /PID ${pid}`, (err3) => {
              if (!err3) {
                console.log('[STOP] Application stopped successfully');
              }
            });
          }
        });
      }
    });
  });

  // Also kill by port
  exec('netstat -aon | findstr ":3000"', (err, stdout) => {
    if (!err && stdout) {
      const lines = stdout.split('\n');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          exec(`taskkill /F /PID ${pid}`, () => {});
        }
      });
    }
  });
} else {
  // Unix/Linux/Mac
  exec("lsof -ti:3000 | xargs kill -9", (err) => {
    if (!err) {
      console.log('[STOP] Application stopped successfully');
    } else {
      // Try alternative method
      exec("pkill -f 'node.*app.ts'", () => {
        console.log('[STOP] Application stopped');
      });
    }
  });
}