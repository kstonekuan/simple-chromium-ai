# Chrome AI Demo Extension

Minimal Chrome extension demonstrating Chrome's built-in AI API using the simple-chromium-ai package.

## Prerequisites

Before using this extension, you need to enable Chrome AI:

1. Use Chrome 138+ or supported Chromium browser
2. Enable "Prompt API for Gemini Nano" in `chrome://flags`
3. Update "Optimization Guide On Device Model" in `chrome://components` 
   - **Warning: This will download ~22GB**
   - Click "Check for update" next to "Optimization Guide On Device Model"
   - Wait for the download to complete (this may take a while)

## Setup

```bash
npm install
npm run build
```

## Installation

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder (created after running `npm run build`)

## Development

This extension uses CRXJS for hot-reload development:

```bash
npm run dev
```

Then load the `dist` folder in Chrome. Changes will hot-reload automatically.