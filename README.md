# PaperLens - AI-Powered Arxiv Paper Reader

A static web application for reading and analyzing academic papers from Arxiv using AI assistance. Features include paper summarization, key concept extraction, Q&A functionality, and text-to-speech optimization.

## Features

- 📄 **Paper Loading**: Load papers directly from Arxiv using paper IDs or URLs
- 🤖 **AI Integration**: Support for Cohere, OpenAI, and Anthropic APIs with latest 2025 models
- ⚙️ **Model Selection**: Choose from multiple AI models for each provider (GPT-5, Claude Opus 4.1, Command A, etc.)
- 📝 **Smart Analysis**: Generate summaries, extract key concepts, and create readable versions
- 💬 **Interactive Q&A**: Ask questions about loaded papers and get AI-powered answers
- 💾 **Caching**: Automatic caching of papers and AI-generated content for offline access
- 📚 **Paper Library**: Browse and manage your cached paper collection
- 📱 **Responsive Design**: Works on both desktop and mobile devices

## File Structure

```
paperlens/
├── index.html          # Main HTML structure
├── css/
│   ├── main.css       # Core styles (layout, buttons, forms)
│   └── components.css # Component styles (tabs, library, cache indicators)
├── src/               # TypeScript source files
│   ├── index.ts      # Main application logic and initialization
│   ├── cache.ts      # LocalStorage caching functionality
│   ├── llm.ts        # LLM provider integrations (Cohere, Anthropic, OpenAI)
│   ├── ui.ts         # UI interactions and DOM manipulation
│   └── paper.ts      # Paper loading and processing from Arxiv
├── js/                # Compiled JavaScript (generated from src/)
│   ├── index.js      # Compiled main application
│   ├── cache.js      # Compiled cache module
│   ├── llm.js        # Compiled LLM module
│   ├── ui.js         # Compiled UI module
│   └── paper.js      # Compiled paper module
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Usage

### Quick Start

**GitHub Pages (Recommended):**
Visit https://rafidka.github.io/paperlens/ to use the deployed version

**Local Development:**

```bash
# Compile TypeScript to JavaScript
npx tsc

# Run the development server
./start.sh

# Then open http://localhost:8000/index.html in your browser
```

**Option 3: Using any HTTP server**

```bash
# Python (built-in)
python3 -m http.server 8000

# Node.js (if you have it)
npx serve

# PHP (if you have it)
php -S localhost:8000
```

### Using the App

1. **API Keys**: Enter your API key(s) for at least one LLM provider and select your preferred model
2. **Model Selection**: Choose from the latest 2025 models for optimal performance
3. **Load Paper**: Enter an Arxiv paper URL or ID (e.g., `2301.00001`)
4. **Analyze**: Use the tabs to generate summaries, extract concepts, or create readable versions
5. **Q&A**: Ask questions about the paper in the Q&A tab
6. **Library**: Access your cached papers through the Paper Library

## Browser Compatibility

- Requires ES6 module support and HTTP server (due to CORS policy)
- Works offline after initial paper loading and caching
- TypeScript compilation required for local development
- Deployed version works directly in any modern browser

## Development

### Development Workflow

**Standard development:**

```bash
# 1. Edit TypeScript files in src/ or CSS files
# 2. Compile TypeScript to JavaScript
npx tsc

# 3. Start development server and test
./start.sh
# Then open http://localhost:8000/index.html
```

**For quick testing:**

```bash
# Just compile and test directly
npx tsc && ./start.sh
```

### File Architecture

The application uses TypeScript modules with ES2020 compilation for clean organization:

- **src/cache.ts**: Handles all localStorage operations and library management
- **src/llm.ts**: Contains API integrations and prompt management
- **src/paper.ts**: Manages Arxiv paper fetching and content parsing
- **src/ui.ts**: Handles all DOM manipulation and user interface updates
- **src/index.ts**: Main application controller and event handling

### Build System

- **TypeScript**: Source files written in TypeScript with proper interfaces
- **tsconfig.json**: Configured for ES2020 modules, compiles to `js/` folder
- **Simple compilation**: `npx tsc` compiles all `.ts` files to corresponding `.js` files

**Important:** Always edit the TypeScript files in `src/` and CSS files. The `js/` folder is auto-generated.

## API Keys & Models

You'll need API keys from one or more of these providers:

- **Cohere**: Get from https://dashboard.cohere.ai/api-keys
- **Anthropic**: Get from https://console.anthropic.com/
- **OpenAI**: Get from https://platform.openai.com/api-keys

### Supported Models (2025)

**OpenAI:**
- GPT-5 (flagship model with state-of-the-art performance)
- GPT-5 Mini (fast and affordable)
- GPT-5 Nano (smallest and fastest)
- GPT-4.1 (enhanced coding and reasoning)

**Anthropic:**
- Claude Opus 4.1 (most capable model)
- Claude Sonnet 4 (high-performance reasoning)

**Cohere:**
- Command A (March 2025) - Best for agentic tasks
- Command A Reasoning (August 2025) - Advanced reasoning capabilities

API keys are stored locally in your browser and never sent to external servers except the respective API providers. Model selections are also saved locally for convenience.

## Technical Notes

- Uses the Ar5iv service (https://ar5iv.labs.arxiv.org) for clean HTML versions of papers
- Employs AllOrigins proxy service for CORS handling
- All data is stored locally using browser localStorage
- TypeScript compilation creates modular ES2020 JavaScript files
- Built with standard TypeScript tooling for type safety and modern JavaScript output
- Modular architecture allows for easy development and maintenance
