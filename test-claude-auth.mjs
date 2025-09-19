#!/usr/bin/env node

import { ClaudeAuthManager } from './src/lib/connectors/claude-ai/auth.mjs';
import ClaudeAIConnector from './src/lib/connectors/claude-ai/index.mjs';

console.log('🔐 Testing Claude.ai Authentication');
console.log('===================================\n');

async function testAuthenticationFlow() {
  // Test 1: Check if we can initialize auth manager
  console.log('1. Initializing Claude Authentication Manager...');
  const authManager = new ClaudeAuthManager();
  console.log('✅ Auth manager initialized');

  // Test 2: Try to load existing session
  console.log('\n2. Checking for existing session...');
  try {
    const session = authManager.loadSession();
    console.log('✅ Found existing session');
    console.log(`   - Timestamp: ${session.timestamp}`);
    console.log(`   - Organization ID: ${session.organizationId || 'Not set'}`);
    console.log(`   - Cookies: ${Object.keys(session.cookies || {}).length} found`);

    // Test 3: Validate session
    console.log('\n3. Testing session validity...');
    const isValid = await authManager.testSession();
    if (isValid) {
      console.log('✅ Session is valid and working');
    } else {
      console.log('❌ Session appears to be invalid or expired');
    }

  } catch (error) {
    console.log('❌ No existing session found');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 To set up authentication:');
    console.log('   Option 1: Run `npm run extract-claude-session`');
    console.log('   Option 2: Set CLAUDE_SESSION_COOKIE in .env file');
    return false;
  }

  // Test 4: Test Claude connector with authentication
  console.log('\n4. Testing Claude connector with authentication...');
  try {
    const connector = new ClaudeAIConnector({
      useAuthentication: true
    });

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log('   - Fetching conversations...');
    const conversations = await connector.getConversations(startDate, endDate);
    console.log(`✅ Found ${conversations.length} conversations`);

    if (conversations.length > 0) {
      console.log('   - Sample conversation:', conversations[0].name || conversations[0].id);
    }

    return true;

  } catch (error) {
    console.log('❌ Claude connector test failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function testEnvironmentVariableFlow() {
  console.log('\n5. Testing environment variable authentication...');

  if (process.env.CLAUDE_SESSION_COOKIE) {
    console.log('✅ CLAUDE_SESSION_COOKIE environment variable found');

    try {
      const authManager = new ClaudeAuthManager();
      const sessionData = authManager.extractFromEnv();
      console.log('✅ Session extracted from environment');
      console.log(`   - Cookies: ${Object.keys(sessionData.cookies).length} found`);

      // Test the extracted session
      const isValid = await authManager.testSession();
      if (isValid) {
        console.log('✅ Environment session is valid');
      } else {
        console.log('❌ Environment session is invalid');
      }

    } catch (error) {
      console.log('❌ Failed to extract session from environment');
      console.log(`   Error: ${error.message}`);
    }

  } else {
    console.log('⚠️  CLAUDE_SESSION_COOKIE environment variable not set');
    console.log('💡 You can set it like: CLAUDE_SESSION_COOKIE="cookie1=value1; cookie2=value2"');
  }
}

async function main() {
  const success = await testAuthenticationFlow();
  await testEnvironmentVariableFlow();

  console.log('\n📋 Summary:');
  if (success) {
    console.log('✅ Claude.ai authentication is working correctly');
    console.log('🎯 Your planner can now access real Claude.ai data');
  } else {
    console.log('❌ Authentication setup needed');
    console.log('\n🔧 Next steps:');
    console.log('1. Run: npm run extract-claude-session');
    console.log('2. Follow the interactive prompts to log in');
    console.log('3. Test again with: node test-claude-auth.mjs');
  }
}

main().catch(console.error);