#!/usr/bin/env node

/**
 * Isolated test for iMessage conversation reading
 * This test checks if the IMessageConnector can properly read conversations
 */

import IMessageConnector from './src/lib/connectors/imessage/index.mjs';

async function testIMessageReading() {
  console.log('🔍 Testing iMessage conversation reading...\n');

  const connector = new IMessageConnector();

  try {
    // Test 1: Check if imessage-exporter is available
    console.log('1. Checking if imessage-exporter is installed...');

    // Test 2: Get recent conversations (last 30 days)
    console.log('2. Fetching recent conversations (last 30 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`   Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Let's also test without date filters to see if we get any results
    console.log('   First trying without date filters...');
    let conversations = await connector.getConversations();
    console.log(`   Without filters: ${conversations.length} conversations found`);

    if (conversations.length === 0) {
      console.log('   Now trying with date range...');
      conversations = await connector.getConversations(startDate, endDate);
    }
    console.log(`   Found ${conversations.length} conversations:`);

    for (const conv of conversations.slice(0, 5)) { // Show first 5
      console.log(`   - ${conv.participants.join(', ')} (${conv.messageCount} messages)`);
      console.log(`     Last: ${conv.lastMessageDate.toLocaleString()}`);
    }

    if (conversations.length > 5) {
      console.log(`   ... and ${conversations.length - 5} more`);
    }

    // Test 3: Get messages from first conversation if available
    if (conversations.length > 0) {
      console.log('\n3. Testing message retrieval from first conversation...');
      const firstConv = conversations[0];
      const messages = await connector.getConversationMessages(firstConv.id, startDate, endDate);

      console.log(`   Retrieved ${messages.length} messages:`);
      for (const msg of messages.slice(0, 3)) { // Show first 3
        const fromLabel = msg.isFromMe ? 'Me' : msg.sender;
        const preview = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
        console.log(`   - ${msg.timestamp.toLocaleString()} [${fromLabel}]: ${preview}`);
      }

      if (messages.length > 3) {
        console.log(`   ... and ${messages.length - 3} more messages`);
      }
    }

    // Test 4: Test getRecentMessages helper
    console.log('\n4. Testing getRecentMessages helper...');
    const recentMessages = await connector.getRecentMessages(3); // Last 3 days
    console.log(`   Found ${recentMessages.length} recent messages across all conversations`);

    if (recentMessages.length > 0) {
      console.log('   Most recent messages:');
      for (const msg of recentMessages.slice(0, 5)) {
        const fromLabel = msg.isFromMe ? 'Me' : msg.sender;
        const preview = msg.text.length > 40 ? msg.text.substring(0, 40) + '...' : msg.text;
        console.log(`   - ${msg.timestamp.toLocaleString()} [${fromLabel}]: ${preview}`);
      }
    }

    console.log('\n✅ iMessage reading test completed successfully!');

  } catch (error) {
    console.error('\n❌ iMessage reading test failed:');
    console.error('Error:', error.message);

    if (error.message.includes('command not found') || error.message.includes('imessage-exporter')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Install imessage-exporter: brew install imessage-exporter');
      console.log('   2. Or install via npm: npm install -g imessage-exporter');
      console.log('   3. Make sure imessage-exporter is in your PATH');
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      console.log('\n💡 Possible solutions:');
      console.log('   1. Grant Terminal/iTerm2 Full Disk Access in System Preferences > Security & Privacy');
      console.log('   2. Make sure the Messages app database is accessible');
    }

    console.log('\nFull error details:');
    console.error(error);
  }

  // Check for common issues even if no exception was thrown
  console.log('\n🔧 Diagnostic checks:');

  // Check if imessage-exporter is installed
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync('which imessage-exporter');
    console.log('✅ imessage-exporter is installed and in PATH');
  } catch (error) {
    console.log('❌ imessage-exporter not found in PATH');
    console.log('   Install with: brew install imessage-exporter');
  }

  // Check database access
  try {
    const { existsSync } = await import('fs');
    const dbPath = '/Users/zanestjohn/Library/Messages/chat.db';

    if (existsSync(dbPath)) {
      console.log('✅ Messages database file exists');

      // Try to read it
      const { readFileSync } = await import('fs');
      try {
        readFileSync(dbPath, { flag: 'r' });
        console.log('✅ Can read Messages database (Full Disk Access granted)');
      } catch (error) {
        console.log('❌ Cannot read Messages database (Full Disk Access needed)');
        console.log('   Go to: System Settings > Privacy & Security > Full Disk Access');
        console.log('   Add your terminal app (Terminal.app, iTerm2, etc.)');
      }
    } else {
      console.log('❌ Messages database not found at expected location');
    }
  } catch (error) {
    console.log('❌ Could not check database access:', error.message);
  }
}

// Run the test
testIMessageReading().catch(console.error);