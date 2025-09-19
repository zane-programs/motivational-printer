#!/usr/bin/env node

import Planner from './src/lib/planner.mjs';
import IMessageConnector from './src/lib/connectors/imessage/index.mjs';
import ClaudeAIConnector from './src/lib/connectors/claude-ai/index.mjs';

console.log('Testing Planner Functionality');
console.log('==============================\n');

async function testIMessageConnector() {
  console.log('Testing iMessage Connector...');
  const connector = new IMessageConnector();

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Fetching conversations from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    const conversations = await connector.getConversations(startDate, endDate);

    console.log(`Found ${conversations.length} conversations`);
    if (conversations.length > 0) {
      console.log('First conversation:', conversations[0]);

      // Get messages from first conversation
      const messages = await connector.getConversationMessages(
        conversations[0].id,
        startDate,
        endDate
      );
      console.log(`Found ${messages.length} messages in first conversation`);
      if (messages.length > 0) {
        console.log('Sample message:', messages[0]);
      }
    }
    console.log('✅ iMessage Connector test passed\n');
  } catch (error) {
    console.error('❌ iMessage Connector test failed:', error.message, '\n');
  }
}

async function testClaudeAIConnector() {
  console.log('Testing Claude AI Connector...');
  const connector = new ClaudeAIConnector();

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Fetching conversations from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    const conversations = await connector.getConversations(startDate, endDate);

    console.log(`Found ${conversations.length} conversations`);
    if (conversations.length > 0) {
      console.log('First conversation:', conversations[0]);

      // Get messages from first conversation
      const messages = await connector.getConversationMessages(
        conversations[0].id,
        startDate,
        endDate
      );
      console.log(`Found ${messages.length} messages in first conversation`);
      if (messages.length > 0) {
        console.log('Sample message:', messages[0]);
      }
    }
    console.log('✅ Claude AI Connector test passed\n');
  } catch (error) {
    console.error('❌ Claude AI Connector test failed:', error.message, '\n');
  }
}

async function testPlanner() {
  console.log('Testing Full Planner...');
  const planner = new Planner({
    daysToLookBack: 7,
    maxMessagesToInclude: 50
  });

  try {
    console.log('Gathering information from all sources...');
    const gatheredInfo = await planner.gatherInformation();

    console.log('Information gathered:');
    console.log(`- iMessage conversations: ${gatheredInfo.iMessages.length}`);
    console.log(`- Claude AI conversations: ${gatheredInfo.claudeConversations.length}`);

    if (gatheredInfo.iMessages.length > 0) {
      console.log('\niMessage sample:');
      const firstConv = gatheredInfo.iMessages[0];
      console.log(`  Conversation with: ${firstConv.conversation}`);
      console.log(`  Message count: ${firstConv.messageCount}`);
    }

    if (gatheredInfo.claudeConversations.length > 0) {
      console.log('\nClaude AI sample:');
      const firstConv = gatheredInfo.claudeConversations[0];
      console.log(`  Conversation: ${firstConv.conversationName}`);
      console.log(`  Message count: ${firstConv.messageCount}`);
    }

    console.log('\nAnalyzing information...');
    const analysis = await planner.analyzeInformation(gatheredInfo);
    console.log('Analysis complete. Summary length:', analysis.analysis.length, 'characters');

    console.log('\nGenerating enhanced prompt...');
    const enhanced = await planner.generateEnhancedPrompt();
    console.log('Enhanced prompt generated');
    console.log('Metadata:', enhanced.metadata);

    console.log('✅ Planner test passed\n');
  } catch (error) {
    console.error('❌ Planner test failed:', error.message, '\n');
  }
}

async function main() {
  // Test individual components
  await testIMessageConnector();
  await testClaudeAIConnector();

  // Test full planner
  await testPlanner();

  console.log('Testing complete!');
}

main().catch(console.error);