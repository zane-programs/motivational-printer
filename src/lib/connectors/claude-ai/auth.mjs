import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { createClaudeClient } from './PuppeteerClient.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ClaudeAuthManager {
  constructor(options = {}) {
    this.sessionFile = options.sessionFile || join(homedir(), '.claude-session.json');
    this.organizationId = options.organizationId;
  }

  /**
   * Extract session data from browser cookies
   * Users can manually extract this or use browser automation
   */
  async extractSessionFromBrowser() {
    console.log(`
🔐 Claude.ai Authentication Setup Required

To use Claude.ai data, you need to extract your session cookies:

OPTION 1: Manual Cookie Extraction
1. Log into claude.ai in your browser
2. Open Developer Tools (F12)
3. Go to Application/Storage → Cookies → https://claude.ai
4. Copy the following cookie values:
   - sessionKey (or similar session identifier)
   - Any authentication tokens

OPTION 2: Automated Extraction (run this script)
   npm run extract-claude-session

OPTION 3: Use environment variables
   Set CLAUDE_SESSION_COOKIE in your .env file

The session will be saved to: ${this.sessionFile}
    `);

    throw new Error('Session extraction required. See instructions above.');
  }

  /**
   * Save session data to file
   */
  saveSession(sessionData) {
    const session = {
      timestamp: new Date().toISOString(),
      organizationId: this.organizationId,
      cookies: sessionData.cookies || {},
      headers: sessionData.headers || {},
      ...sessionData
    };

    writeFileSync(this.sessionFile, JSON.stringify(session, null, 2));
    console.log(`✅ Claude session saved to: ${this.sessionFile}`);
  }

  /**
   * Load saved session data
   */
  loadSession() {
    if (!existsSync(this.sessionFile)) {
      throw new Error(`No saved session found at ${this.sessionFile}. Run session extraction first.`);
    }

    const session = JSON.parse(readFileSync(this.sessionFile, 'utf-8'));

    // Check if session is still valid (not expired)
    const sessionAge = Date.now() - new Date(session.timestamp).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (sessionAge > maxAge) {
      console.warn('⚠️  Session may be expired. Consider re-extracting if API calls fail.');
    }

    return session;
  }

  /**
   * Get headers for authenticated requests
   */
  getAuthHeaders() {
    const session = this.loadSession();

    return {
      'Cookie': this._formatCookies(session.cookies),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Referer': 'https://claude.ai/',
      'Origin': 'https://claude.ai',
      ...session.headers
    };
  }

  /**
   * Format cookies for request headers
   * @private
   */
  _formatCookies(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Test if current session is valid using Puppeteer stealth
   */
  async testSession() {
    const client = createClaudeClient();

    try {
      const headers = this.getAuthHeaders();
      const response = await client.get('https://claude.ai/api/bootstrap', {
        headers
      });

      if (response.ok) {
        console.log('✅ Claude session is valid');
        return true;
      } else {
        console.log(`❌ Claude session invalid: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Claude session test failed: ${error.message}`);
      return false;
    } finally {
      await client.close();
    }
  }

  /**
   * Extract session from environment variable
   */
  extractFromEnv() {
    const sessionCookie = process.env.CLAUDE_SESSION_COOKIE;
    const orgId = process.env.CLAUDE_ORG_ID;

    if (!sessionCookie) {
      throw new Error('CLAUDE_SESSION_COOKIE environment variable not set');
    }

    // Parse cookie string into object
    const cookies = {};
    sessionCookie.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name && valueParts.length > 0) {
        cookies[name] = valueParts.join('=');
      }
    });

    const sessionData = {
      cookies,
      organizationId: orgId,
      source: 'environment'
    };

    this.saveSession(sessionData);
    return sessionData;
  }
}

/**
 * Helper function to extract cookies from a browser automation context
 */
export async function extractSessionFromPlaywright(page) {
  // Navigate to Claude.ai if not already there
  if (!page.url().includes('claude.ai')) {
    await page.goto('https://claude.ai');
  }

  // Get all cookies
  const cookies = await page.context().cookies();
  const claudeCookies = cookies
    .filter(cookie => cookie.domain.includes('claude.ai'))
    .reduce((acc, cookie) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {});

  // Get organization ID from page if available
  let organizationId = null;
  try {
    // Try to extract from API calls or page context
    const apiCalls = await page.evaluate(() => {
      // Look for organization ID in network requests or local storage
      return {
        orgId: localStorage.getItem('organizationId') || null,
        apiBaseUrl: window.location.href
      };
    });
    organizationId = apiCalls.orgId;
  } catch (error) {
    console.warn('Could not extract organization ID from page');
  }

  return {
    cookies: claudeCookies,
    organizationId,
    userAgent: await page.evaluate(() => navigator.userAgent),
    source: 'playwright'
  };
}