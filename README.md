# Simple Chromium AI

A lightweight TypeScript wrapper for Chrome's built-in AI APIs (Prompt, Translator, Language Detector, and Summarizer) that trades flexibility for simplicity and type safety.

## Why Use This?

Chrome's native AI APIs are powerful but require careful initialization and session management. This wrapper provides:

- **Automatic error handling** - Graceful failures with clear messages
- **Simplified API** - Common tasks in one function call
- **Safe API variant** - Result types instead of throwing

For advanced use cases requiring more control, use the [original Chrome AI APIs](https://developer.chrome.com/docs/ai/built-in-apis) directly.

## Quick Start

```bash
npm install simple-chromium-ai
```

```javascript
import { translate, detect, summarize } from 'simple-chromium-ai';

// These just work — no initialization needed
const translated = await translate("Hello", { sourceLanguage: "en", targetLanguage: "es" });
const detections = await detect("Bonjour le monde");
const summary = await summarize("Long article...", { type: "tldr" });
```

The Prompt API requires initialization since it manages session state:

```javascript
import ChromiumAI from 'simple-chromium-ai';

const ai = await ChromiumAI.initialize("You are a helpful assistant");
const response = await ChromiumAI.prompt(ai, "Write a haiku");
```

## Prerequisites

- Chrome 138+ for Translator, Language Detector, and Summarizer APIs
- Chrome 148+ for Prompt API
- See [hardware requirements](https://developer.chrome.com/docs/ai/get-started#hardware) — models are downloaded on-device (~4GB)

## Prompt API

The Prompt API requires initializing an instance with a system prompt. The instance is then passed to all subsequent calls.

### Initialize
```typescript
const ai = await ChromiumAI.initialize(
  systemPrompt?: string,
  expectedOutputLanguages?: string[] // defaults to ["en"]
);
```

The `expectedOutputLanguages` parameter tells Chrome what language(s) the model should output.

### Prompt
```typescript
const response = await ChromiumAI.prompt(
  ai,
  "Your prompt",
  timeout?: number,
  promptOptions?: LanguageModelPromptOptions, // signal, responseConstraint, etc.
  sessionOptions?: LanguageModelCreateOptions
);
```

### Session Management
```typescript
// Create reusable session (maintains conversation context)
const session = await ChromiumAI.createSession(ai);
const response1 = await session.prompt("Hello");
const response2 = await session.prompt("Follow up");
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
if (!usage.willFit) {
  // Prompt is too long for the context window
}
```

### Structured Output
```javascript
const response = await ChromiumAI.prompt(
  ai,
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

const response = await ChromiumAI.prompt(
  ai,
  "Write a detailed analysis...",
  undefined,
  { signal: controller.signal }
);

// Cancel from elsewhere:
controller.abort();
```

## Translator API

```typescript
import { translate } from 'simple-chromium-ai';

const translated = await translate("Hello", {
  sourceLanguage: "en",
  targetLanguage: "es",
});
```

For multiple translations with the same language pair, create a reusable instance:

```typescript
import { Translator } from 'simple-chromium-ai';

const translator = await Translator.create({
  sourceLanguage: "en",
  targetLanguage: "ja",
});
const result1 = await translator.translate("Hello");
const result2 = await translator.translate("Goodbye");
translator.destroy();
```

## Language Detector API

```typescript
import { detect } from 'simple-chromium-ai';

const detections = await detect("Bonjour le monde");
// Returns: [{ detectedLanguage: "fr", confidence: 0.95 }, ...]
```

## Summarizer API

```typescript
import { summarize } from 'simple-chromium-ai';

const summary = await summarize("Long article text...", {
  type: "tldr",       // "tldr" | "key-points" | "teaser" | "headline"
  length: "medium",   // "short" | "medium" | "long"
});
```

For multiple summarizations with the same options, create a reusable instance:

```typescript
import { Summarizer } from 'simple-chromium-ai';

const summarizer = await Summarizer.create({ type: "key-points", length: "short" });
const summary1 = await summarizer.summarize("First article...");
const summary2 = await summarizer.summarize("Second article...");
summarizer.destroy();
```

## Safe API

Every function has a Safe variant that returns Result types instead of throwing:

```typescript
import { safeTranslate, safeDetect, safeSummarize } from 'simple-chromium-ai';

const result = await safeTranslate("Hello", { sourceLanguage: "en", targetLanguage: "es" });
result.match(
  (text) => console.log(text),
  (error) => console.error(error.message)
);
```

The Prompt API safe variants are available via the default export:

```typescript
import ChromiumAI from 'simple-chromium-ai';

const result = await ChromiumAI.Safe.initialize("You are helpful");
result.match(
  async (ai) => {
    const response = await ChromiumAI.Safe.prompt(ai, "Hello");
    response.match(
      (value) => console.log(value),
      (error) => console.error(error.message)
    );
  },
  (error) => console.error(error.message)
);
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

   The library also triggers downloads automatically when you call any API function.

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
