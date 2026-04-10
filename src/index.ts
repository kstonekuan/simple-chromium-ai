/// <reference types="@types/dom-chromium-ai" />

import { ResultAsync } from "neverthrow";
import { initDetector as _initDetector } from "./detector";
import { initDetector as _safeInitDetector } from "./detector-safe";
import { initLanguageModel as _safeInitLanguageModel } from "./safe";
import { initSummarizer as _initSummarizer } from "./summarizer";
import { initSummarizer as _safeInitSummarizer } from "./summarizer-safe";
import { initTranslator as _initTranslator } from "./translator";
import { initTranslator as _safeInitTranslator } from "./translator-safe";
import type { LanguageModelInitOptions, LanguageModelInstance } from "./types";
import { okOrThrow } from "./utils";

// Re-export Result types for users who want them
export { err, ok, Result, ResultAsync } from "neverthrow";

// Re-export types
export type {
	DetectorInstance,
	DetectResult,
	LanguageModelInitOptions,
	LanguageModelInstance,
	PromptResult,
	SafeDetectorInstance,
	SafeLanguageModelInstance,
	SafeSummarizerInstance,
	SafeTranslatorInstance,
	SummarizeResult,
	SummarizerInstance,
	TokenUsageInfo,
	TranslateResult,
	TranslatorInstance,
} from "./types";

// --- Throwing init exports ---

/**
 * Initializes the LanguageModel API. Triggers model download and returns an instance
 * with `.prompt()`, `.createSession()`, `.withSession()`, `.checkTokenUsage()` methods.
 *
 * Init is only about capability (can the model run?), not behavior (what should it say?).
 * Pass system prompts via `createSession()` or the `sessionOptions` parameter on `.prompt()`.
 *
 * @param options Optional init options (expectedInputs, expectedOutputs, monitor, signal)
 * @throws {Error} If initialization fails
 *
 * @example
 * const ai = await initLanguageModel();
 * const session = await ai.createSession({
 *   initialPrompts: [{ role: "system", content: "You are a helpful assistant" }],
 * });
 */
export async function initLanguageModel(
	options?: LanguageModelInitOptions,
): Promise<LanguageModelInstance> {
	const safeResult = await _safeInitLanguageModel(options);
	const safe = okOrThrow(safeResult);

	return {
		prompt: async (text, timeout, promptOptions, sessionOptions) => {
			const result = await safe.prompt(
				text,
				timeout,
				promptOptions,
				sessionOptions,
			);
			return okOrThrow(result);
		},
		createSession: async (options) => {
			const result = await safe.createSession(options);
			return okOrThrow(result);
		},
		withSession: async (callback, options) => {
			const result = await safe.withSession(
				(session) =>
					ResultAsync.fromPromise(callback(session), (error) =>
						error instanceof Error ? error : new Error(String(error)),
					),
				options,
			);
			return okOrThrow(result);
		},
		checkTokenUsage: async (promptText, sessionOptions) => {
			const result = await safe.checkTokenUsage(promptText, sessionOptions);
			return okOrThrow(result);
		},
	};
}

export { initDetector } from "./detector";
export { initSummarizer } from "./summarizer";
export { initTranslator } from "./translator";

// --- Safe init exports ---

export { initDetector as safeInitDetector } from "./detector-safe";
export { initLanguageModel as safeInitLanguageModel } from "./safe";
export { initSummarizer as safeInitSummarizer } from "./summarizer-safe";
export { initTranslator as safeInitTranslator } from "./translator-safe";

/**
 * ChromiumAI namespace containing all SDK init functions.
 *
 * Every API requires initialization before use. Init triggers model download
 * and returns an object with the API methods bound to it.
 *
 * @example
 * import ChromiumAI from 'simple-chromium-ai';
 *
 * // Default API (throws errors)
 * const ai = await ChromiumAI.initLanguageModel();
 * const session = await ai.createSession({
 *   initialPrompts: [{ role: "system", content: "You are helpful" }],
 * });
 *
 * const translator = await ChromiumAI.initTranslator({ sourceLanguage: "en", targetLanguage: "es" });
 * const translated = await translator.translate("Hello");
 *
 * // Safe API (returns Results)
 * const result = await ChromiumAI.Safe.initLanguageModel();
 * result.match(
 *   (ai) => ai.prompt("Hello!"),
 *   (error) => console.error(error.message)
 * );
 */
const ChromiumAI = {
	// Safe API namespace (returns ResultAsync)
	Safe: {
		initLanguageModel: _safeInitLanguageModel,
		initTranslator: _safeInitTranslator,
		initDetector: _safeInitDetector,
		initSummarizer: _safeInitSummarizer,
	},

	// Default API (throws errors)
	initLanguageModel,
	initTranslator: _initTranslator,
	initDetector: _initDetector,
	initSummarizer: _initSummarizer,
};

// Default export for convenience
export default ChromiumAI;
