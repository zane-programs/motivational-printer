import { readFileSync, readdirSync } from "fs";

import { config as dotenvConfig } from "dotenv";
import { Anthropic } from "@anthropic-ai/sdk";

import { getFullDateFormatted } from "./date.mjs";

export default class LLMAdapter {
  /** @type {import("@anthropic-ai/sdk").Anthropic} */
  _client;

  constructor() {
    dotenvConfig();

    this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    this._systemPrompt = readFileSync("./prompts/SYSTEM.md", "utf-8");
    this._userPromptTemplate = readFileSync("./prompts/USER.md", "utf-8");
  }

  /**
   * Generates a motivational message based on the provided sender.
   * @returns {Promise<string>} A motivational message
   */
  async generateMessage() {
    const response = await this._client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 2048,
      temperature: 1,
      system: this._systemPrompt,
      messages: [{ role: "user", content: this._userPrompt }],
    });

    return response.content[0].text.trim();
  }

  /**
   * Replaces template variables in the user prompt.
   * @param {Object<string, string>} variables - Key-value pairs of variable names and their values.
   * @returns {string}
   */
  _renderTemplate(template, variables) {
    return template.replace(/%%([A-Z0-9_]+)%%/g, (_, key) => {
      return variables[key] ?? `%%${key}%%`;
    });
  }

  _readLettersTally() {
    const files = readdirSync("./archive").filter((file) =>
      file.endsWith(".txt")
    );
    return files.length;
  }

  /**
   * Generates a motivational message based on the provided sender.
   * @param {string} sender
   * @returns {Promise<string>}
   */
  get _userPrompt() {
    const variables = {
      TODAY_DATE: getFullDateFormatted(),
      PREVIOUS_LETTERS_TALLY: this._readLettersTally(),
    };
    return this._renderTemplate(this._userPromptTemplate, variables);
  }
}
