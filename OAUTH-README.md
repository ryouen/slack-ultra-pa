# Slack OAuth Server

This is a simple OAuth server for Slack integration that handles the OAuth flow and provides functionality to send direct messages to users.

## Setup

1. Make sure you have Node.js installed
2. Install dependencies:
   ```
   npm install express @slack/web-api @slack/oauth dotenv
   ```
3. Configure your Slack app:
   - Go to https://api.slack.com/apps
   - Select your app or create a new one
   - Under "OAuth & Permissions", add the redirect URL:
     ```
     https://kind-mice-follow.loca.lt/slack/oauth/redirect
     ```
   - Make sure the following scopes are added:
     - `app_mentions:read`
     - `channels:history`
     - `channels:read`
     - `chat:write`
     - `commands`
     - `im:history`
     - `im:read`
     - `im:write`
     - `users:read`
     - `users:read.email`
   - Save changes

4. Update the `.env` file with your Slack app credentials:
   ```
   SLACK_CLIENT_ID=your_client_id
   SLACK_CLIENT_SECRET=your_client_secret
   SLACK_STATE_SECRET=your_state_secret
   SLACK_REDIRECT_URI=https://kind-mice-follow.loca.lt/slack/oauth/redirect
   PORT=3000
   ```

## Running the Server

1. Start the server:
   ```
   node oauth-server.js
   ```

2. Use localtunnel to expose your local server:
   ```
   npx localtunnel --port 3000 --subdomain kind-mice-follow
   ```

3. Install the app by visiting:
   ```
   https://kind-mice-follow.loca.lt/slack/install
   ```

## Testing DM Functionality

After installing the app, you can test sending a DM by visiting:
```
https://kind-mice-follow.loca.lt/test-dm?teamId=YOUR_TEAM_ID&userId=USER_ID&text=Hello%20from%20the%20bot!
```

Replace:
- `YOUR_TEAM_ID` with your Slack team ID
- `USER_ID` with the user ID you want to send a message to

## Troubleshooting

### DM Issues

If you're having issues with DMs:

1. Make sure your app has the `im:write` scope
2. Check that the bot has been invited to the channel or has permission to send DMs
3. Verify that the OAuth token is valid and has not expired
4. Check the server logs for any errors

### OAuth Issues

If you're having issues with OAuth:

1. Verify that your redirect URL is correctly configured in your Slack app settings
2. Check that your client ID and client secret are correct
3. Make sure your app has the necessary scopes
4. Check the server logs for any errors during the OAuth flow

## Getting Team and User IDs

To find your team ID and user IDs:

1. Open Slack in a web browser
2. Look at the URL, it should be something like: `https://app.slack.com/client/T01234567/C01234567`
3. The `T01234567` part is your team ID
4. To get a user ID, right-click on their name in Slack and select "Copy link" - the user ID will be in the URL