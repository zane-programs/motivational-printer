#!/usr/bin/env node

import { ClaudeAuthManager } from './src/lib/connectors/claude-ai/auth.mjs';

console.log('🔐 Manual Claude.ai Authentication Setup');
console.log('======================================\n');

console.log('This script helps you manually set up Claude.ai authentication using browser cookies.\n');

console.log('📋 Step-by-step instructions:\n');

console.log('1. Open https://claude.ai in your browser and log in');
console.log('2. Open Developer Tools (F12 or right-click → Inspect)');
console.log('3. Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)');
console.log('4. In the sidebar, click "Cookies" → "https://claude.ai"');
console.log('5. Look for these important cookies and copy their values:');
console.log('   - sessionKey (or similar session identifier)');
console.log('   - authToken (or similar authentication token)');
console.log('   - Any other cookies that look authentication-related\n');

console.log('6. Also note your Organization ID:');
console.log('   - Look at the URL when viewing conversations');
console.log('   - It might be in a URL like: /api/organizations/YOUR-ORG-ID/...');
console.log('   - Or check for API calls in the Network tab\n');

console.log('7. Set these as environment variables in your .env file:');
console.log('');
console.log('   CLAUDE_SESSION_COOKIE="cookie1=value1; cookie2=value2; cookie3=value3"');
console.log('   CLAUDE_ORG_ID="your-organization-id-here"');
console.log('');

console.log('8. Then run: npm run extract-claude-session');
console.log('   This will parse your environment variables and save them as a session file.\n');

console.log('💡 Alternative: Direct environment variable setup');
console.log('');
console.log('If you prefer, you can set the environment variable and test immediately:');
console.log('');
console.log('export CLAUDE_SESSION_COOKIE="your-cookies-here"');
console.log('export CLAUDE_ORG_ID="your-org-id-here"');
console.log('npm run extract-claude-session');
console.log('node test-claude-auth.mjs');
console.log('');

console.log('🔧 Testing your setup:');
console.log('Once configured, test with:');
console.log('- node test-claude-auth.mjs (test authentication)');
console.log('- npm run plan (test full workflow)');
console.log('');

console.log('⚠️  Security notes:');
console.log('- Keep your session cookies secure');
console.log('- Sessions typically expire after ~7 days');
console.log('- Re-extract when you get authentication errors');
console.log('- Never commit session files or cookies to version control');
console.log('');

console.log('🎯 When working correctly, you\'ll see:');
console.log('- "Fetching conversations from Claude.ai API..." during planning');
console.log('- Real conversation data in your enhanced prompts');
console.log('- Highly personalized motivational letters');

// Check current status
console.log('\n📊 Current Status:');

try {
  const authManager = new ClaudeAuthManager();
  const session = authManager.loadSession();
  console.log('✅ Session file found');
  console.log(`   - Created: ${session.timestamp}`);
  console.log(`   - Org ID: ${session.organizationId || 'Not set'}`);
  console.log(`   - Cookies: ${Object.keys(session.cookies || {}).length} found`);

  // Test session
  console.log('\n🔍 Testing current session...');
  authManager.testSession().then(valid => {
    if (valid) {
      console.log('✅ Current session is working!');
      console.log('\n🎉 You\'re all set! Try: npm run plan');
    } else {
      console.log('❌ Current session appears invalid');
      console.log('💡 Follow the steps above to refresh your authentication');
    }
  }).catch(error => {
    console.log('❌ Session test failed:', error.message);
  });

} catch (error) {
  console.log('⚠️  No session file found');
  console.log('💡 Follow the steps above to set up authentication');
}

console.log('\n📞 Need help?');
console.log('- Check CLAUDE_AUTH_SETUP.md for detailed instructions');
console.log('- Try the automated extraction: npm run extract-claude-session');
console.log('- Use mock mode if needed: set useAuthentication: false in code');