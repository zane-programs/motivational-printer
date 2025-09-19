import { readFileSync, readdirSync } from "fs";

import { config as dotenvConfig } from "dotenv";
import { Anthropic } from "@anthropic-ai/sdk";

import { getFullDateFormatted } from "./date.mjs";
import Planner from "./planner.mjs";

export default class LLMAdapter {
  /** @type {import("@anthropic-ai/sdk").Anthropic} */
  _client;
  /** @type {Planner} */
  _planner;

  constructor(options = {}) {
    dotenvConfig();

    this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    this._systemPrompt = readFileSync("./prompts/private/SYSTEM.md", "utf-8");
    this._userPromptTemplate = readFileSync(
      "./prompts/private/USER.md",
      "utf-8"
    );

    // Support for custom user prompt (from planning phase)
    this._customUserPrompt = options.customUserPrompt || null;

    // Initialize planner if enabled (legacy support)
    this._usePlanner = options.usePlanner || false;
    if (this._usePlanner) {
      this._planner = new Planner(options.plannerConfig || {});
    }
  }

  /**
   * Generates a motivational message based on the provided sender.
   * @returns {Promise<string>} A motivational message
   */
  async generateMessage() {
    let userPrompt;

    // Priority 1: Use custom user prompt (from planning phase)
    if (this._customUserPrompt) {
      console.log("Using enhanced prompt from planning phase");
      userPrompt = this._customUserPrompt;
    }
    // Priority 2: Use legacy planner if enabled
    else if (this._usePlanner) {
      console.log("Using legacy planner to gather information...");
      try {
        const enhanced = await this._planner.generateEnhancedPrompt();
        userPrompt = enhanced.prompt;
        console.log("Planner gathered information from:", enhanced.metadata.sourcesUsed);
        console.log("Messages analyzed:", enhanced.metadata.messagesAnalyzed);
      } catch (error) {
        console.warn("Planner failed, using default prompt:", error.message);
        userPrompt = this._userPrompt;
      }
    }
    // Priority 3: Use default prompt
    else {
      userPrompt = this._userPrompt;
    }

    const response = await this._client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 2048,
      temperature: 1,
      system: this._systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return response.content[0].text.trim();
  }

  /**
   * Replaces template variables in the user prompt.
   * @param {Object<string, string>} variables - Key-value pairs of variable names and their values.
   * @returns {string} The rendered prompt.
   */
  _renderTemplate(template, variables) {
    return template.replace(/%%([A-Z0-9_]+)%%/g, (_, key) => {
      return variables[key] ?? `%%${key}%%`;
    });
  }

  /**
   * Reads the number of text files in the ./archive directory.
   * @returns {number} The count of text files.
   */
  _readLettersTally() {
    const files = readdirSync("./archive").filter((file) =>
      file.endsWith(".txt")
    );
    return files.length;
  }

  /**
   * Constructs the user prompt with dynamic variables.
   * @returns {Promise<string>} A motivational message
   */
  get _userPrompt() {
    const variables = {
      TODAY_DATE: getFullDateFormatted(),
      PREVIOUS_LETTERS_TALLY: this._readLettersTally(),
    };
    return this._renderTemplate(this._userPromptTemplate, variables);
  }
}
