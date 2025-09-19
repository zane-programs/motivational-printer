#!/usr/bin/env node

/**
 * Test Claude Session Script
 *
 * Tests the saved Claude.ai session to ensure it's working properly
 * with the new Puppeteer stealth implementation.
 */

import { ClaudeAuthManager } from './src/lib/connectors/claude-ai/auth.mjs';
import ClaudeAIConnector from './src/lib/connectors/claude-ai/index.mjs';

async function testClaudeSession() {
  console.log(`
🧪 Testing Claude.ai Session
============================

This script will test your saved Claude.ai session using the
new Puppeteer stealth implementation.
`);

  try {
    // Test 1: Check if session file exists
    console.log('📁 Checking for saved session...');
    const authManager = new ClaudeAuthManager();

    let session;
    try {
      session = authManager.loadSession();
      console.log(`✅ Session file found: ${authManager.sessionFile}`);
      console.log(`   - Extracted: ${session.extractedAt || session.timestamp}`);
      console.log(`   - Source: ${session.source || 'unknown'}`);
      console.log(`   - Organization ID: ${session.organizationId || 'not set'}`);
      console.log(`   - Cookies: ${Object.keys(session.cookies || {}).length}`);
    } catch (error) {
      throw new Error(`No session found: ${error.message}\n\n💡 Run: npm run interactive-claude-auth`);
    }

    // Test 2: Test session validity with PuppeteerClient
    console.log('\n🔐 Testing session with Puppeteer stealth...');
    const isValid = await authManager.testSession();

    if (!isValid) {
      throw new Error('Session test failed - session may be expired or invalid');
    }

    // Test 3: Test full connector functionality
    console.log('\n🔌 Testing Claude connector...');
    const connector = new ClaudeAIConnector({
      useAuthentication: true,
      organizationId: session.organizationId
    });

    console.log('📋 Fetching conversations...');
    const conversations = await connector.getConversations();

    console.log(`✅ Found ${conversations.length} conversations`);

    if (conversations.length > 0) {
      console.log('\n📝 Recent conversations:');
      conversations.slice(0, 3).forEach((conv, i) => {
        console.log(`   ${i + 1}. ${conv.name} (${conv.messageCount} messages)`);
      });

      // Test fetching messages from the first conversation
      if (conversations[0]) {
        console.log(`\n💬 Testing message fetch from: "${conversations[0].name}"`);
        const messages = await connector.getConversationMessages(conversations[0].id);
        console.log(`✅ Retrieved ${messages.length} messages`);
      }
    }

    console.log(`
🎉 SUCCESS! Your Claude.ai session is working perfectly.

✅ Session file is valid
✅ Puppeteer stealth bypass working
✅ API authentication successful
✅ Conversation data accessible

Your Claude connector is ready to use!
`);

  } catch (error) {
    console.error(`\n❌ Session test failed: ${error.message}`);

    console.error(`\n🔧 Troubleshooting steps:`);
    console.error(`1. Run interactive authentication: npm run interactive-claude-auth`);
    console.error(`2. Check if you're logged into Claude.ai in your browser`);
    console.error(`3. Verify your internet connection`);
    console.error(`4. Make sure Claude.ai is accessible from your location`);

    if (error.message.includes('Authentication failed')) {
      console.error(`5. Your session may have expired - re-run authentication`);
    }

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test cancelled by user');
  process.exit(0);
});

// Run the test
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  testClaudeSession().catch(error => {
    console.error(`\n💥 Unexpected error: ${error.message}`);
    process.exit(1);
  });
}