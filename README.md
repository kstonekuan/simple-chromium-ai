# Simple Chromium AI

A lightweight TypeScript wrapper for Chrome's built-in AI APIs (Prompt, Translator, Language Detector, and Summarizer) that trades flexibility for simplicity and type safety.

## Why Use This?

Chrome's native AI APIs are powerful but require careful initialization and session management. This wrapper provides:

- **Parse, don't validate** - Initialization ensures the model is downloaded and returns an object you _must_ use, making it impossible to skip the readiness check
- **Automatic error handling** - Graceful failures with clear messages
- **Simplified API** - Common tasks in one method call
- **Safe API variant** - Result types instead of throwing

For advanced use cases requiring more control, use the [original Chrome AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) directly.

## Quick Start

```bash
npm install simple-chromium-ai
```

Every API requires initialization before use. Init triggers the model download and returns an object with the API methods:

```javascript
import { initLanguageModel, initTranslator, initDetector, initSummarizer } from 'simple-chromium-ai';

const ai = await initLanguageModel("You are a helpful assistant");
const response = await ai.prompt("Write a haiku");

const translator = await initTranslator({ sourceLanguage: "en", targetLanguage: "es" });
const translated = await translator.translate("Hello");

const detector = await initDetector();
const detections = await detector.detect("Bonjour le monde");

const summarizer = await initSummarizer({ type: "tldr" });
const summary = await summarizer.summarize("Long article...");
```

## Prerequisites

- Chrome 138+ for Translator, Language Detector, and Summarizer APIs
- Chrome 148+ for Prompt API
- See [hardware requirements](https://developer.chrome.com/docs/ai/get-started#hardware) — models are downloaded on-device (~4GB)

## Prompt API

### Initialize
```typescript
const ai = await initLanguageModel(
  systemPrompt?: string,
  expectedInputLanguages?: string[], // defaults to ["en"]
  expectedOutputLanguages?: string[] // defaults to ["en"]
);
```

The `expectedInputLanguages` parameter tells Chrome what language(s) the user prompts will be in. The `expectedOutputLanguages` parameter tells Chrome what language(s) the model should output.

### Prompt
```typescript
const response = await ai.prompt(
  "Your prompt",
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions, // signal, responseConstraint, etc.
  sessionOptions?: LanguageModelCreateOptions
);
```

### Session Management
```typescript
// Create reusable session (maintains conversation context)
const session = await ai.createSession();
const response1 = await session.prompt("Hello");
const response2 = await session.prompt("Follow up");
session.destroy();

// Override the instance's system prompt for this session
const customSession = await ai.createSession({
  initialPrompts: [{ role: 'system', content: 'You are a pirate' }]
});

// Or use withSession for automatic cleanup
const result = await ai.withSession(async (session) => {
  return await session.prompt("Hello");
});
```

### Token Management
```typescript
const usage = await ai.checkTokenUsage("Long text...");
if (!usage.willFit) {
  // Prompt is too long for the context window
}
```

### Structured Output
```javascript
const response = await ai.prompt(
  "Analyze the sentiment: 'I love this!'",
  undefined,
  { responseConstraint: {
    type: "object",
    properties: {
      sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
      confidence: { type: "number" }
    },
    required: ["sentiment", "confidence"]
  }}
);
const result = JSON.parse(response);
```

### Cancellation
```javascript
const controller = new AbortController();

const response = await ai.prompt(
  "Write a detailed analysis...",
  undefined,
  { signal: controller.signal }
);

// Cancel from elsewhere:
controller.abort();
```

## Translator API

```typescript
import { initTranslator } from 'simple-chromium-ai';

const translator = await initTranslator({
  sourceLanguage: "en",
  targetLanguage: "es",
});

// One-shot (creates and destroys native instance internally)
const translated = await translator.translate("Hello");

// Reusable session for multiple translations
const session = await translator.createSession();
const result1 = await session.translate("Hello");
const result2 = await session.translate("Goodbye");
session.destroy();
```

Each translator is locked to a specific language pair. Initialize a new one for different pairs.

## Language Detector API

```typescript
import { initDetector } from 'simple-chromium-ai';

const detector = await initDetector();
const detections = await detector.detect("Bonjour le monde");
// Returns: [{ detectedLanguage: "fr", confidence: 0.95 }, ...]

// Reusable session
const session = await detector.createSession();
const r1 = await session.detect("Hello");
const r2 = await session.detect("Hola");
session.destroy();
```

## Summarizer API

```typescript
import { initSummarizer } from 'simple-chromium-ai';

const summarizer = await initSummarizer({
  type: "tldr",       // "tldr" | "key-points" | "teaser" | "headline"
  length: "medium",   // "short" | "medium" | "long"
});

// One-shot
const summary = await summarizer.summarize("Long article text...");

// Reusable session
const session = await summarizer.createSession();
const summary1 = await session.summarize("First article...");
const summary2 = await session.summarize("Second article...");
session.destroy();
```

## Shared Models

The Prompt API and Summarizer API share the same underlying model (~4GB). Initializing either one triggers the same model download. The Translator and Language Detector APIs each have their own models.

## Safe API

Every init function has a Safe variant that returns Result types instead of throwing:

```typescript
import { safeInitTranslator, safeInitDetector, safeInitSummarizer } from 'simple-chromium-ai';

const result = await safeInitTranslator({ sourceLanguage: "en", targetLanguage: "es" });
result.match(
  (translator) => {
    // Methods also return ResultAsync
    translator.translate("Hello").match(
      (text) => console.log(text),
      (error) => console.error(error.message)
    );
  },
  (error) => console.error(error.message)
);
```

The Prompt API safe variant:

```typescript
import { safeInitLanguageModel } from 'simple-chromium-ai';

const result = await safeInitLanguageModel("You are helpful");
result.match(
  async (ai) => {
    const response = await ai.prompt("Hello");
    response.match(
      (value) => console.log(value),
      (error) => console.error(error.message)
    );
  },
  (error) => console.error(error.message)
);
```

Or use the default export namespace:

```typescript
import ChromiumAI from 'simple-chromium-ai';

const result = await ChromiumAI.Safe.initLanguageModel("You are helpful");
```

## Limitations

This wrapper prioritizes simplicity over flexibility. It does not expose:

- Streaming responses (`promptStreaming()`, `translateStreaming()`, `summarizeStreaming()`)
- Writer and Rewriter APIs
- Proofreader API

For these features, use the [native Chrome AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) directly.

## Demo Extension

A minimal Chrome extension demo is included in the `demo` folder.

![Chrome AI Demo Extension](images/chrome_ai_demo.jpg)

**[Available on the Chrome Web Store](https://chromewebstore.google.com/detail/fihhgimeakbpnioianlhlejlblefeegn)**

To run locally:
```bash
cd demo
npm install
npm run build
# Load the demo/dist folder as an unpacked extension in Chrome
```

## Troubleshooting

1. Navigate to `chrome://on-device-internals/` to check model status

2. Check availability in the DevTools console:
   ```javascript
   await LanguageModel.availability()
   // Returns: "available" | "downloadable" | "downloading" | "unavailable"
   ```

3. If `"downloadable"`, trigger the download:
   ```javascript
   await LanguageModel.create({
     monitor(m) {
       m.addEventListener('downloadprogress', (e) => {
         console.log(`Downloaded ${e.loaded * 100}%`);
       });
     },
   });
   ```

   The library also triggers downloads automatically during initialization.

## Resources

- [Chrome Built-in AI APIs Overview](https://developer.chrome.com/docs/ai/built-in-apis)
- [Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- [Translator API](https://developer.chrome.com/docs/ai/translator-api)
- [Language Detector API](https://developer.chrome.com/docs/ai/language-detection)
- [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
- [Structured Output](https://developer.chrome.com/docs/ai/structured-output-for-prompt-api)
- [W3C Prompt API Spec](https://github.com/webmachinelearning/prompt-api)

## License

MIT
