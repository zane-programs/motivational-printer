#!/usr/bin/env node

/**
 * Interactive Claude.ai Authentication Script
 *
 * This script opens a Puppeteer Stealth-controlled browser for interactive
 * authentication with Claude.ai and captures the session for API use.
 */

import { createClaudeClient } from './src/lib/connectors/claude-ai/PuppeteerClient.mjs';
import { ClaudeAuthManager } from './src/lib/connectors/claude-ai/auth.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function interactiveAuth() {
  console.log(`
🔐 Interactive Claude.ai Authentication
=======================================

This script will:
1. Open a stealth-controlled browser
2. Navigate to Claude.ai
3. Allow you to log in manually
4. Capture your session cookies and tokens
5. Save the session for API use

Press Ctrl+C to cancel at any time.
`);

  const authManager = new ClaudeAuthManager();
  const client = createClaudeClient({
    headless: false, // Keep browser visible for interaction
    timeout: 60000   // Extended timeout for manual interaction
  });

  try {
    console.log('🌐 Opening browser and navigating to Claude.ai...');

    // Navigate to Claude.ai
    await client.navigate('https://claude.ai', {
      waitUntil: 'networkidle0'
    });

    const page = await client.getPage();

    console.log(`
✋ MANUAL STEPS REQUIRED:
1. Complete the login process in the browser window
2. Navigate through any required screens (organization selection, etc.)
3. Ensure you can see the main Claude.ai interface
4. Press Enter in this terminal when you're logged in and ready...
`);

    // Wait for user to complete authentication
    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    console.log('📥 Extracting session data...');

    // Get cookies from the authenticated session
    const cookies = await client.getCookies('claude.ai');

    if (cookies.length === 0) {
      throw new Error('No Claude.ai cookies found. Please ensure you are logged in.');
    }

    // Convert cookies to the format expected by ClaudeAuthManager
    const cookieMap = {};
    cookies.forEach(cookie => {
      cookieMap[cookie.name] = cookie.value;
    });

    // Try to extract organization ID from the current page
    let organizationId = null;
    try {
      organizationId = await page.evaluate(() => {
        // Try multiple methods to find organization ID

        // Method 1: Check localStorage
        const localOrgId = localStorage.getItem('organizationId') ||
                          localStorage.getItem('claude-organization-id') ||
                          localStorage.getItem('org-id');
        if (localOrgId) return localOrgId;

        // Method 2: Check sessionStorage
        const sessionOrgId = sessionStorage.getItem('organizationId') ||
                            sessionStorage.getItem('claude-organization-id') ||
                            sessionStorage.getItem('org-id');
        if (sessionOrgId) return sessionOrgId;

        // Method 3: Look for organization ID in the URL
        const urlMatch = window.location.href.match(/organizations?\/([a-f0-9-]+)/i);
        if (urlMatch) return urlMatch[1];

        // Method 4: Check for data attributes or global variables
        if (window.APP_CONFIG && window.APP_CONFIG.organizationId) {
          return window.APP_CONFIG.organizationId;
        }

        return null;
      });

      if (organizationId) {
        console.log(`✅ Found organization ID: ${organizationId}`);
      } else {
        console.log('⚠️  Could not auto-detect organization ID');
      }
    } catch (error) {
      console.log(`⚠️  Error extracting organization ID: ${error.message}`);
    }

    // Prompt for organization ID if not found
    if (!organizationId) {
      console.log(`
📝 Organization ID not auto-detected. Please check:
1. Your browser URL for something like: https://claude.ai/organizations/abc-123-def
2. Browser developer tools → Application → Local Storage → organizationId
3. Contact your Claude.ai administrator

You can also set the CLAUDE_ORG_ID environment variable later.
Press Enter to continue without organization ID, or Ctrl+C to cancel...
`);

      await new Promise((resolve) => {
        process.stdin.once('data', resolve);
      });
    }

    // Test the session by making an API call
    console.log('🧪 Testing session validity...');

    const testHeaders = {
      'Cookie': Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; '),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://claude.ai/',
      'Origin': 'https://claude.ai'
    };

    const testResponse = await client.get('https://claude.ai/api/bootstrap', {
      headers: testHeaders
    });

    if (!testResponse.ok) {
      console.log(`⚠️  Session test failed with status ${testResponse.status}. Proceeding anyway...`);
    } else {
      console.log('✅ Session test successful!');
    }

    // Save the session
    const sessionData = {
      cookies: cookieMap,
      organizationId,
      userAgent: await page.evaluate(() => navigator.userAgent),
      extractedAt: new Date().toISOString(),
      source: 'interactive-auth',
      testStatus: testResponse.ok ? 'passed' : 'failed'
    };

    authManager.saveSession(sessionData);

    console.log(`
✅ SUCCESS! Claude.ai session has been saved.

Session details:
- Cookies captured: ${Object.keys(cookieMap).length}
- Organization ID: ${organizationId || 'Not detected'}
- Session file: ${authManager.sessionFile}
- Test status: ${sessionData.testStatus}

You can now use the Claude connector with authentication enabled.

🎯 Quick test: npm run test-claude-session
📚 Usage: Check the Claude connector documentation
`);

    // Keep browser open for a moment so user can see success
    console.log('\nClosing browser in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.error(`\n❌ Authentication failed: ${error.message}`);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure you are logged into Claude.ai');
    console.error('2. Check your internet connection');
    console.error('3. Try running the script again');
    console.error('4. Check if Claude.ai is accessible from your location');

    process.exit(1);
  } finally {
    await client.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Authentication cancelled by user');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Authentication terminated');
  process.exit(0);
});

// Run the interactive authentication
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  interactiveAuth().catch(error => {
    console.error(`\n💥 Unexpected error: ${error.message}`);
    process.exit(1);
  });
}