import { readFileSync } from "fs";

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
   * Generates a motivational message based on the provided sender.
   * @param {string} sender
   * @returns {Promise<string>}
   */
  get _userPrompt() {
    return this._userPromptTemplate.replace(
      "%%TODAY_DATE%%",
      getFullDateFormatted()
    );
  }
}
