const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Handle Slack URL verification
app.post('/slack/events', (req, res) => {
  console.log('[SLACK EVENT] Received:', req.body?.type);
  
  // URL verification challenge
  if (req.body?.type === 'url_verification') {
    console.log('[CHALLENGE] Responding with:', req.body.challenge);
    res.json({ challenge: req.body.challenge });
    return;
  }
  
  // Other events
  res.status(200).send('OK');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SERVER] Slack challenge test server running on port ${PORT}`);
  console.log(`[INFO] Ready to handle Slack challenges`);
});