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

### Enabling Chrome AI

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
import { initializeChromeAI, singlePrompt } from 'simple-chromium-ai';

// Initialize Chrome AI with a system prompt
const ai = await initializeChromeAI("You are a helpful assistant");

if (ai) {
  // Use the AI instance for a single prompt
  const response = await singlePrompt(ai, "Write a haiku about coding");
  console.log(response);
} else {
  console.error("Chrome AI is not available");
}
```

## Type-Safe Design

This SDK uses TypeScript's type system to ensure proper initialization. You cannot use any AI functions without first initializing and obtaining a `ChromeAIInstance` object:

```typescript
// ❌ This won't compile - singlePrompt requires an AI instance
const response = await singlePrompt("Hello"); // Type error!

// ✅ Proper usage - initialize first
const ai = await initializeChromeAI();
if (ai) {
  const response = await singlePrompt(ai, "Hello");
}
```

## API Reference

### initializeChromeAI

Initializes Chrome AI and returns an instance object that must be used with all other functions.

```typescript
initializeChromeAI(
  systemPrompt?: string,
  onDownloadProgress?: (progress: number) => void
): Promise<ChromeAIInstance | null>
```

#### Examples

```javascript
// Basic initialization
const ai = await initializeChromeAI();

// With system prompt for consistent behavior
const ai = await initializeChromeAI(
  "You are a helpful assistant that provides concise answers."
);

// With download progress monitoring
const ai = await initializeChromeAI(
  "You are a coding assistant",
  (progress) => console.log(`Downloading: ${progress}%`)
);
```

### singlePrompt

Performs a single prompt using the initialized Chrome AI instance.

```typescript
singlePrompt(
  instance: ChromeAIInstance,
  prompt: string,
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions,
  sessionOptions?: LanguageModelCreateOptions
): Promise<string | null>
```

#### Examples

```javascript
const ai = await initializeChromeAI("You are helpful and concise");
if (ai) {
  // Basic usage
  const response = await singlePrompt(ai, "Explain quantum computing");
  
  // With timeout (5 seconds)
  const response = await singlePrompt(ai, "Write a story", 5000);
  
  // With custom cancellation
  const controller = new AbortController();
  const response = await singlePrompt(
    ai,
    "Write a long story",
    undefined,
    { signal: controller.signal }
  );
  
  // With session options
  const response = await singlePrompt(
    ai,
    "Generate creative content",
    undefined,
    undefined,
    { temperature: 0.8, topK: 40 }
  );
  
  // With timeout and session options
  const response = await singlePrompt(
    ai,
    "Quick summary",
    3000,
    undefined,
    { temperature: 0.3 }
  );
  
  // With both timeout and manual cancellation (both will work)
  const controller = new AbortController();
  const response = await singlePrompt(
    ai,
    "Complex analysis",
    10000, // 10 second timeout
    { signal: controller.signal } // Can still manually abort
  );
  // Either timeout OR controller.abort() will cancel the request
}
```

### createSession

Creates a reusable AI session using the initialized Chrome AI instance.

```typescript
createSession(
  instance: ChromeAIInstance,
  options?: LanguageModelCreateOptions
): Promise<LanguageModel | null>
```

#### Examples

```javascript
const ai = await initializeChromeAI("You are a friendly chatbot");
if (ai) {
  const session = await createSession(ai);
  if (session) {
    try {
      const response1 = await session.prompt("Hello!");
      const response2 = await session.prompt("How are you?");
      // The session remembers context between prompts
    } finally {
      session.destroy(); // Always clean up!
    }
  }
}
```


## Common Use Cases

### Chat Application

```javascript
const ai = await initializeChromeAI("You are a friendly AI assistant");
if (!ai) {
  alert("Chrome AI is not available");
  return;
}

const session = await createSession(ai);
if (session) {
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
}
```

### Content Generation with Timeout

```javascript
const ai = await initializeChromeAI(
  "You are a creative writer. Keep responses under 100 words."
);

if (ai) {
  const topics = ["space", "ocean", "technology"];
  
  for (const topic of topics) {
    const story = await singlePrompt(
      ai,
      `Write a micro-story about ${topic}`,
      3000 // 3-second timeout
    );
    
    if (story) {
      console.log(`Story about ${topic}:\n${story}\n`);
    } else {
      console.log(`Failed to generate story about ${topic}`);
    }
  }
}
```

### Error Handling

```javascript
import { initializeChromeAI, singlePrompt, ChromeAIError } from 'simple-chromium-ai';

const ai = await initializeChromeAI();

if (!ai) {
  // Handle initialization failure
  console.error("Please enable Chrome AI features");
  return;
}

try {
  const response = await singlePrompt(ai, "Hello!");
  if (response) {
    console.log(response);
  } else {
    console.log("Failed to get response");
  }
} catch (error) {
  if (error instanceof ChromeAIError) {
    switch (error.code) {
      case "UNAVAILABLE":
        console.error("AI is not available");
        break;
      case "TIMEOUT":
        console.error("Request timed out");
        break;
      default:
        console.error("AI error:", error.message);
    }
  }
}
```

## Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 127+ | Requires flags enabled |
| Edge | 127+ | Requires flags enabled |
| Other browsers | Not supported | Chrome AI API not available |

## Troubleshooting

### "Chrome AI API is not available"

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
await singlePrompt("Hello"); // Error: Missing AI instance
await createSession(); // Error: Missing AI instance

// ✅ Correct usage enforced by types
const ai = await initializeChromeAI();
if (ai) {
  await singlePrompt(ai, "Hello");
  await createSession(ai);
}
```

## License

MIT