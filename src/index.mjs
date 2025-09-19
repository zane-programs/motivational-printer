import PrinterAdapter from "./lib/printer.mjs";
import LLMAdapter from "./lib/llm.mjs";
import { getShortDateFormatted } from "./lib/date.mjs";
import { archiveMessage } from "./lib/archive.mjs";

// Configuration - set to true to enable planner functionality
const USE_PLANNER = process.env.USE_PLANNER === 'true' || false;

// Claude AI configuration (optional - needed for planner)
const CLAUDE_CONFIG = {
  organizationId: process.env.CLAUDE_ORG_ID,
  apiKey: process.env.CLAUDE_API_KEY,
  dataPath: process.env.CLAUDE_DATA_PATH
};

const printer = new PrinterAdapter();
const llm = new LLMAdapter({
  usePlanner: USE_PLANNER,
  plannerConfig: {
    daysToLookBack: parseInt(process.env.PLANNER_DAYS_BACK) || 7,
    maxMessagesToInclude: parseInt(process.env.PLANNER_MAX_MESSAGES) || 100,
    claudeConfig: CLAUDE_CONFIG
  }
});

(async function main() {
  try {
    console.log(
      "Motivational Printer - " +
        new Date().toString() +
        " (" +
        Date.now() +
        ")"
    );

    if (USE_PLANNER) {
      console.log("Planner mode enabled - will gather information from available sources");
    }

    console.log("Starting printer...");
    await printer.start();

    console.log("Generating motivational message...");

    const message = await llm.generateMessage();

    // Save the message to a timestamped text file in the ./archive directory
    archiveMessage(message);
    console.log("Message generated and archived.");

    await printer.printText(getShortDateFormatted() + "\n\n", "CT", 1);

    await printer.printText(
      // Add extra newlines to ensure the message can be torn off
      message + "\n\n\n",
      "LT"
    );

    await printer.close();

    console.log("Print job completed and printer closed.");
  } catch (error) {
    // Log failures to stderr
    console.error("Failed to initialize printer:");
    console.error(error);
  }
})();
