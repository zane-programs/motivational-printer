# Claude.ai Authentication Setup

This guide explains how to set up persistent authentication for accessing your Claude.ai conversations without requiring user interaction each time.

## Overview

The Claude.ai connector uses **session-based authentication** rather than API keys. This means we extract and store your browser's session cookies to make authenticated requests to Claude.ai's internal API.

## ⚠️ Important Security Notes

- **Your session data is stored locally** in `~/.claude-session.json`
- **Sessions expire after ~7 days** and will need to be refreshed
- **Keep your session file secure** - it provides access to your Claude.ai account
- **Never commit session files to git** - they're automatically gitignored

## Setup Methods

### Method 1: Automated Session Extraction (Recommended)

1. **Run the extraction script:**
   ```bash
   npm run extract-claude-session
   ```

2. **Follow the interactive prompts:**
   - A browser window will open to Claude.ai
   - Log in normally if not already logged in
   - Press Enter in the terminal when ready
   - The script will extract and save your session

3. **Verify the setup:**
   ```bash
   node test-claude-auth.mjs
   ```

### Method 2: Environment Variable

1. **Manual cookie extraction:**
   - Open Claude.ai in your browser
   - Open Developer Tools (F12)
   - Go to Application → Cookies → https://claude.ai
   - Copy all cookie values

2. **Set environment variable:**
   ```bash
   # In your .env file
   CLAUDE_SESSION_COOKIE="sessionKey=abc123; authToken=xyz789; ..."
   CLAUDE_ORG_ID="your-organization-id"
   ```

3. **Extract to session file:**
   ```bash
   npm run extract-claude-session
   ```

### Method 3: Manual Session File

If you prefer to create the session file manually:

```json
{
  "timestamp": "2025-09-18T06:00:00.000Z",
  "organizationId": "your-org-id",
  "cookies": {
    "sessionKey": "your-session-key",
    "authToken": "your-auth-token"
  },
  "source": "manual"
}
```

Save this to `~/.claude-session.json`.

## How It Works

### Session Storage Format

The session file stores:
```json
{
  "timestamp": "2025-09-18T06:00:00.000Z",
  "organizationId": "5cb2eada-a66f-4a9c-9b82-7611d65ad100",
  "cookies": {
    "sessionKey": "...",
    "authToken": "...",
    "csrfToken": "..."
  },
  "headers": {
    "User-Agent": "...",
    "Referer": "https://claude.ai/"
  },
  "source": "playwright"
}
```

### Authentication Flow

1. **Session Loading**: Connector loads saved session from file
2. **Header Construction**: Creates authenticated request headers with cookies
3. **API Requests**: Makes requests to Claude.ai internal API endpoints
4. **Error Handling**: Falls back to mock data if authentication fails

### API Endpoints Used

- `GET /api/organizations/{orgId}/chat_conversations` - List conversations
- `GET /api/organizations/{orgId}/chat_conversations/{convId}?tree=True` - Get messages
- `GET /api/bootstrap` - Session validation

## Usage in Code

### Automatic Mode (Default)
```javascript
// Uses saved session automatically
const connector = new ClaudeAIConnector();
const conversations = await connector.getConversations(startDate, endDate);
```

### Explicit Configuration
```javascript
const connector = new ClaudeAIConnector({
  useAuthentication: true,
  organizationId: 'your-org-id',
  sessionFile: '/custom/path/session.json'
});
```

### Disable Authentication
```javascript
const connector = new ClaudeAIConnector({
  useAuthentication: false  // Falls back to mock data
});
```

## Troubleshooting

### Common Issues

#### 1. "No saved session found"
```bash
Error: No saved session found at ~/.claude-session.json
```
**Solution**: Run `npm run extract-claude-session`

#### 2. "Authentication failed: 401"
```bash
Authentication failed: 401. Session may be expired.
```
**Solution**: Re-extract your session - it likely expired

#### 3. "No organization ID available"
```bash
Error: No organization ID available
```
**Solution**: Set `CLAUDE_ORG_ID` environment variable or include in session

#### 4. Session appears invalid
**Check**:
- Are you logged into Claude.ai in your browser?
- Has your session expired (>7 days old)?
- Did you copy all necessary cookies?

### Validation Commands

```bash
# Test authentication setup
node test-claude-auth.mjs

# Test full planner with authentication
npm run plan

# Verify session validity
node -e "
const { ClaudeAuthManager } = require('./src/lib/connectors/claude-ai/auth.mjs');
const auth = new ClaudeAuthManager();
auth.testSession().then(valid => console.log('Session valid:', valid));
"
```

### Debugging

Enable debugging by checking the logs:
- Session loading: Shows in connector output
- API requests: Network errors will be displayed
- Fallback behavior: Warns when falling back to mock data

## Session Lifecycle

### Initial Setup
1. User runs extraction script
2. Browser automation captures session
3. Session saved to local file
4. Immediate validation performed

### Daily Usage
1. Planner loads saved session
2. Makes authenticated API requests
3. Processes real conversation data
4. Graceful fallback if session fails

### Maintenance
- **Sessions last ~7 days**
- **Re-extract when expired**
- **Monitor logs for auth warnings**
- **Keep browser logged in for easier extraction**

## Security Best Practices

### File Permissions
```bash
# Secure the session file
chmod 600 ~/.claude-session.json
```

### Environment Variables
```bash
# In .env (gitignored)
CLAUDE_SESSION_COOKIE="..."
CLAUDE_ORG_ID="..."

# Never in version control
echo "*.claude-session.json" >> .gitignore
echo ".env" >> .gitignore
```

### Regular Rotation
- Re-extract sessions weekly
- Monitor for suspicious activity
- Use dedicated browser profile if needed

## Production Deployment

For deployment on a Linux server without browser access:

### 1. Extract Session Locally
```bash
# On your local machine
npm run extract-claude-session
```

### 2. Transfer Session Data
```bash
# Copy session to server
scp ~/.claude-session.json user@server:~/.claude-session.json
```

### 3. Or Use Environment Variables
```bash
# On server
export CLAUDE_SESSION_COOKIE="extracted-cookies"
export CLAUDE_ORG_ID="your-org-id"
```

### 4. Automate Session Refresh
```bash
# Cron job to alert when session expires
0 9 * * * /usr/bin/node /path/to/test-claude-auth.mjs || echo "Claude session expired" | mail admin@example.com
```

## Integration with Planner

The planner automatically uses Claude authentication when available:

```bash
# Will use real Claude.ai data if authenticated
npm run plan

# Falls back to mock data if not authenticated
# (with helpful error messages)
```

The planning output will indicate data sources used:
- ✅ **Real Data**: "Fetching conversations from Claude.ai API..."
- ⚠️ **Fallback**: "API fetch failed, falling back to mock data..."

## Support

If you encounter issues:

1. **Check the logs** for specific error messages
2. **Verify Claude.ai access** in your browser
3. **Test authentication** with `node test-claude-auth.mjs`
4. **Re-extract session** if errors persist
5. **Use mock mode** as fallback during development

The system is designed to gracefully degrade, so your planner will always work even without Claude.ai authentication.