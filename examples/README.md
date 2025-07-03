# Chrome AI SDK Examples

This directory contains practical examples demonstrating how to use the Simple Chromium AI SDK in various real-world scenarios.

## Running the Examples

1. First, build the SDK:
   ```bash
   npm run build
   ```

2. Serve the examples using a local web server. You can use any static file server, for example:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (install http-server globally first)
   npm install -g http-server
   http-server -p 8000
   ```

3. Open your browser (Chrome 127+ or Edge 127+) and navigate to:
   ```
   http://localhost:8000/examples/
   ```

## Available Examples

### 1. Basic Usage (`basic-usage.html`)
Demonstrates the fundamental features of the SDK:
- Simple one-shot prompts
- Prompts with timeouts
- Session-based conversations
- Download progress tracking

Perfect for getting started and understanding the core API.

### 2. Text Processing (`text-processing.html`)
Shows practical text processing capabilities:
- Text summarization with adjustable length
- Sentiment analysis
- Language translation
- Grammar and style correction
- Keyword extraction

Ideal for content management and text analysis applications.

### 3. Chat Interface (`chat-interface.html`)
A full-featured chat application demonstrating:
- Real-time conversational AI
- Multiple AI personas (assistant, creative writer, technical expert, etc.)
- Message history management
- Chat export functionality
- Typing indicators and proper UX

Great example for building conversational interfaces.

### 4. Code Assistant (`code-assistant.html`)
An AI-powered code helper that can:
- Explain code in multiple programming languages
- Improve and refactor code
- Find bugs and security issues
- Add comprehensive comments
- Convert between languages (JS ↔ TS)
- Generate unit tests
- Optimize performance
- Generate documentation

Perfect for developer tools and IDE integrations.

## Key Concepts Demonstrated

### Error Handling
All examples show proper error handling:
```javascript
const ai = await ChromeAI.initialize();
if (ai) {
  const response = await ChromeAI.singlePrompt(ai, "Hello!");
  if (response) {
    // Handle success
  } else {
    // Handle failure
  }
} else {
  // Handle AI unavailable
}
```

### Session Management
Examples demonstrate proper session lifecycle:
```javascript
const ai = await ChromeAI.initialize();
if (ai) {
  const session = await ChromeAI.createSession(ai);
  if (session) {
    try {
      // Use session for multiple prompts
      const response1 = await session.prompt("First message");
      const response2 = await session.prompt("Second message");
    } finally {
      // Always clean up
      session.destroy();
    }
  }
}
```

### Custom Parameters
Examples show how to customize AI behavior:
```javascript
const ai = await ChromeAI.initialize("You are a creative writer");
if (ai) {
  const response = await ChromeAI.singlePrompt(
    ai,
    "Generate creative content",
    undefined,
    undefined,
    {
      temperature: 0.8,  // Higher for creativity
      topK: 40
    }
  );
}
```

## Browser Requirements

All examples require:
- Chrome 127+ or Edge 127+
- Chrome AI flags enabled (see main README for setup instructions)
- AI model downloaded (examples will trigger download if needed)

## Tips for Building Your Own Applications

1. **Start Simple**: Begin with `singlePrompt()` for basic use cases
2. **Use Sessions for Context**: Create sessions when you need conversation history
3. **Handle Failures Gracefully**: Always check for null responses
4. **Provide Feedback**: Show loading states and progress indicators
5. **Clean Up Resources**: Always destroy sessions when done
6. **Customize Behavior**: Use temperature and system prompts to control output

## Common Patterns

### Loading States
```javascript
const ai = await ChromeAI.initialize();
if (ai) {
  button.disabled = true;
  output.textContent = "AI is thinking...";
  
  const response = await ChromeAI.singlePrompt(ai, prompt);
  
  button.disabled = false;
  output.textContent = response || "Failed to get response";
} else {
  output.textContent = "AI unavailable";
}
```

### Timeout Handling
```javascript
const ai = await ChromeAI.initialize();
if (ai) {
  const response = await ChromeAI.singlePrompt(
    ai,
    prompt,
    5000  // 5 second timeout
  );
  
  if (!response) {
    console.log("Request timed out or failed");
  }
}
```

### Progress Tracking
```javascript
const ai = await ChromeAI.initialize(
  "You are a helpful assistant",
  (progress) => {
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Downloading: ${progress}%`;
  }
);
```