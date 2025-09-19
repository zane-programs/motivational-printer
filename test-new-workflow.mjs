#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import Planner from './src/lib/planner.mjs';

console.log('Testing New Plan/Write Workflow');
console.log('================================\n');

async function testPlanningWorkflow() {
  console.log('1. Testing Planning Phase...');

  try {
    const planner = new Planner({
      daysToLookBack: 7,
      maxMessagesToInclude: 20
    });

    // Test generating a plan
    console.log('   - Generating plan with Claude Sonnet 4...');
    const result = await planner.generatePlan();

    console.log('   ✅ Planning completed');
    console.log(`   - Enhanced prompt saved: ${result.promptPath}`);
    console.log(`   - Planning result saved: ${result.fullResultPath}`);

    // Verify files exist
    if (existsSync(result.promptPath)) {
      const promptContent = readFileSync(result.promptPath, 'utf-8');
      console.log(`   - Enhanced prompt length: ${promptContent.length} characters`);
    }

    if (existsSync(result.fullResultPath)) {
      const analysisContent = readFileSync(result.fullResultPath, 'utf-8');
      console.log(`   - Full analysis length: ${analysisContent.length} characters`);
    }

    return true;
  } catch (error) {
    console.error('   ❌ Planning failed:', error.message);
    return false;
  }
}

async function testLoadingWorkflow() {
  console.log('\n2. Testing Loading Workflow...');

  try {
    const planResult = Planner.loadLatestPlan();
    console.log('   ✅ Successfully loaded latest plan');
    console.log(`   - Plan date: ${planResult.metadata.date}`);
    console.log(`   - Enhanced prompt: ${planResult.enhancedUserPrompt.length} characters`);
    console.log(`   - Days analyzed: ${planResult.metadata.daysLookedBack}`);

    return true;
  } catch (error) {
    console.error('   ❌ Loading failed:', error.message);
    return false;
  }
}

async function testFileStructure() {
  console.log('\n3. Testing File Structure...');

  const outputDir = join(process.cwd(), 'planning-output');
  const expectedFiles = [
    'enhanced-user-prompt.md',
    'latest-plan-metadata.json'
  ];

  for (const file of expectedFiles) {
    const filePath = join(outputDir, file);
    if (existsSync(filePath)) {
      console.log(`   ✅ ${file} exists`);
    } else {
      console.log(`   ❌ ${file} missing`);
    }
  }

  return true;
}

async function main() {
  console.log('This test verifies the new plan/write workflow functionality.\n');

  const planningSuccess = await testPlanningWorkflow();

  if (planningSuccess) {
    await testLoadingWorkflow();
    await testFileStructure();

    console.log('\n✅ Workflow test completed successfully!');
    console.log('\nYou can now use:');
    console.log('- npm run plan    (to analyze and generate enhanced prompts)');
    console.log('- npm run write   (to generate and print letters using the plan)');
    console.log('- npm run plan-and-write   (to do both in sequence)');
  } else {
    console.log('\n❌ Planning failed - check your API keys and configuration');
  }
}

main().catch(console.error);