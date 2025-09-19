#!/usr/bin/env node

import { ClaudeAuthManager, extractSessionFromPlaywright } from './src/lib/connectors/claude-ai/auth.mjs';

console.log('🔐 Claude.ai Session Extractor');
console.log('==============================\n');

async function extractSession() {
  const authManager = new ClaudeAuthManager();

  console.log('This script will help you extract your Claude.ai session for persistent authentication.\n');

  // First, try environment variable
  try {
    console.log('1. Checking for CLAUDE_SESSION_COOKIE environment variable...');
    const sessionData = authManager.extractFromEnv();
    console.log('✅ Session extracted from environment variable');

    // Test the session
    const isValid = await authManager.testSession();
    if (isValid) {
      console.log('✅ Session is valid and ready to use');
      return;
    } else {
      console.log('❌ Environment session is invalid, trying browser extraction...\n');
    }
  } catch (error) {
    console.log('⚠️  No environment variable found, proceeding with browser extraction...\n');
  }

  // Browser extraction using Playwright
  try {
    console.log('2. Opening browser to extract session...');

    // Dynamic import to handle MCP Playwright
    let playwright;
    try {
      // Try to use MCP Playwright first
      const { mcp__playwright__browser_navigate } = await import('./tools.mjs').catch(() => ({}));
      if (mcp__playwright__browser_navigate) {
        console.log('Using MCP Playwright for session extraction...');
        return await extractWithMCPPlaywright();
      }
    } catch (error) {
      // Fall back to regular Playwright
    }

    // Try regular Playwright
    try {
      playwright = await import('rebrowser-playwright');
    } catch (error) {
      throw new Error('Playwright not available. Please install with: npm install playwright');
    }

    // Use persistent context to maintain login sessions with stealth settings
    // Try to use Brave browser if available, otherwise fall back to Chromium
    let context;
    const stealthArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=TranslateUI'
    ];

    try {
      console.log('Attempting to use Brave Browser with stealth mode...');
      context = await playwright.chromium.launchPersistentContext('./browser-data', {
        headless: false,
        viewport: { width: 1280, height: 720 },
        executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
        args: stealthArgs,
        // Remove automation indicators
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      });
    } catch (error) {
      console.log('Brave Browser not found, falling back to Chromium with stealth mode...');
      context = await playwright.chromium.launchPersistentContext('./browser-data', {
        headless: false,
        viewport: { width: 1280, height: 720 },
        args: stealthArgs,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      });
    }

    const page = context.pages()[0] || await context.newPage();

    // Additional stealth techniques to mask automation
    await page.addInitScript(() => {
      // Remove webdriver property
      delete navigator.__proto__.webdriver;

      // Override the plugins property to mimic a real browser
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override the languages property
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override the platform property
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel',
      });

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    console.log('3. Navigate to Claude.ai and log in...');
    await page.goto('https://claude.ai', { waitUntil: 'networkidle' });

    // Wait for user to log in
    console.log('\n📋 Please complete the following steps:');
    console.log('   1. Log into Claude.ai in the opened browser');
    console.log('   2. Make sure you can see your conversations');
    console.log('   3. Press Enter in this terminal when ready');

    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('\n4. Extracting session data...');
    const sessionData = await extractSessionFromPlaywright(page);

    authManager.saveSession(sessionData);

    // Test the extracted session
    await context.close();

    console.log('\n5. Testing extracted session...');
    const isValid = await authManager.testSession();

    if (isValid) {
      console.log('✅ Session extraction successful!');
      console.log('\nYou can now use the Claude connector with:');
      console.log('- npm run plan (for data gathering)');
      console.log('- Direct API calls to Claude.ai');
    } else {
      console.log('❌ Session extraction failed. Please try again or use manual extraction.');
    }

  } catch (error) {
    console.error('\n❌ Browser extraction failed:', error.message);
    console.log('\n💡 Alternative: Manual cookie extraction');
    console.log('1. Open https://claude.ai in your browser');
    console.log('2. Open Developer Tools (F12)');
    console.log('3. Go to Application → Cookies → https://claude.ai');
    console.log('4. Copy all cookie values and set CLAUDE_SESSION_COOKIE environment variable');
    console.log('   Format: "cookie1=value1; cookie2=value2; ..."');
  }
}

async function extractWithMCPPlaywright() {
  console.log('Using MCP Playwright for session extraction (implement if available)');
  // This would use the MCP Playwright tools if available
  // For now, direct the user to manual extraction
  throw new Error('MCP Playwright extraction not yet implemented');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Session extraction cancelled');
  process.exit(0);
});

extractSession().catch(error => {
  console.error('\n❌ Session extraction failed:', error.message);
  process.exit(1);
});