# Planner Functionality

The planner module enhances the motivational printer by gathering context from various data sources before generating messages. This allows Your Printer to write more personalized and contextually aware letters.

## Features

- **Multi-Source Data Collection**: Gathers information from iMessage and Claude AI conversations
- **Intelligent Analysis**: Uses AI to analyze and summarize relevant emotional and contextual information
- **Enhanced Prompt Generation**: Creates enriched prompts with gathered context for better letter generation
- **Modular Connectors**: Extensible connector architecture for adding new data sources

## Architecture

### Components

1. **Base Connector** (`src/lib/connectors/BaseConnector.mjs`)
   - Abstract base class for all data connectors
   - Defines standard interface for conversation and message retrieval

2. **iMessage Connector** (`src/lib/connectors/imessage/index.mjs`)
   - Uses `imessage-exporter` binary to extract conversations
   - Processes text messages from macOS Messages app
   - Supports date filtering and conversation selection

3. **Claude AI Connector** (`src/lib/connectors/claude-ai/index.mjs`)
   - Retrieves conversations from Claude AI
   - Can work with API or local data
   - Includes tree traversal for conversation reconstruction

4. **Planner** (`src/lib/planner.mjs`)
   - Orchestrates data collection from all connectors
   - Analyzes gathered information using AI
   - Generates enhanced prompts with contextual information

## Configuration

### Environment Variables

```bash
# Enable planner functionality
USE_PLANNER=true

# Planner configuration
PLANNER_DAYS_BACK=7          # Number of days to look back for messages
PLANNER_MAX_MESSAGES=100     # Maximum messages to include per source

# Claude AI configuration (optional)
CLAUDE_ORG_ID=your_org_id
CLAUDE_API_KEY=your_api_key
CLAUDE_DATA_PATH=/path/to/local/data

# Anthropic API key (required)
ANTHROPIC_API_KEY=your_key
```

### Usage

1. **Basic Usage** (without planner):
   ```bash
   npm start
   ```

2. **With Planner Enabled**:
   ```bash
   USE_PLANNER=true npm start
   ```

3. **Testing Planner Components**:
   ```bash
   node test-planner.mjs
   ```

## How It Works

1. **Data Collection Phase**:
   - Planner queries iMessage for recent conversations
   - Retrieves Claude AI conversation history
   - Filters messages based on configured time window

2. **Analysis Phase**:
   - Collected messages are formatted and summarized
   - AI analyzes emotional context and key themes
   - Relevant information is extracted for letter writing

3. **Prompt Enhancement**:
   - Original prompt template is enriched with gathered context
   - Enhanced prompt includes specific details about recent interactions
   - Your Printer receives contextually aware instructions

## Data Sources

### iMessage
- Requires macOS with Messages app
- Uses globally installed `imessage-exporter` binary
- Exports conversations to temporary text files for processing

### Claude AI
- Can use API access (requires org ID and API key)
- Falls back to mock data for testing
- Supports conversation tree reconstruction

## Security & Privacy

- All data processing happens locally
- Temporary files are cleaned up after processing
- API credentials are never logged or exposed
- Message content is only used for prompt generation

## Extending the System

To add a new data source:

1. Create a new connector extending `BaseConnector`:
   ```javascript
   export default class MyConnector extends BaseConnector {
     async getConversations(startDate, endDate) {
       // Implementation
     }

     async getConversationMessages(conversationId, startDate, endDate) {
       // Implementation
     }
   }
   ```

2. Add the connector to the planner:
   ```javascript
   // In src/lib/planner.mjs
   this.connectors = {
     imessage: new IMessageConnector(),
     claude_ai: new ClaudeAIConnector(),
     my_source: new MyConnector()  // Add your connector
   };
   ```

3. Update the `gatherInformation` method to include your data source

## Troubleshooting

### iMessage Connector Issues
- Ensure `imessage-exporter` is installed: `brew install imessage-exporter` (if available via Homebrew)
- Check Messages app permissions
- Verify database access at `~/Library/Messages/chat.db`

### Claude AI Connector Issues
- Verify API credentials if using API mode
- Check organization ID is correct
- Ensure proper network connectivity

### General Issues
- Check all required environment variables are set
- Review logs for specific error messages
- Run `test-planner.mjs` to diagnose component issues

## Future Enhancements

- [ ] Add more data sources (email, calendar, notes)
- [ ] Implement caching for frequently accessed data
- [ ] Add configuration for specific conversation filtering
- [ ] Create web interface for configuration
- [ ] Add encryption for sensitive data storage