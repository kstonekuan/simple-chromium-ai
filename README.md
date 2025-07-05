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

## Requirements

- Chrome 127+ or Edge 127+ with AI features enabled
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

### Default API (Throws Errors)

```javascript
import ChromiumAI from 'simple-chromium-ai';

try {
  // Initialize Chromium AI with a system prompt
  const ai = await ChromiumAI.initialize("You are a helpful assistant");
  
  // Use the AI instance for a single prompt
  const response = await ChromiumAI.prompt(ai, "Write a haiku about coding");
  console.log(response);
} catch (error) {
  console.error("Chromium AI error:", error.message);
}
```

### Safe API (Returns Results)

```javascript
import ChromiumAI from 'simple-chromium-ai';

// Using Result types for better error handling
await ChromiumAI.initializeSafe("You are a helpful assistant")
  .andThen(ai => ChromiumAI.promptSafe(ai, "Write a haiku about coding"))
  .match(
    response => console.log(response),
    error => console.error("Error:", error.message)
  );
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
const ai = await ChromiumAI.initialize();

// With system prompt and progress tracking
const ai = await ChromiumAI.initialize(
  "You are a helpful assistant",
  (progress) => console.log(`Downloading: ${progress}%`)
);

// Safe version with error handling
await ChromiumAI.initializeSafe("You are helpful")
  .match(
    ai => console.log("Initialized!"),
    error => console.error("Failed:", error.message)
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
  sessionOptions?: LanguageModelCreateOptions,
  checkInputLimitBeforeSending?: boolean,
  onInputTooLong?: (err: Error, context: InputTooLongContext) => Promise<string>,
  onTimeout?: (err: Error, context: TimeoutContext) => Promise<string>
): Promise<string>

// Safe API (returns Result)
ChromiumAI.promptSafe(
  instance: ChromiumAIInstance,
  prompt: string,
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions,
  sessionOptions?: LanguageModelCreateOptions,
  checkInputLimitBeforeSending?: boolean,
  onInputTooLong?: (err: Error, context: InputTooLongContext) => PromptResult,
  onTimeout?: (err: Error, context: TimeoutContext) => PromptResult
): ResultAsync<string, Error>
```

**Key Parameters:**
- `instance`: The initialized Chromium AI instance
- `prompt`: The user's prompt text
- `timeout`: Optional timeout in milliseconds
- `checkInputLimitBeforeSending`: Pre-check token limits before sending
- `onInputTooLong`: Recovery callback when prompt exceeds limits
- `onTimeout`: Recovery callback when request times out

**Examples:**
```javascript
// Basic usage
const response = await ChromiumAI.prompt(ai, "Explain quantum computing");

// With timeout and error recovery
const response = await ChromiumAI.prompt(
  ai,
  "Write a long story",
  5000, // 5 second timeout
  undefined,
  undefined,
  true, // check token limits
  async (error, context) => {
    // Called if prompt is too long
    console.log(`Too long: ${context.tokenCount} tokens`);
    return "Write a short story instead";
  },
  async (error, context) => {
    // Called on timeout
    console.log(`Timed out after ${context.timeoutMs}ms`);
    throw error; // Propagate the timeout error
  }
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
try {
  const response1 = await session.prompt("Hello!");
  const response2 = await session.prompt("How are you?");
  // The session remembers context between prompts
} finally {
  session.destroy(); // Always clean up!
}
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
// Count tokens without managing session lifecycle
const tokenCount = await ChromiumAI.withSession(ai, async (session) => {
  return await session.measureInputUsage("Hello world");
});

// Get session information
const info = await ChromiumAI.withSession(ai, async (session) => {
  return {
    inputQuota: session.inputQuota,
    inputUsage: session.inputUsage,
    outputQuota: session.outputQuota,
    outputUsage: session.outputUsage
  };
});

// Safe version with error handling
await ChromiumAI.withSessionSafe(ai, async (session) => {
  const tokens = await session.measureInputUsage(prompt);
  if (tokens > session.inputQuota) {
    throw new Error("Prompt too long");
  }
  return await session.prompt(prompt);
}).match(
  response => console.log(response),
  error => console.error("Failed:", error.message)
);
```


## Working with Result Types

The Safe API uses [neverthrow](https://github.com/supermacro/neverthrow) Result types for better error handling in TypeScript:

```typescript
import ChromiumAI, { Result, ResultAsync } from 'simple-chromium-ai';

// Chain operations with confidence
await ChromiumAI.initializeSafe()
  .andThen(ai => ChromiumAI.promptSafe(ai, "Hello"))
  .map(response => response.toUpperCase())
  .match(
    success => console.log("Success:", success),
    error => console.error("Error:", error.message)
  );

// Check results explicitly
const result = await ChromiumAI.initializeSafe();
if (result.isOk()) {
  const ai = result.value;
  // Use ai...
} else {
  const error = result.error;
  console.error(`Failed: ${error.message}`);
}

// Combine multiple operations
const results = await ResultAsync.combine([
  ChromiumAI.promptSafe(ai, "Question 1"),
  ChromiumAI.promptSafe(ai, "Question 2"),
  ChromiumAI.promptSafe(ai, "Question 3")
]);

if (results.isOk()) {
  const [answer1, answer2, answer3] = results.value;
  // Process all answers...
}
```

## Common Use Cases

### Chat Application

```javascript
import ChromiumAI from 'simple-chromium-ai';

try {
  const ai = await ChromiumAI.initialize("You are a friendly AI assistant");
  const session = await ChromiumAI.createSession(ai);
  
  try {
    while (true) {
      const userInput = prompt("You: ");
      if (!userInput) break;
      
      const response = await session.prompt(userInput);
      console.log("AI:", response);
    }
  } finally {
    session.destroy();
  }
} catch (error) {
  alert(`Chromium AI error: ${error.message}`);
}
```

### Content Generation with Timeout

```javascript
const ai = await ChromiumAI.initialize(
  "You are a creative writer. Keep responses under 100 words."
);

const topics = ["space", "ocean", "technology"];

for (const topic of topics) {
  try {
    const story = await ChromiumAI.prompt(
      ai,
      `Write a micro-story about ${topic}`,
      3000 // 3-second timeout
    );
    console.log(`Story about ${topic}:\n${story}\n`);
  } catch (error) {
    if (error.message.includes("timeout")) {
      console.log(`Story generation timed out for ${topic}`);
    } else {
      console.log(`Failed to generate story about ${topic}: ${error.message}`);
    }
  }
}
```

### Token Counting

```javascript
// Check token count before sending a prompt
const longPrompt = "Very long text...";

const tokenCount = await ChromiumAI.withSession(ai, async (session) => {
  return await session.measureInputUsage(longPrompt);
});

console.log(`Prompt uses ${tokenCount} tokens`);

// Or use withSessionSafe for error handling
await ChromiumAI.withSessionSafe(ai, async (session) => {
  const tokens = await session.measureInputUsage(longPrompt);
  const available = session.inputQuota - session.inputUsage;
  
  if (tokens > available) {
    throw new Error(`Prompt too long: needs ${tokens}, only ${available} available`);
  }
  
  return await session.prompt(longPrompt);
}).match(
  response => console.log("Response:", response),
  error => console.error("Error:", error.message)
);
```

### Error Handling

```javascript
import ChromiumAI from 'simple-chromium-ai';

// Basic error handling
try {
  const ai = await ChromiumAI.initialize();
  const response = await ChromiumAI.prompt(ai, "Hello!");
  console.log(response);
} catch (error) {
  console.error(`Error: ${error.message}`);
  
  // Check error message to determine the issue
  if (error.message.includes("not available")) {
    console.log("Chromium AI needs to be enabled. See setup instructions.");
  } else if (error.message.includes("exceeds available token limit")) {
    console.log("Prompt is too long. Try a shorter prompt.");
  } else if (error.message.includes("timeout")) {
    console.log("Request timed out. Try again or increase timeout.");
  }
}

// Advanced: Using recovery callbacks
const response = await ChromiumAI.prompt(
  ai,
  "Very long prompt that might exceed limits...",
  5000, // 5 second timeout
  undefined,
  undefined,
  true, // Check input limits
  async (error, context) => {
    // onInputTooLong callback
    console.log(`Prompt too long: ${context.tokenCount} tokens`);
    console.log(`Max allowed: ${context.maxTokens}`);
    
    // Return a shorter prompt
    const shortened = context.originalPrompt.slice(0, 1000) + "...";
    console.log("Using shorter prompt");
    return shortened;
  },
  async (error, context) => {
    // onTimeout callback
    console.log(`Timeout after ${context.timeoutMs}ms`);
    // Re-throw to propagate the error
    throw error;
  }
);
```

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 127+ | Requires flags enabled |
| Edge | 127+ | Requires flags enabled |
| Other browsers | Not supported | Chromium AI API not available |

## Troubleshooting

### "Chromium AI API is not available"

1. Ensure you're using Chrome/Edge 127 or later
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