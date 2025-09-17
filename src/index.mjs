import PrinterAdapter from "./lib/printer.mjs";
import LLMAdapter from "./lib/llm.mjs";
import { getShortDateFormatted } from "./lib/date.mjs";
import { archiveMessage } from "./lib/archive.mjs";

const printer = new PrinterAdapter();
const llm = new LLMAdapter();

(async function main() {
  try {
    console.log(
      "Motivational Printer - " +
        new Date().toString() +
        " (" +
        Date.now() +
        ")"
    );

    console.log("Starting printer...");
    await printer.start({ fakeMode: true });

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
