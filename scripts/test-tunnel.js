const localtunnel = require('localtunnel');

(async () => {
  try {
    console.log('[TEST] Starting tunnel test...');
    console.log('[TEST] Opening tunnel on port 3000 with subdomain clear-regions-follow');
    
    const tunnel = await localtunnel({ 
      port: 3000,
      subdomain: 'clear-regions-follow'
    });

    console.log('[SUCCESS] Tunnel URL:', tunnel.url);
    
    // Keep alive
    tunnel.on('close', () => {
      console.log('[EVENT] Tunnel closed');
    });
    
    tunnel.on('error', (err) => {
      console.error('[ERROR]', err);
    });
    
    // Prevent process from exiting
    process.stdin.resume();
    
  } catch (err) {
    console.error('[ERROR] Failed to create tunnel:', err);
  }
})();