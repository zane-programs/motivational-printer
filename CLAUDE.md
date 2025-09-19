# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a motivational message printer application that generates personalized motivational messages using Claude AI and prints them to a thermal printer. The system archives all generated messages and can operate in "fake mode" for testing without a physical printer.

## Commands

### Running the Application
- `npm start` - Run the main application (generates and prints a motivational message)
- The application runs in fake mode by default (line 20 of src/index.mjs sets `fakeMode: true`)

### Development
- No lint or test commands are currently configured
- The project uses ES modules (`.mjs` files)

## Architecture

### Core Components

1. **Main Entry (src/index.mjs)**
   - Orchestrates the entire flow: printer initialization → message generation → archiving → printing
   - Handles graceful error logging

2. **LLM Integration (src/lib/llm.mjs)**
   - Uses Anthropic Claude API (model: claude-opus-4-1-20250805)
   - Loads prompts from `prompts/private/SYSTEM.md` and `prompts/private/USER.md`
   - Includes template rendering with variables like `%%TODAY_DATE%%` and `%%PREVIOUS_LETTERS_TALLY%%`
   - Tracks the count of previously generated messages from the archive

3. **Printer Module (src/lib/printer.mjs)**
   - Wraps `@node-escpos/core` and `@node-escpos/usb-adapter`
   - Supports both real printing and "fake mode" for testing
   - Handles USB device management and graceful shutdown
   - Provides methods for text alignment, sizing, and formatting

4. **Archive System (src/lib/archive.mjs)**
   - Saves generated messages to `./archive/` directory with timestamps
   - File naming uses date formatting from date.mjs

## Important Notes

- **Environment Variables**: Requires `ANTHROPIC_API_KEY` in `.env` file
- **Prompt Templates**: Located in `prompts/private/` (not tracked in git)
  - SYSTEM.md and USER.md contain the actual prompts
  - Template variables are replaced at runtime
- **Archive Directory**: Messages are stored as timestamped `.txt` files
- **Fake Mode**: Can be enabled in `PrinterAdapter` constructor to prevent accidental printing