# ngrok Setup Guide for Slack App Development

## Installation Complete ✓

ngrok has been successfully installed at: `C:\Users\ryosu\ngrok\ngrok.exe`

## Next Steps: Get Your Auth Token

### 1. Create Free ngrok Account

1. Visit: https://dashboard.ngrok.com/signup
2. Sign up with your email or GitHub/Google account
3. Verify your email if required

### 2. Get Your Auth Token

1. After signing in, go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken (it looks like: `2abc123XYZ...`)
3. Keep this token secure - it's like a password!

### 3. Configure ngrok

Open a new terminal and run:
```bash
C:\Users\ryosu\ngrok\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
```

Replace `YOUR_TOKEN_HERE` with your actual token.

### 4. Test ngrok

Test that ngrok works:
```bash
C:\Users\ryosu\ngrok\ngrok.exe http 3000
```

You should see:
- A forwarding URL like: `https://abc123.ngrok.io -> http://localhost:3000`
- Web Interface at: `http://127.0.0.1:4040`

Press `Ctrl+C` to stop the test.

## Using ngrok with Slack App

### Quick Start
```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
npm run dev:ngrok
```

### Manual Start
```bash
# Start ngrok on port 3000
C:\Users\ryosu\ngrok\ngrok.exe http 3000
```

### Update Slack App Settings

When ngrok starts, it will show URLs like:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:3000
```

Update your Slack app settings:
1. Request URL: `https://abc123.ngrok.io/slack/events`
2. Redirect URL: `https://abc123.ngrok.io/slack/oauth/redirect`
3. Slash Commands: `https://abc123.ngrok.io/slack/slash`

## Tips

1. **Free Tier Limitations**:
   - URL changes each time you restart ngrok
   - Need to update Slack app settings each time

2. **Keep ngrok Running**:
   - Don't close the ngrok terminal while developing
   - Use our keeper script: `npm run dev:ngrok`

3. **Monitor Requests**:
   - Visit http://localhost:4040 to see all requests
   - Great for debugging Slack interactions

## Troubleshooting

### "command not found: ngrok"
- Restart your terminal after installation
- Or use full path: `C:\Users\ryosu\ngrok\ngrok.exe`

### "unauthorized"
- Make sure you've added your authtoken
- Check token at: https://dashboard.ngrok.com/get-started/your-authtoken

### Port already in use
- Make sure your app is running on port 3000
- Or change the port number in the ngrok command