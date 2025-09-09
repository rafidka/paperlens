# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Compile TypeScript to JavaScript (required after any src/*.ts changes)
npx tsc

# Start development server (includes TypeScript compilation)
./start.sh
# Opens http://localhost:8000

# Quick development cycle
npx tsc && ./start.sh
```

### Testing
No test suite currently exists. Functionality should be tested manually in the browser.

## Architecture

### TypeScript Module System
- **Source files**: `src/*.ts` - All development happens here
- **Compiled output**: `js/*.js` - Auto-generated, do not edit directly
- **Module type**: ES2020 modules with browser-native imports
- **Build**: Simple TypeScript compilation via `npx tsc`, no bundling

### Core Components

1. **src/index.ts**: Main application controller
   - Initializes UI and event handlers
   - Orchestrates interactions between modules
   - Contains prompt templates for LLM operations
   - Manages global state (current paper, Q&A history)

2. **src/paper.ts**: Arxiv paper fetching and parsing
   - Uses Ar5iv service for clean HTML versions
   - Handles paper ID extraction from URLs
   - Parses paper content and metadata via AllOrigins proxy

3. **src/llm.ts**: Multi-provider LLM integration
   - Supports Cohere, Anthropic, and OpenAI
   - Handles both streaming and non-streaming API calls
   - Model constants: `OPENAI_MODEL`, `ANTHROPIC_MODEL`, `COHERE_MODEL`

4. **src/cache.ts**: LocalStorage persistence layer
   - Manages paper caching and library
   - Stores API keys and provider settings
   - Handles all localStorage operations

5. **src/ui.ts**: DOM manipulation and UI state
   - Tab management and content rendering
   - Modal controls (setup, library)
   - Error handling and status updates
   - Markdown rendering for AI responses

### Data Flow
1. User loads paper ID → `paper.ts` fetches from Arxiv
2. Paper content cached in localStorage via `cache.ts`
3. AI operations sent through `llm.ts` to selected provider
4. Results displayed via `ui.ts` DOM updates
5. All generated content cached for offline access

### Key Implementation Details
- Uses browser-native ES modules (no bundler)
- All API calls happen client-side (browser)
- CORS handled via AllOrigins proxy service
- Streaming responses supported for better UX
- Provider preference order: Cohere → Anthropic → OpenAI