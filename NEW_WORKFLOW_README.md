# New Plan/Write Workflow

The motivational printer now features a sophisticated two-phase workflow that leverages Claude Sonnet 4 with tool use for intelligent data gathering and analysis.

## Overview

### Phase 1: Planning (`npm run plan`)
- **AI Agent**: Claude Sonnet 4 with tool use capabilities
- **Purpose**: Gather and analyze personal data to create contextually aware prompts
- **Tools Available**: iMessage conversations, Claude AI conversations
- **Output**: Enhanced user prompt with deep personal context

### Phase 2: Writing (`npm run write`)
- **AI Agent**: Claude Opus 4.1 (Your Printer persona)
- **Purpose**: Generate and print personalized motivational letters
- **Input**: Enhanced prompt from planning phase (or default if no plan exists)
- **Output**: Printed motivational letter

## Key Features

### 🧠 Intelligent Planning with Tool Use
- Uses Claude Sonnet 4 as an autonomous agent
- Automatically decides which data sources to query
- Performs multi-step analysis across conversation history
- Extracts emotional context, life events, and psychological patterns
- Generates comprehensive prompts with detailed background

### 🔧 Tool-Based Data Collection
The planner has access to these tools:

- **`imessage_get_conversations`**: Retrieve iMessage conversation metadata
- **`imessage_get_conversation_messages`**: Get detailed message content
- **`claude_ai_get_conversations`**: Retrieve Claude AI conversation metadata
- **`claude_ai_get_conversation_messages`**: Get detailed Claude conversation content

### 📁 Persistent Planning Results
- **Enhanced Prompt**: `planning-output/enhanced-user-prompt.md`
- **Full Analysis**: `planning-output/planning-result-[timestamp].md`
- **Conversation History**: `planning-output/conversation-history-[timestamp].json`
- **Metadata**: `planning-output/latest-plan-metadata.json`

## Usage

### Basic Workflow
```bash
# Step 1: Analyze and plan
npm run plan

# Step 2: Generate and print letter
npm run write

# Or do both in sequence
npm run plan-and-write
```

### Advanced Options
```bash
# Test the new workflow
node test-new-workflow.mjs

# Test individual components (legacy)
node test-planner.mjs
```

## Configuration

### Environment Variables
```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_key

# Planning Configuration
PLANNER_DAYS_BACK=7          # Days to analyze (default: 7)
PLANNER_MAX_MESSAGES=100     # Max messages per conversation (default: 100)

# Claude AI Integration (optional)
CLAUDE_ORG_ID=your_org_id
CLAUDE_API_KEY=your_claude_key
CLAUDE_DATA_PATH=/path/to/local/data
```

## How It Works

### Planning Phase Deep Dive

1. **Initialization**
   - Claude Sonnet 4 receives the planner prompt
   - Understands its task: gather information for Your Printer
   - Gets context about available tools and date ranges

2. **Autonomous Data Collection**
   - Decides which conversations to examine
   - Queries iMessage and Claude AI data sources
   - Adapts strategy based on what it finds
   - May make multiple tool calls to gather comprehensive data

3. **Contextual Analysis**
   - Synthesizes information across all sources
   - Identifies emotional patterns and life events
   - Extracts relevant context for supportive letter writing
   - Creates detailed psychological and situational background

4. **Enhanced Prompt Generation**
   - Transforms analysis into structured prompt
   - Includes specific details about recent conversations
   - Provides Your Printer with deep context for personalization
   - Follows the template format from `PLANNER.md`

### Writing Phase Deep Dive

1. **Context Loading**
   - Checks for existing planning results
   - Loads enhanced prompt if available
   - Falls back to default prompt if no plan exists

2. **Letter Generation**
   - Your Printer (Claude Opus 4.1) receives enhanced context
   - Generates personalized motivational content
   - Uses specific details from recent conversations
   - Maintains supportive, caring tone

3. **Output & Archiving**
   - Archives generated letter with timestamp
   - Prints to thermal printer (or fake mode)
   - Provides detailed logging and feedback

## Example Planning Output

The planning phase generates rich context like this:

```markdown
# Daily Letter for Zane

## Context & Background
You are writing daily supportive letters to Zane, a 22-year-old Stanford student...

## Key Life Events & Challenges
- Recently lost his beloved grandfather to cancer
- Moved from Los Angeles to Baltimore with family
- Struggles with lifelong patterns of emotional labor...

## Core Psychological Patterns to Address
- **Chronic caretaking**: Automatically prioritizes others' needs...
- **Emotional parentification**: Struggling with family dynamics...

## Recent Growth & Strengths
- Increased self-awareness through journaling and therapy
- Successfully created essays.wtf helping hundreds of peers...
```

## Benefits Over Previous System

### 🎯 **Contextual Accuracy**
- No more generic letters
- Specific reference to recent events and conversations
- Addresses current emotional state and challenges

### 🤖 **AI Agent Autonomy**
- Claude decides what data to collect
- Adapts strategy based on findings
- No hardcoded collection patterns

### 🔍 **Deep Analysis**
- Multi-step reasoning about emotional context
- Pattern recognition across time periods
- Psychological insight extraction

### 📊 **Transparency**
- Full conversation history saved for debugging
- Detailed analysis documents available
- Clear metadata about what was analyzed

### 🛠️ **Extensibility**
- Easy to add new data sources as tools
- Modular connector architecture
- Clean separation between planning and writing

## Troubleshooting

### Planning Issues
- **API Errors**: Check `ANTHROPIC_API_KEY` is valid
- **Tool Failures**: Review individual connector issues
- **No Data**: Verify data source access (iMessage permissions, Claude AI config)

### Writing Issues
- **No Plan Found**: Run `npm run plan` first
- **Generic Letters**: Check if planning phase completed successfully
- **Printer Issues**: Verify hardware connection or enable fake mode

### Permission Issues
- **iMessage Access**: Enable Full Disk Access for terminal in System Preferences
- **Claude AI Access**: Verify organization ID and API key

## File Structure

```
motivational-printer/
├── plan.mjs                 # Planning phase script
├── write.mjs                # Writing phase script
├── test-new-workflow.mjs    # Workflow testing
├── planning-output/         # Generated planning results
│   ├── enhanced-user-prompt.md
│   ├── latest-plan-metadata.json
│   └── planning-result-*.md
└── src/lib/
    ├── planner.mjs          # Enhanced planner with tool use
    ├── llm.mjs              # Updated LLM adapter
    └── connectors/          # Data source connectors
```

## Migration Guide

### From Legacy System
The old single-step system (`npm start`) still works but is deprecated:

```bash
# Old way (deprecated)
npm start

# New way (recommended)
npm run plan-and-write
```

### Legacy Planner Support
The old planner integration is maintained for compatibility:

```javascript
// Still works
const llm = new LLMAdapter({ usePlanner: true });

// New preferred approach
// 1. Run npm run plan
// 2. Run npm run write
```

## Performance Notes

- Planning phase: ~30-60 seconds (depends on data volume)
- Writing phase: ~10-15 seconds
- Total storage: ~1-5MB per planning session
- API costs: ~$0.10-0.50 per planning session (varies with data volume)