const express = require('express');
const { WebClient } = require('@slack/web-api');
const { InstallProvider } = require('@slack/oauth');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create a simple in-memory store for installations
const installationStore = {
  storeInstallation: async (installation) => {
    console.log('Storing installation', { 
      teamId: installation.team?.id,
      userId: installation.user?.id
    });
    
    // Store the installation data in a JSON file
    const installationsDir = path.join(__dirname, 'installations');
    if (!fs.existsSync(installationsDir)) {
      fs.mkdirSync(installationsDir, { recursive: true });
    }
    
    const fileName = installation.team?.id || installation.enterprise?.id || 'unknown';
    const filePath = path.join(installationsDir, `${fileName}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(installation, null, 2));
    return;
  },
  
  fetchInstallation: async (installQuery) => {
    console.log('Fetching installation', { 
      teamId: installQuery.teamId,
      enterpriseId: installQuery.enterpriseId
    });
    
    const installationsDir = path.join(__dirname, 'installations');
    const fileName = installQuery.teamId || installQuery.enterpriseId || 'unknown';
    const filePath = path.join(installationsDir, `${fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Installation not found for ${fileName}`);
    }
    
    const installation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return installation;
  },
  
  deleteInstallation: async (installQuery) => {
    console.log('Deleting installation', { 
      teamId: installQuery.teamId,
      enterpriseId: installQuery.enterpriseId
    });
    
    const installationsDir = path.join(__dirname, 'installations');
    const fileName = installQuery.teamId || installQuery.enterpriseId || 'unknown';
    const filePath = path.join(installationsDir, `${fileName}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }
};

// Create the installation provider
const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID || '',
  clientSecret: process.env.SLACK_CLIENT_SECRET || '',
  stateSecret: process.env.SLACK_STATE_SECRET || 'my-state-secret',
  installationStore
});

// Handle OAuth redirect
app.get('/slack/oauth/redirect', async (req, res) => {
  try {
    console.log('Received OAuth redirect', { 
      code: !!req.query.code, 
      state: !!req.query.state 
    });
    
    // Handle the OAuth callback
    await installer.handleCallback(req, res);
    
    // The installer.handleCallback will handle the response
  } catch (error) {
    console.error('OAuth redirect error', error);
    res.status(500).send(`<html><body><h1>OAuth Error</h1><p>Failed to complete OAuth flow: ${error}</p></body></html>`);
  }
});

// Handle OAuth install
app.get('/slack/install', async (req, res) => {
  try {
    console.log('Received install request');
    
    // Generate the installation URL
    const url = await installer.generateInstallUrl({
      scopes: [
        'app_mentions:read',
        'channels:history',
        'channels:read',
        'chat:write',
        'commands',
        'im:history',
        'im:read',
        'im:write',
        'users:read',
        'users:read.email'
      ],
      userScopes: [],
    });
    
    // Redirect to the installation URL
    res.redirect(url);
  } catch (error) {
    console.error('Install request error', error);
    res.status(500).send(`<html><body><h1>Installation Error</h1><p>Failed to generate installation URL: ${error}</p></body></html>`);
  }
});

// Test endpoint to verify the server is running
app.get('/', (req, res) => {
  res.send('OAuth server is running! Go to /slack/install to install the app.');
});

// Start the server
app.listen(PORT, () => {
  console.log(`OAuth server running on port ${PORT}`);
  console.log(`Install URL: http://localhost:${PORT}/slack/install`);
  console.log(`Redirect URL: http://localhost:${PORT}/slack/oauth/redirect`);
});

// Helper function to send a DM to a user
async function sendDirectMessage(teamId, userId, text) {
  try {
    // Fetch the installation to get the bot token
    const installation = await installationStore.fetchInstallation({ teamId });
    const client = new WebClient(installation.bot.token);
    
    // Open a DM channel with the user
    const conversationResponse = await client.conversations.open({
      users: userId,
    });
    
    if (!conversationResponse.ok || !conversationResponse.channel?.id) {
      throw new Error(`Failed to open DM channel with user: ${userId}`);
    }
    
    // Send message to the DM channel
    await client.chat.postMessage({
      channel: conversationResponse.channel.id,
      text,
    });
    
    console.log('Sent direct message', { userId, teamId });
    return true;
  } catch (error) {
    console.error('Failed to send direct message', { userId, teamId, error });
    return false;
  }
}

// Test DM endpoint
app.get('/test-dm', async (req, res) => {
  const { teamId, userId, text } = req.query;
  
  if (!teamId || !userId || !text) {
    return res.status(400).send('Missing required parameters: teamId, userId, text');
  }
  
  try {
    const result = await sendDirectMessage(teamId, userId, text);
    if (result) {
      res.send('DM sent successfully!');
    } else {
      res.status(500).send('Failed to send DM');
    }
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});