# Simple Chromium AI

A lightweight TypeScript wrapper for Chrome's built-in AI Prompt API that trades flexibility for simplicity and type safety.

## Why Use This?

Chrome's native AI API is powerful but requires careful initialization and session management. This wrapper provides:

- **Type-safe initialization** - Can't call functions without proper setup
- **Automatic error handling** - Graceful failures with clear messages  
- **Simplified API** - Common tasks in one function call
- **Safe API variant** - Result types for better error handling

For advanced use cases requiring more control, use the [original Chrome AI APIs](https://developer.chrome.com/docs/ai/prompt-api) directly.

## Quick Start

```bash
npm install simple-chromium-ai
```

```javascript
import ChromiumAI from 'simple-chromium-ai';

// Initialize once
const ai = await ChromiumAI.initialize("You are a helpful assistant");

// Simple prompt
const response = await ChromiumAI.prompt(ai, "Write a haiku");

// Or use the Safe API for error handling
const safeResult = await ChromiumAI.Safe.initialize("You are a helpful assistant");
safeResult.match(
  async (ai) => {
    const safeResponse = await ChromiumAI.Safe.prompt(ai, "Write a haiku");
    safeResponse.match(
      (value) => console.log(value),
      (error) => console.error(error.message)
    );
  },
  (error) => console.error(error.message)
);
```

## Prerequisites

- Must be called from a browser extension
- Chrome 138+ or supported Chromium Browser
- Enable "Prompt API for Gemini Nano" in `chrome://flags`
- Update "Optimization Guide On Device Model" in `chrome://components` ⚠️ **Warning: This will download ~4GB**
- Join Chrome [EPP](https://developer.chrome.com/docs/ai/join-epp) for web

## Core Functions

### Initialize
```typescript
const ai = await ChromiumAI.initialize(
  systemPrompt?: string
);
```

**Important:** If Chrome AI is not available, downloadable, or downloading, the function will throw an error with instructions on how to enable Chrome AI.

### Single Prompt
```typescript
const response = await ChromiumAI.prompt(
  ai,
  "Your prompt",
  timeout?: number
);
```

### Session Management
```typescript
// Create reusable session
const session = await ChromiumAI.createSession(ai);
const response1 = await session.prompt("Hello");
const response2 = await session.prompt("Follow up"); // Maintains context
session.destroy();

// Override the instance's system prompt for this session
const customSession = await ChromiumAI.createSession(ai, {
  initialPrompts: [{ role: 'system', content: 'You are a pirate' }]
});

// Or use withSession for automatic cleanup
const result = await ChromiumAI.withSession(ai, async (session) => {
  return await session.prompt("Hello");
});
```

### Token Management
```typescript
const usage = await ChromiumAI.checkTokenUsage(ai, "Long text...");
console.log(`Will fit: ${usage.willFit}`);
console.log(`Tokens needed: ${usage.promptTokens}/${usage.maxTokens}`);
```

## Safe API

Every function has a Safe variant that returns Result types instead of throwing:

```typescript
import { ChromiumAI } from 'simple-chromium-ai';

const result = await ChromiumAI.Safe.initialize("You are helpful");
result.match(
  async (ai) => {
    const response = await ChromiumAI.Safe.prompt(ai, "Hello");
    response.match(
      (value) => console.log(value),
      (error) => console.error("Prompt failed:", error.message)
    );
  },
  (error) => {
    console.error("Failed:", error.message);
    return;
  }
);
```

## Type Safety

The wrapper enforces proper initialization through TypeScript:

```typescript
// ❌ Won't compile - need AI instance
await ChromiumAI.prompt("Hello");

// ✅ Correct usage
const ai = await ChromiumAI.initialize("You are helpful");
await ChromiumAI.prompt(ai, "Hello");
```

## Limitations

This wrapper prioritizes simplicity over flexibility. You cannot:

- Customize model parameters beyond basics
- Access streaming responses
- Use advanced session options
- Control memory/context in detail

For these features, use the [native Chromium AI API](https://developer.chrome.com/docs/ai/prompt-api).

## API Reference

### Core Types

```typescript
interface ChromiumAIInstance {
  systemPrompt?: string;
  instanceId: string;
}

interface TokenUsageInfo {
  promptTokens: number;
  maxTokens: number;
  tokensAvailable: number;
  willFit: boolean;
}
```

### All Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `initialize(systemPrompt?)` | Initialize AI with optional system prompt | `ChromiumAIInstance` |
| `prompt(ai, prompt, timeout?)` | Single prompt with optional timeout | `string` |
| `createSession(ai, options?)` | Create reusable session. Options can override system prompt | `LanguageModel` |
| `withSession(ai, callback)` | Execute with temporary session | `T` |
| `checkTokenUsage(ai, prompt)` | Check if prompt fits in context | `TokenUsageInfo` |

Each function has a `Safe.*` variant that returns `Result<T, Error>` instead of throwing.

## Examples

### Basic Chat
```javascript
const ai = await ChromiumAI.initialize("You are a friendly assistant");
const response = await ChromiumAI.prompt(ai, "Tell me a joke");
```

### Error Handling
```javascript
try {
  const ai = await ChromiumAI.initialize("You are helpful");
  const response = await ChromiumAI.prompt(ai, "Hello!");
} catch (error) {
  console.error('Initialization failed:', error.message);
  // Error message will include instructions on how to enable Chrome AI
}
```

### Safe API Example
```javascript
// Using the Safe API for better error handling
const result = await ChromiumAI.Safe.initialize("You are helpful");

result.match(
  async (ai) => {
    const promptResult = await ChromiumAI.Safe.prompt(ai, "Hello!");
    promptResult.match(
      (value) => console.log('Response:', value),
      (error) => console.error('Prompt failed:', error.message)
    );
  },
  (error) => {
    console.error('Initialization failed:', error.message);
    // Error message includes instructions on how to enable Chrome AI
  }
);
```

### Token Checking
```javascript
const usage = await ChromiumAI.checkTokenUsage(ai, longText);
if (!usage.willFit) {
  // Use shorter prompt
  const response = await ChromiumAI.prompt(ai, "Summarize briefly");
}
```

### Structured Output with Response Constraints
```javascript
// Define JSON schema for the response
const schema = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["positive", "negative", "neutral"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      maxItems: 5
    }
  },
  required: ["sentiment", "confidence", "keywords"]
};

// Create session with response constraint
const response = await ChromiumAI.prompt(
  ai, 
  "Analyze the sentiment of this text: 'I love this new feature!'",
  undefined, // no timeout
  { responseConstraint: schema }
);

// Response will be valid JSON matching the schema
const result = JSON.parse(response);
console.log(result); 
// { sentiment: "positive", confidence: 0.95, keywords: ["love", "new", "feature"] }
```

### Cancellable Prompts with AbortController
```javascript
// Create an AbortController to cancel long-running prompts
const controller = new AbortController();

// Set up a cancel button
const cancelButton = document.getElementById('cancel');
cancelButton.onclick = () => controller.abort();

try {
  // Pass the abort signal to the prompt
  const response = await ChromiumAI.prompt(
    ai, 
    "Write a detailed analysis of quantum computing...",
    undefined, // no timeout
    { signal: controller.signal } // abort signal
  );
  console.log(response);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Prompt was cancelled by user');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Demo Extension

A minimal Chrome extension demo is included in the `demo` folder. It demonstrates:
- Checking Chrome AI availability
- Showing setup instructions if not available
- Simple prompt/response interface using the Safe API

To run the demo:
```bash
cd demo
npm install
npm run build
# Then load the demo folder as an unpacked extension in Chrome
```

## Resources

- [Chrome AI Prompt API Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- [Structured Output with Response Constraints](https://developer.chrome.com/docs/ai/structured-output-for-prompt-api)
- [W3C Prompt API Specification](https://github.com/webmachinelearning/prompt-api)
- [Example Usage in Squash Browser Memory Extension](https://github.com/kstonekuan/squash-browser-memory)

## License

MIT
