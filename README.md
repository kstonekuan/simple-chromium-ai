# Simple Chromium AI SDK

A lightweight, type-safe SDK for Chrome's built-in AI capabilities. This SDK provides a simple interface to interact with Chrome's native Language Model API with proper initialization guarantees through TypeScript's type system.

## Features

- **Type-Safe Initialization**: Enforces proper AI initialization through the type system
- **System Prompt Support**: Configure consistent behavior across all AI interactions
- **Automatic Download Handling**: Manages model download with progress tracking
- **Session Management**: Both single-use and reusable session support
- **Error Handling**: Graceful error handling with user-friendly messages
- **TypeScript Support**: Full TypeScript definitions included
- **Zero Dependencies**: No external dependencies required
- **Generic Session Management**: Use `withSession` for any session-based operations with automatic cleanup

## Requirements

- Chrome 138+ or Edge 138+ with AI features enabled
- The browser must have the AI Language Model API available

### Enabling Chromium AI

1. Open Chrome and navigate to `chrome://flags`
2. Search for "Prompt API for Gemini Nano"
3. Enable the flag and restart Chrome
4. Navigate to `chrome://components`
5. Find "Optimization Guide On Device Model" and click "Check for update"

## Installation

```bash
npm install simple-chromium-ai
```

Or using pnpm:

```bash
pnpm add simple-chromium-ai
```

The SDK includes TypeScript types from `@types/dom-chromium-ai` as a dependency, so you get full type support out of the box.

## Quick Start

```javascript
import ChromiumAI from 'simple-chromium-ai';

// Default API (throws errors)
const ai = await ChromiumAI.initialize("You are a helpful assistant");
const response = await ChromiumAI.prompt(ai, "Write a haiku about coding");
console.log(response);

// Safe API (returns Results)
const result = await ChromiumAI.initializeSafe("You are a helpful assistant");
if (result.isOk()) {
  const response = await ChromiumAI.promptSafe(result.value, "Write a haiku about coding");
}
```

## Type-Safe Design

This SDK uses TypeScript's type system to ensure proper initialization. You cannot use any AI functions without first initializing and obtaining a `ChromiumAIInstance` object:

```typescript
// ❌ This won't compile - prompt requires an AI instance
const response = await ChromiumAI.prompt("Hello"); // Type error!

// ✅ Proper usage - initialize first
const ai = await ChromiumAI.initialize();
const response = await ChromiumAI.prompt(ai, "Hello");
```

## API Reference

All functions have two versions:
- **Default API**: Throws errors for simpler code
- **Safe API**: Returns `Result` types for better error handling

### initialize / initializeSafe

Initializes Chromium AI and returns an instance object that must be used with all other functions.

```typescript
// Default API (throws errors)
ChromiumAI.initialize(
  systemPrompt?: string,
  onDownloadProgress?: (progress: number) => void
): Promise<ChromiumAIInstance>

// Safe API (returns Result)
ChromiumAI.initializeSafe(
  systemPrompt?: string,
  onDownloadProgress?: (progress: number) => void
): ResultAsync<ChromiumAIInstance, Error>
```

**Parameters:**
- `systemPrompt`: Optional system prompt for all sessions created from this instance
- `onDownloadProgress`: Optional callback for model download progress (0-100)

**Examples:**
```javascript
// Basic initialization
const ai = await ChromiumAI.initialize("You are a helpful assistant");

// With progress tracking
const ai = await ChromiumAI.initialize(
  "You are a helpful assistant",
  (progress) => console.log(`Downloading: ${progress}%`)
);
```

### prompt / promptSafe

Performs a single prompt using the initialized Chromium AI instance.

```typescript
// Default API (throws errors)
ChromiumAI.prompt(
  instance: ChromiumAIInstance,
  prompt: string,
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions,
  sessionOptions?: LanguageModelCreateOptions
): Promise<string>

// Safe API (returns Result)
ChromiumAI.promptSafe(
  instance: ChromiumAIInstance,
  prompt: string,
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions,
  sessionOptions?: LanguageModelCreateOptions
): ResultAsync<string, Error>
```

**Key Parameters:**
- `instance`: The initialized Chromium AI instance
- `prompt`: The user's prompt text
- `timeout`: Optional timeout in milliseconds
- `promptOptions`: Options for the prompt (signal, etc)
- `sessionOptions`: Additional session options

**Examples:**
```javascript
// Basic usage
const response = await ChromiumAI.prompt(ai, "Explain quantum computing");

// With timeout
const response = await ChromiumAI.prompt(
  ai,
  "Write a long story",
  5000 // 5 second timeout
);
```

### createSession / createSessionSafe

Creates a reusable AI session for multiple prompts with context retention.

```typescript
// Default API (throws errors)
ChromiumAI.createSession(
  instance: ChromiumAIInstance,
  options?: LanguageModelCreateOptions
): Promise<LanguageModel>

// Safe API (returns Result)
ChromiumAI.createSessionSafe(
  instance: ChromiumAIInstance,
  options?: LanguageModelCreateOptions
): ResultAsync<LanguageModel, Error>
```

**Examples:**
```javascript
const session = await ChromiumAI.createSession(ai);
const response1 = await session.prompt("Hello!");
const response2 = await session.prompt("How are you?");
// The session remembers context between prompts
session.destroy();
```

### withSession / withSessionSafe

Executes a callback with a temporary session, ensuring proper cleanup.

```typescript
// Default API (throws errors)
ChromiumAI.withSession<T>(
  instance: ChromiumAIInstance,
  callback: (session: LanguageModel) => Promise<T>,
  options?: LanguageModelCreateOptions
): Promise<T>

// Safe API (returns Result)
ChromiumAI.withSessionSafe<T>(
  instance: ChromiumAIInstance,
  callback: (session: LanguageModel) => Promise<T>,
  options?: LanguageModelCreateOptions
): ResultAsync<T, Error>
```

**Examples:**
```javascript
// Count tokens
const tokenCount = await ChromiumAI.withSession(ai, async (session) => {
  return await session.measureInputUsage("Hello world");
});

// Get session quotas
const info = await ChromiumAI.withSession(ai, async (session) => {
  return {
    inputQuota: session.inputQuota,
    outputQuota: session.outputQuota
  };
});
```


## Working with Result Types

The Safe API uses [neverthrow](https://github.com/supermacro/neverthrow) Result types for better error handling in TypeScript:

```typescript
import ChromiumAI, { ResultAsync } from 'simple-chromium-ai';

// Check results explicitly
const result = await ChromiumAI.initializeSafe();
if (result.isOk()) {
  const ai = result.value;
  const response = await ChromiumAI.promptSafe(ai, "Hello");
}

// Combine multiple operations
const results = await ResultAsync.combine([
  ChromiumAI.promptSafe(ai, "Question 1"),
  ChromiumAI.promptSafe(ai, "Question 2")
]);
```

### checkTokenUsage / checkTokenUsageSafe

Checks token usage for a prompt without sending it.

```typescript
// Default API (throws errors)
ChromiumAI.checkTokenUsage(
  instance: ChromiumAIInstance,
  prompt: string,
  sessionOptions?: LanguageModelCreateOptions
): Promise<TokenUsageInfo>

// Safe API (returns Result)
ChromiumAI.checkTokenUsageSafe(
  instance: ChromiumAIInstance,
  prompt: string,
  sessionOptions?: LanguageModelCreateOptions
): ResultAsync<TokenUsageInfo, Error>
```

**Returns TokenUsageInfo:**
```typescript
interface TokenUsageInfo {
  promptTokens: number;    // Tokens in the prompt
  maxTokens: number;       // Total context window size
  tokensSoFar: number;     // Tokens already used in session
  tokensAvailable: number; // Remaining tokens available
  willFit: boolean;        // Whether prompt fits in remaining space
}
```

**Examples:**
```javascript
// Check if prompt will fit
const usage = await ChromiumAI.checkTokenUsage(ai, "Long prompt...");
if (usage.willFit) {
  const response = await ChromiumAI.prompt(ai, "Long prompt...");
} else {
  console.log(`Need ${usage.promptTokens} tokens, only ${usage.tokensAvailable} available`);
}
```

## Common Use Cases

### Chat Application

```javascript
const ai = await ChromiumAI.initialize("You are a friendly AI assistant");
const session = await ChromiumAI.createSession(ai);

while (true) {
  const userInput = prompt("You: ");
  if (!userInput) break;
  
  const response = await session.prompt(userInput);
  console.log("AI:", response);
}

session.destroy();
```

### Content Generation with Timeout

```javascript
const ai = await ChromiumAI.initialize("You are a creative writer");

for (const topic of ["space", "ocean", "technology"]) {
  const story = await ChromiumAI.prompt(
    ai,
    `Write a micro-story about ${topic}`,
    3000 // 3-second timeout
  );
  console.log(`${topic}: ${story}`);
}
```

### Token Counting

```javascript
// Check token usage
const usage = await ChromiumAI.checkTokenUsage(ai, "Very long text...");
console.log(`Tokens: ${usage.promptTokens}/${usage.maxTokens}`);
console.log(`Available: ${usage.tokensAvailable}`);
console.log(`Will fit: ${usage.willFit}`);

// Check before prompting
const usage = await ChromiumAI.checkTokenUsage(ai, longPrompt);
if (usage.willFit) {
  const response = await ChromiumAI.prompt(ai, longPrompt);
} else {
  console.log(`Prompt too long: needs ${usage.promptTokens} tokens`);
}
```

### Error Handling

```javascript
// Basic error handling
try {
  const ai = await ChromiumAI.initialize();
  const response = await ChromiumAI.prompt(ai, "Hello!");
} catch (error) {
  if (error.message.includes("not available")) {
    console.log("Enable Chromium AI in chrome://flags");
  }
}

// Check tokens first, then handle accordingly
const usage = await ChromiumAI.checkTokenUsage(ai, "Very long prompt...");
if (!usage.willFit) {
  // Use a shorter prompt instead
  const response = await ChromiumAI.prompt(ai, "Summarize briefly");
} else {
  const response = await ChromiumAI.prompt(ai, "Very long prompt...", 5000);
}
```

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 138+ | Requires flags enabled |
| Edge | 138+ | Requires flags enabled |
| Other browsers | Not supported | Chromium AI API not available |

## Troubleshooting

### "Chromium AI API is not available"

1. Ensure you're using Chrome/Edge 138 or later
2. Enable the "Prompt API for Gemini Nano" flag in chrome://flags
3. Check for updates in chrome://components for "Optimization Guide On Device Model"
4. Restart your browser after making changes

### "AI model download failed"

1. Check your internet connection
2. Ensure you have enough disk space
3. Try disabling any ad blockers or privacy extensions temporarily
4. Check Chrome's console for more detailed error messages

### Type Errors

The SDK is designed to prevent common mistakes through TypeScript:

```typescript
// ❌ Common mistakes prevented by types
await ChromiumAI.prompt("Hello"); // Error: Missing AI instance
await ChromiumAI.createSession(); // Error: Missing AI instance

// ✅ Correct usage enforced by types
const ai = await ChromiumAI.initialize();
await ChromiumAI.prompt(ai, "Hello");
await ChromiumAI.createSession(ai);
```

## License

MIT