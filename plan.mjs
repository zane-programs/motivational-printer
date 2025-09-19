#!/usr/bin/env node

import { config as dotenvConfig } from 'dotenv';
import Planner from './src/lib/planner.mjs';

// Load environment variables
dotenvConfig();

console.log('🔍 Motivational Printer - Planning Phase');
console.log('========================================\n');

async function runPlanning() {
  try {
    // Configuration
    const plannerConfig = {
      daysToLookBack: parseInt(process.env.PLANNER_DAYS_BACK) || 7,
      maxMessagesToInclude: parseInt(process.env.PLANNER_MAX_MESSAGES) || 100,
      claudeConfig: {
        organizationId: process.env.CLAUDE_ORG_ID,
        apiKey: process.env.CLAUDE_API_KEY,
        dataPath: process.env.CLAUDE_DATA_PATH
      }
    };

    console.log(`Configuration:`);
    console.log(`- Looking back: ${plannerConfig.daysToLookBack} days`);
    console.log(`- Max messages per source: ${plannerConfig.maxMessagesToInclude}`);
    console.log(`- Claude AI integration: ${plannerConfig.claudeConfig.organizationId ? 'Enabled' : 'Mock mode'}`);
    console.log('');

    // Initialize planner
    const planner = new Planner(plannerConfig);

    console.log('🤖 Starting AI-powered planning with Claude Sonnet 4...');
    console.log('This may take a few moments as we gather and analyze information.\n');

    // Generate plan using tool use
    const result = await planner.generatePlan();

    console.log('\n✅ Planning complete!');
    console.log(`📝 Enhanced user prompt saved to: ${result.promptPath}`);
    console.log(`📊 Full analysis saved to: ${result.fullResultPath}`);
    console.log(`🔧 Debug information saved to: ${result.conversationPath}`);

    console.log('\n📋 Planning Summary:');
    console.log(`- Generated on: ${result.metadata.date}`);
    console.log(`- Days analyzed: ${result.metadata.daysLookedBack}`);

    console.log('\n🎯 Next step: Run `npm run write` to generate your personalized letter');

  } catch (error) {
    console.error('\n❌ Planning failed:', error.message);

    if (error.message.includes('API key')) {
      console.error('\n💡 Tip: Make sure your ANTHROPIC_API_KEY is set in your .env file');
    } else if (error.message.includes('organization')) {
      console.error('\n💡 Tip: Check your Claude AI configuration (CLAUDE_ORG_ID, CLAUDE_API_KEY)');
    } else if (error.message.includes('tool use')) {
      console.error('\n💡 Tip: This might be a temporary API issue. Try again in a moment.');
    }

    console.error('\nFor debugging, check the logs above for specific error details.');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Planning interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Planning terminated');
  process.exit(0);
});

// Run the planning
runPlanning();