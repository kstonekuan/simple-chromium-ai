/// <reference types="@types/dom-chromium-ai" />

import * as DetectorApi from "./detector";
import * as DetectorSafe from "./detector-safe";
import * as PromptApi from "./prompt";
import * as PromptSafe from "./prompt-safe";
import * as SummarizerApi from "./summarizer";
import * as SummarizerSafe from "./summarizer-safe";
import * as TranslatorApi from "./translator";
import * as TranslatorSafe from "./translator-safe";

// Re-export Result types for users who want them
export { err, ok, Result, ResultAsync } from "neverthrow";
export { detect } from "./detector";
export { detect as safeDetect } from "./detector-safe";
// Flat convenience exports (one-shot functions)
export { prompt } from "./prompt";
// Safe flat exports
export { prompt as safePrompt } from "./prompt-safe";
export { summarize } from "./summarizer";
export { summarize as safeSummarize } from "./summarizer-safe";
export { translate } from "./translator";
export { translate as safeTranslate } from "./translator-safe";

// Re-export types for users
export type {
	DetectResult,
	PromptCreateOptions,
	PromptInstance,
	PromptOptions,
	PromptResult,
	SafePromptInstance,
	SummarizeResult,
	TokenUsageInfo,
	TranslateResult,
} from "./types";

// Namespace exports for advanced use (.create(), .availability())
export {
	DetectorApi as Detector,
	PromptApi as Prompt,
	SummarizerApi as Summarizer,
	TranslatorApi as Translator,
};

/**
 * ChromiumAI namespace containing all SDK functions for convenient access
 * @example
 * import ChromiumAI from 'simple-chromium-ai';
 *
 * // Prompt API
 * const ai = await ChromiumAI.Prompt.create({ systemPrompt: "You are helpful" });
 * const response = await ai.prompt("Hello!");
 *
 * // Safe Prompt API
 * const result = await ChromiumAI.Safe.Prompt.create({ systemPrompt: "You are helpful" });
 *
 * // Translator
 * const translated = await ChromiumAI.Translator.translate("Hello", { sourceLanguage: "en", targetLanguage: "es" });
 *
 * // Language Detector
 * const results = await ChromiumAI.Detector.detect("Bonjour le monde");
 *
 * // Summarizer
 * const summary = await ChromiumAI.Summarizer.summarize("Long text...", { type: "tldr" });
 */
const ChromiumAI = {
	// Safe API namespace
	Safe: {
		Prompt: PromptSafe,
		Translator: TranslatorSafe,
		Detector: DetectorSafe,
		Summarizer: SummarizerSafe,
	},

	// API namespaces
	Prompt: PromptApi,
	Translator: TranslatorApi,
	Detector: DetectorApi,
	Summarizer: SummarizerApi,
};

// Default export for convenience
export default ChromiumAI;
