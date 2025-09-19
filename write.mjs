#!/usr/bin/env node

import { config as dotenvConfig } from "dotenv";
import { existsSync } from "fs";
import PrinterAdapter from "./src/lib/printer.mjs";
import LLMAdapter from "./src/lib/llm.mjs";
import Planner from "./src/lib/planner.mjs";
import { getShortDateFormatted } from "./src/lib/date.mjs";
import { archiveMessage } from "./src/lib/archive.mjs";

// Load environment variables
dotenvConfig();

const noPrinter = process.argv.includes("--no-printer");

if (noPrinter) {
  console.log(
    "⚠️  Running in no-printer (fake) mode - no physical printing will occur\n"
  );
}

console.log("✍️  Motivational Printer - Writing Phase");
console.log("=======================================\n");

async function runWriting() {
  try {
    // Check if planning has been done
    console.log("🔍 Checking for planning results...");

    let planResult;
    try {
      planResult = Planner.loadLatestPlan();
      console.log(`✅ Found planning result from: ${planResult.metadata.date}`);
      console.log(
        `📝 Using enhanced prompt (${planResult.enhancedUserPrompt.length} characters)`
      );
    } catch (error) {
      console.log("⚠️  No planning result found - will use default prompt");
      console.log("💡 Run `npm run plan` first for personalized context");
      planResult = null;
    }

    console.log("");

    // Initialize printer
    const printer = new PrinterAdapter({
      fakeMode: noPrinter,
    });

    console.log("🖨️  Initializing printer...");
    await printer.start();

    // Initialize LLM with custom prompt if available
    const llm = new LLMAdapter({
      customUserPrompt: planResult?.enhancedUserPrompt,
    });

    console.log("🤖 Generating letter with Your Printer...");

    // Generate the motivational message
    const message = await llm.generateMessage();

    console.log("✅ Letter generated successfully!");
    console.log(`📄 Length: ${message.length} characters`);

    // Archive the message
    const archiveInfo = archiveMessage(message);
    console.log(`💾 Message archived to: ${archiveInfo.filename}`);

    // Print the message
    console.log("\n🖨️  Printing letter...");

    // Print date header
    await printer.printText(getShortDateFormatted() + "\n\n", "CT", 1);

    // Print the main message with extra newlines for tearing
    await printer.printText(message + "\n\n\n", "LT");

    // Close printer
    await printer.close();

    console.log("✅ Letter printed successfully!");

    if (planResult) {
      console.log("\n📊 Planning Context Used:");
      console.log(`- Generated: ${planResult.metadata.timestamp}`);
      console.log(
        `- Analysis period: ${planResult.metadata.daysLookedBack} days`
      );
    }

    console.log("\n🎉 Your personalized motivational letter is ready!");
  } catch (error) {
    console.error("\n❌ Writing failed:", error.message);

    if (error.message.includes("API key")) {
      console.error(
        "\n💡 Tip: Make sure your ANTHROPIC_API_KEY is set in your .env file"
      );
    } else if (
      error.message.includes("printer") ||
      error.message.includes("USB")
    ) {
      console.error(
        "\n💡 Tip: Check your printer connection and ensure it's powered on"
      );
      console.error(
        "    You can also run in fake mode by setting fakeMode: true in the PrinterAdapter"
      );
    } else if (error.message.includes("prompts")) {
      console.error(
        "\n💡 Tip: Make sure your prompt files exist in ./prompts/private/"
      );
    }

    console.error(
      "\nFor debugging, check the logs above for specific error details."
    );
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Writing interrupted by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️  Writing terminated");
  process.exit(0);
});

// Run the writing
runWriting();
