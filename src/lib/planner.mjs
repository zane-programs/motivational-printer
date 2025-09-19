import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Anthropic } from '@anthropic-ai/sdk';
import { config as dotenvConfig } from 'dotenv';
import IMessageConnector from './connectors/imessage/index.mjs';
import ClaudeAIConnector from './connectors/claude-ai/index.mjs';
import { getFullDateFormatted } from './date.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Planner {
  constructor(options = {}) {
    dotenvConfig();

    // Initialize Anthropic client with Sonnet 4
    this._client = new Anthropic({
      apiKey: options.apiKey || process.env.ANTHROPIC_API_KEY
    });

    // Initialize connectors
    this.connectors = {
      imessage: new IMessageConnector(),
      claude_ai: new ClaudeAIConnector(options.claudeConfig || {})
    };

    // Load prompt templates
    this._loadPrompts();

    // Configuration
    this.daysToLookBack = options.daysToLookBack || 7;
    this.maxMessagesToInclude = options.maxMessagesToInclude || 100;

    // Output directory for storing plan results
    this.outputDir = options.outputDir || join(process.cwd(), 'planning-output');
    this._ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   * @private
   */
  _ensureOutputDir() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Load prompt templates for the planner
   * @private
   */
  _loadPrompts() {
    try {
      // Load the planner prompt
      this._plannerPrompt = readFileSync('./prompts/shared/PLANNER.md', 'utf-8');

      // Load the system and user prompts for the letter writer
      this._systemPrompt = readFileSync('./prompts/private/SYSTEM.md', 'utf-8');
      this._userPromptTemplate = readFileSync('./prompts/private/USER.md', 'utf-8');
    } catch (error) {
      console.warn('Could not load all prompts, using defaults:', error.message);

      // Fallback prompts
      this._plannerPrompt = this._getDefaultPlannerPrompt();
      this._systemPrompt = 'You are Your Printer, a wise and caring presence who writes daily supportive letters.';
      this._userPromptTemplate = 'Write a supportive letter based on the following information:\n\n%%COLLECTED_INFO%%';
    }
  }

  /**
   * Define tools for the Claude planner
   * @private
   */
  _getTools() {
    return [
      {
        name: "imessage_get_conversations",
        description: "Get iMessage conversations within a specific date range. Returns conversation metadata including participants and message counts.",
        input_schema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in ISO format (YYYY-MM-DD)"
            },
            end_date: {
              type: "string",
              description: "End date in ISO format (YYYY-MM-DD)"
            }
          },
          required: ["start_date", "end_date"]
        }
      },
      {
        name: "imessage_get_conversation_messages",
        description: "Get messages from a specific iMessage conversation, optionally within a date range. Returns individual messages with sender, timestamp, and content.",
        input_schema: {
          type: "object",
          properties: {
            conversation_id: {
              type: "string",
              description: "The conversation identifier"
            },
            start_date: {
              type: "string",
              description: "Optional start date in ISO format (YYYY-MM-DD)"
            },
            end_date: {
              type: "string",
              description: "Optional end date in ISO format (YYYY-MM-DD)"
            }
          },
          required: ["conversation_id"]
        }
      },
      {
        name: "claude_ai_get_conversations",
        description: "Get Claude AI conversations within a specific date range. Returns conversation metadata including names and message counts.",
        input_schema: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in ISO format (YYYY-MM-DD)"
            },
            end_date: {
              type: "string",
              description: "End date in ISO format (YYYY-MM-DD)"
            }
          },
          required: ["start_date", "end_date"]
        }
      },
      {
        name: "claude_ai_get_conversation_messages",
        description: "Get messages from a specific Claude AI conversation, optionally within a date range. Returns individual messages with role, timestamp, and content.",
        input_schema: {
          type: "object",
          properties: {
            conversation_id: {
              type: "string",
              description: "The conversation identifier"
            },
            start_date: {
              type: "string",
              description: "Optional start date in ISO format (YYYY-MM-DD)"
            },
            end_date: {
              type: "string",
              description: "Optional end date in ISO format (YYYY-MM-DD)"
            }
          },
          required: ["conversation_id"]
        }
      }
    ];
  }

  /**
   * Get default planner prompt
   * @private
   */
  _getDefaultPlannerPrompt() {
    return `Your task is to gather information for a letter to be written by Your Printer.

## Instructions

Please use the tools at your disposal to find relevant information about the subject's thoughts, feelings, and emotional wellbeing.

Today's date is %%TODAY_DATE%%.

Once you've collected all the information you need, please think carefully and step-by-step to determine which pieces of information will be most relevant to Your Printer's writing of the letter.

Provide a comprehensive summary of the collected information.`;
  }

  /**
   * Execute tool function calls
   * @private
   */
  async _executeTool(toolName, parameters) {
    try {
      switch (toolName) {
        case 'imessage_get_conversations':
          const imsgStartDate = new Date(parameters.start_date);
          const imsgEndDate = new Date(parameters.end_date);
          const imsgConversations = await this.connectors.imessage.getConversations(imsgStartDate, imsgEndDate);
          return {
            conversations: imsgConversations,
            count: imsgConversations.length,
            date_range: `${parameters.start_date} to ${parameters.end_date}`
          };

        case 'imessage_get_conversation_messages':
          const imsgMsgStartDate = parameters.start_date ? new Date(parameters.start_date) : undefined;
          const imsgMsgEndDate = parameters.end_date ? new Date(parameters.end_date) : undefined;
          const imsgMessages = await this.connectors.imessage.getConversationMessages(
            parameters.conversation_id,
            imsgMsgStartDate,
            imsgMsgEndDate
          );
          return {
            messages: imsgMessages,
            count: imsgMessages.length,
            conversation_id: parameters.conversation_id
          };

        case 'claude_ai_get_conversations':
          const claudeStartDate = new Date(parameters.start_date);
          const claudeEndDate = new Date(parameters.end_date);
          const claudeConversations = await this.connectors.claude_ai.getConversations(claudeStartDate, claudeEndDate);
          return {
            conversations: claudeConversations,
            count: claudeConversations.length,
            date_range: `${parameters.start_date} to ${parameters.end_date}`
          };

        case 'claude_ai_get_conversation_messages':
          const claudeMsgStartDate = parameters.start_date ? new Date(parameters.start_date) : undefined;
          const claudeMsgEndDate = parameters.end_date ? new Date(parameters.end_date) : undefined;
          const claudeMessages = await this.connectors.claude_ai.getConversationMessages(
            parameters.conversation_id,
            claudeMsgStartDate,
            claudeMsgEndDate
          );
          return {
            messages: claudeMessages,
            count: claudeMessages.length,
            conversation_id: parameters.conversation_id
          };

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      return {
        error: error.message,
        tool: toolName,
        parameters: parameters
      };
    }
  }

  /**
   * Generate a plan using Claude with tool use
   */
  async generatePlan() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - this.daysToLookBack);

    const plannerPrompt = this._renderTemplate(this._plannerPrompt, {
      TODAY_DATE: getFullDateFormatted(),
      SYSTEM_PROMPT: this._systemPrompt,
      USER_PROMPT: this._userPromptTemplate
    });

    console.log('Starting planning phase with Claude Sonnet 4...');

    let messages = [{
      role: 'user',
      content: `${plannerPrompt}\n\nToday is ${getFullDateFormatted()}. Please use the available tools to gather information about my recent conversations and interactions. Look back ${this.daysToLookBack} days from today to understand my current emotional state and any relevant context for writing a supportive letter.`
    }];

    const tools = this._getTools();
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const response = await this._client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.1,
        tools: tools,
        messages: messages
      });

      console.log(`Planning iteration ${iterations + 1}`);

      // Add assistant's response to conversation
      messages.push({
        role: 'assistant',
        content: response.content
      });

      // Check if Claude wants to use tools
      const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        // No more tools to use, planning is complete
        console.log('Planning complete - no more tools requested');

        // Extract the final planning result
        const textBlocks = response.content.filter(block => block.type === 'text');
        const planningResult = textBlocks.map(block => block.text).join('\n');

        return this._savePlanningResult(planningResult, messages);
      }

      // Execute tools
      const toolResults = [];
      for (const toolBlock of toolUseBlocks) {
        console.log(`Executing tool: ${toolBlock.name}`);
        const result = await this._executeTool(toolBlock.name, toolBlock.input);
        toolResults.push({
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result, null, 2)
        });
      }

      // Add tool results to conversation
      messages.push({
        role: 'user',
        content: toolResults.map(result => ({
          type: 'tool_result',
          tool_use_id: result.tool_use_id,
          content: result.content
        }))
      });

      iterations++;
    }

    throw new Error('Planning exceeded maximum iterations');
  }

  /**
   * Save planning result to file system
   * @private
   */
  _savePlanningResult(planningResult, conversationHistory) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save the final user prompt that was generated
    const userPromptMatch = planningResult.match(/<prompt scope="user" for="Your Printer" updated>([\s\S]*?)<\/prompt>/);
    let enhancedUserPrompt = '';

    if (userPromptMatch) {
      enhancedUserPrompt = userPromptMatch[1].trim();
    } else {
      // Fallback: extract relevant information and create prompt manually
      enhancedUserPrompt = this._renderTemplate(this._userPromptTemplate, {
        TODAY_DATE: getFullDateFormatted(),
        COLLECTED_INFO: planningResult
      });
    }

    // Save the enhanced user prompt
    const promptPath = join(this.outputDir, 'enhanced-user-prompt.md');
    writeFileSync(promptPath, enhancedUserPrompt, 'utf-8');

    // Save the full planning result
    const fullResultPath = join(this.outputDir, `planning-result-${timestamp}.md`);
    writeFileSync(fullResultPath, planningResult, 'utf-8');

    // Save the conversation history for debugging
    const conversationPath = join(this.outputDir, `conversation-history-${timestamp}.json`);
    writeFileSync(conversationPath, JSON.stringify(conversationHistory, null, 2), 'utf-8');

    // Save metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      date: getFullDateFormatted(),
      promptPath: promptPath,
      fullResultPath: fullResultPath,
      conversationPath: conversationPath,
      daysLookedBack: this.daysToLookBack
    };

    const metadataPath = join(this.outputDir, 'latest-plan-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`Planning result saved to: ${promptPath}`);
    console.log(`Full analysis saved to: ${fullResultPath}`);
    console.log(`Metadata saved to: ${metadataPath}`);

    return {
      enhancedUserPrompt,
      promptPath,
      fullResultPath,
      conversationPath,
      metadata,
      planningResult
    };
  }

  /**
   * Load the most recent planning result
   */
  static loadLatestPlan(outputDir = null) {
    const planningDir = outputDir || join(process.cwd(), 'planning-output');
    const metadataPath = join(planningDir, 'latest-plan-metadata.json');

    if (!existsSync(metadataPath)) {
      throw new Error('No planning result found. Run npm run plan first.');
    }

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

    if (!existsSync(metadata.promptPath)) {
      throw new Error('Enhanced user prompt file not found. Run npm run plan first.');
    }

    const enhancedUserPrompt = readFileSync(metadata.promptPath, 'utf-8');

    return {
      enhancedUserPrompt,
      metadata
    };
  }

  /**
   * Replace template variables in text
   * @private
   */
  _renderTemplate(template, variables) {
    return template.replace(/%%([A-Z0-9_]+)%%/g, (_, key) => {
      return variables[key] ?? `%%${key}%%`;
    });
  }
}