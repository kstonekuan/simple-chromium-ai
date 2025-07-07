/// <reference types="@types/dom-chromium-ai" />

import { type Result, ResultAsync } from "neverthrow";
import * as Safe from "./safe";
import type { ChromiumAIInstance, TokenUsageInfo } from "./types";

// Re-export Result types for users who want them
export { err, ok, Result, ResultAsync } from "neverthrow";

// Re-export types for users
export type { ChromiumAIInstance, PromptResult, TokenUsageInfo } from "./types";

function okOrThrow<T, E>(result: Result<T, E>): T {
	return result.match(
		(ok) => ok,
		(err) => {
			throw err;
		},
	);
}

/**
 * Initializes Chromium AI and returns an instance object that must be used with all other functions.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.initialize} for the safe version that returns Result types
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @returns A ChromiumAIInstance object
 * @throws {Error} If initialization fails
 *
 * @example
 * const result = await initialize("You are a helpful assistant");
 * const ai = result.instance;
 */
export async function initialize(
	systemPrompt?: string,
): Promise<ChromiumAIInstance> {
	const result = await Safe.initialize(systemPrompt);
	return okOrThrow(result);
}

/**
 * Creates a reusable AI session using the initialized Chromium AI instance.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.createSession} for the safe version that returns Result types
 * @returns Session object for multiple prompts
 * @throws {Error} If session creation fails
 *
 * @example
 * const session = await createSession(ai);
 * const response = await session.prompt("Hello!");
 * session.destroy();
 */
export async function createSession(
	instance: ChromiumAIInstance,
	options?: LanguageModelCreateOptions,
): Promise<LanguageModel> {
	const result = await Safe.createSession(instance, options);
	return okOrThrow(result);
}

/**
 * Executes a callback with a temporary session, ensuring proper cleanup.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.withSession} for the safe version that returns Result types
 * @returns The result of the callback
 * @throws {Error} If session creation or callback execution fails
 *
 * @example
 * const tokenCount = await withSession(ai, async (session) => {
 *   return await session.measureInputUsage("Hello world");
 * });
 */
export async function withSession<T>(
	instance: ChromiumAIInstance,
	callback: (session: LanguageModel) => Promise<T>,
	options?: LanguageModelCreateOptions,
): Promise<T> {
	const result = await Safe.withSession(
		instance,
		(session) =>
			ResultAsync.fromPromise(callback(session), (error) =>
				error instanceof Error ? error : new Error(String(error)),
			),
		options,
	);
	return okOrThrow(result);
}

/**
 * Checks token usage for a prompt without sending it.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.checkTokenUsage} for the safe version that returns Result types
 * @returns Token usage information
 * @throws {Error} If token checking fails
 *
 * @example
 * const usage = await checkTokenUsage(ai, "Long prompt...");
 * console.log(`Prompt uses ${usage.promptTokens} tokens`);
 * if (usage.willFit) {
 *   const response = await prompt(ai, "Long prompt...");
 * }
 */
export async function checkTokenUsage(
	instance: ChromiumAIInstance,
	prompt: string,
	sessionOptions?: LanguageModelCreateOptions,
): Promise<TokenUsageInfo> {
	const result = await Safe.checkTokenUsage(instance, prompt, sessionOptions);
	return okOrThrow(result);
}

/**
 * Performs a single prompt using the initialized Chromium AI instance.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.prompt} for the safe version that returns Result types
 * @param instance The initialized Chromium AI instance
 * @param prompt The user's prompt
 * @param timeout Optional timeout in milliseconds
 * @param promptOptions Options for the prompt (signal, etc)
 * @param sessionOptions Additional session options (merged with instance system prompt)
 * @returns The AI's response
 * @throws {Error} If the prompt fails
 *
 * @example
 * const response = await prompt(ai, "What is TypeScript?");
 *
 * @example
 * // With timeout
 * const response = await prompt(ai, "Explain quantum computing", 5000);
 */
export async function prompt(
	instance: ChromiumAIInstance,
	prompt: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
): Promise<string> {
	const result = await Safe.prompt(
		instance,
		prompt,
		timeout,
		promptOptions,
		sessionOptions,
	);
	return okOrThrow(result);
}

/**
 * ChromiumAI namespace containing all SDK functions for convenient access
 * @example
 * import ChromiumAI from 'simple-chromium-ai';
 *
 * // Default API (throws errors)
 * const result = await ChromiumAI.initialize("You are helpful");
 * const ai = result.instance;
 * const response = await ChromiumAI.prompt(ai, "Hello!");
 *
 * // Safe API (returns Results)
 * const result = await ChromiumAI.Safe.initialize("You are helpful");
 * if (result.isOk()) {
 *   const response = await ChromiumAI.Safe.prompt(result.value.instance, "Hello!");
 * }
 */
const ChromiumAI = {
	// Safe API namespace
	Safe,

	// Default API (throws errors)
	initialize,
	prompt,
	createSession,
	withSession,
	checkTokenUsage,
};

// Default export for convenience
export default ChromiumAI;
