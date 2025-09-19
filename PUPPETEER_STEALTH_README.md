# Puppeteer Stealth Implementation for Claude.ai

## Overview

This implementation replaces all direct `fetch()` calls to `https://claude.ai` with a Puppeteer-based stealth client that bypasses Cloudflare detection. The solution includes:

1. **PuppeteerClient** - A reusable abstraction for stealth HTTP requests
2. **Updated Claude connectors** - All fetch calls now use Puppeteer stealth
3. **Interactive authentication** - Browser-based session capture
4. **Session testing** - Validation of captured sessions

## New Files Added

### Core Implementation
- `src/lib/connectors/claude-ai/PuppeteerClient.mjs` - Stealth HTTP client abstraction
- `interactive-claude-auth.mjs` - Interactive authentication script
- `test-claude-session.mjs` - Session validation script

### Updated Files
- `src/lib/connectors/claude-ai/auth.mjs` - Now uses PuppeteerClient for session testing
- `src/lib/connectors/claude-ai/index.mjs` - API calls now use PuppeteerClient
- `package.json` - Added new scripts and dependencies

## Usage

### 1. Interactive Authentication

Run the interactive authentication to capture your Claude.ai session:

```bash
npm run interactive-claude-auth
```

This will:
- Open a stealth-controlled browser
- Navigate to Claude.ai
- Allow you to log in manually
- Capture session cookies and tokens
- Save the session for API use

### 2. Test Your Session

Validate that your captured session works:

```bash
npm run test-claude-session
```

This tests:
- Session file validity
- Puppeteer stealth functionality
- API authentication
- Conversation data access

### 3. Using the Claude Connector

The Claude connector now automatically uses Puppeteer stealth for all API calls:

```javascript
import ClaudeAIConnector from './src/lib/connectors/claude-ai/index.mjs';

const connector = new ClaudeAIConnector({
  useAuthentication: true,
  organizationId: 'your-org-id' // Optional, auto-detected during auth
});

// All API calls now use Puppeteer stealth
const conversations = await connector.getConversations();
const messages = await connector.getConversationMessages(conversationId);
```

## PuppeteerClient Features

### Basic Usage

```javascript
import { createClaudeClient } from './src/lib/connectors/claude-ai/PuppeteerClient.mjs';

const client = createClaudeClient();

// GET request
const response = await client.get('https://claude.ai/api/endpoint', {
  headers: { 'Authorization': 'Bearer token' },
  parseResponse: 'json'
});

// POST request
const postResponse = await client.post('https://claude.ai/api/endpoint', {
  headers: { 'Content-Type': 'application/json' },
  body: { data: 'value' }
});

await client.close();
```

### Advanced Features

```javascript
// Interactive browser for manual actions
const browser = await client.keepAlive();
const page = browser.page;

// Wait for user interaction
await client.waitForUser('Complete login', async (page) => {
  return page.url().includes('/dashboard');
});

// Cookie management
const cookies = await client.getCookies('claude.ai');
await client.setCookies(cookies);
```

## Stealth Features

The PuppeteerClient includes comprehensive stealth protections:

- **Stealth Plugin**: Uses `puppeteer-extra-plugin-stealth`
- **Realistic User Agent**: Mimics real Chrome browser
- **Browser Properties**: Overrides detection properties
- **Cloudflare Bypass**: Handles bot detection
- **Session Persistence**: Maintains authentication state

## Session Management

### Session File Location
Sessions are saved to: `~/.claude-session.json`

### Session Data Structure
```json
{
  "timestamp": "2025-01-17T...",
  "organizationId": "org-abc123",
  "cookies": {
    "sessionKey": "value",
    "authToken": "value"
  },
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Referer": "https://claude.ai/"
  },
  "source": "interactive-auth"
}
```

### Session Validation
- Automatic age checking (warns after 7 days)
- API endpoint testing
- Cookie validation
- Organization ID verification

## Environment Variables

Optional environment variables:

```bash
# Alternative to interactive auth
CLAUDE_SESSION_COOKIE="sessionKey=value; authToken=value"
CLAUDE_ORG_ID="org-abc123"
```

## Troubleshooting

### Authentication Issues
1. **Session Expired**: Run `npm run interactive-claude-auth` again
2. **Organization ID Missing**: Check URL during auth or set `CLAUDE_ORG_ID`
3. **Cloudflare Blocking**: The stealth implementation should handle this automatically

### Browser Issues
1. **Puppeteer Fails**: Ensure Chrome/Chromium is available
2. **Headless Problems**: Try with `headless: false` option
3. **Timeout Errors**: Increase timeout in client options

### Network Issues
1. **VPN/Proxy**: May interfere with Claude.ai access
2. **Corporate Firewall**: May block required ports
3. **Regional Blocks**: Claude.ai availability varies by region

## Performance Considerations

- **Browser Overhead**: Each request launches a browser instance
- **Memory Usage**: Higher than simple fetch() calls
- **Speed**: Slower due to browser initialization
- **Concurrency**: Limit concurrent browser instances

For high-frequency usage, consider:
- Reusing browser instances with `keepAlive()`
- Implementing connection pooling
- Using session-based authentication where possible

## Development Notes

### Testing New Endpoints
```javascript
// Test with PuppeteerClient
const client = createClaudeClient({ headless: false });
const response = await client.get('https://claude.ai/new-endpoint');
```

### Debugging
- Use `headless: false` to see browser actions
- Enable console logs in the browser
- Monitor network requests
- Check for Cloudflare challenges

### Extending the Client
The PuppeteerClient can be extended for other services requiring stealth:

```javascript
const customClient = new PuppeteerClient({
  userAgent: 'Custom/Agent',
  viewport: { width: 1920, height: 1080 },
  timeout: 60000
});
```

## Security Considerations

- Sessions contain sensitive authentication data
- Store session files securely
- Rotate sessions regularly
- Use HTTPS for all requests
- Validate session data before use

## Dependencies Added

- `puppeteer` - Browser automation
- `puppeteer-extra` - Plugin system
- `puppeteer-extra-plugin-stealth` - Stealth features

Total size impact: ~200MB (includes Chromium browser)

## Migration Notes

### Before (Direct Fetch)
```javascript
const response = await fetch('https://claude.ai/api/endpoint', {
  headers: authHeaders
});
```

### After (Puppeteer Stealth)
```javascript
const client = createClaudeClient();
const response = await client.get('https://claude.ai/api/endpoint', {
  headers: authHeaders
});
await client.close();
```

All existing Claude connector code has been automatically migrated to use the new stealth implementation.