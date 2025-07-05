/// <reference types="@types/dom-chromium-ai" />

import { err, ok, type Result, ResultAsync } from "neverthrow";

// Re-export Result types for users who want them
export { err, ok, Result, ResultAsync } from "neverthrow";

/**
 * Information about token usage for a prompt
 */
export interface TokenUsageInfo {
	promptTokens: number;
	maxTokens: number;
	tokensSoFar: number;
	tokensAvailable: number;
	willFit: boolean;
}

/**
 * Represents an initialized Chromium AI instance with a configured system prompt.
 * This object must be passed to all other SDK functions to ensure proper initialization.
 */
export interface ChromiumAIInstance {
	/** The system prompt that will be used for all sessions created from this instance */
	readonly systemPrompt?: string;
	/** Unique identifier for this instance */
	readonly instanceId: string;
}

function okOrThrow<T, E>(result: Result<T, E>): T {
	return result.match(
		(ok) => ok,
		(err) => {
			throw err;
		},
	);
}

/**
 * Initializes Chromium AI and returns an instance object wrapped in a Result.
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @param onDownloadProgress Optional callback for download progress
 * @returns A Result containing either a ChromiumAIInstance or an Error
 *
 * @example
 * const result = await initializeSafe("You are a helpful assistant");
 * if (result.isOk()) {
 *   const ai = result.value;
 *   // Use ai...
 * }
 */
export function initializeSafe(
	systemPrompt?: string,
	onDownloadProgress?: (progress: number) => void,
): ResultAsync<ChromiumAIInstance, Error> {
	const unavailableError = new Error(
		"Chromium AI API is not available. Please ensure you're using Chrome 138+ with AI features enabled or another Chromium browser that supports it.",
	);
	const downloadError = new Error(
		"AI model download failed. Please check your internet connection and try again.",
	);
	return new ResultAsync(
		(async () => {
			// Check if API exists
			if (typeof LanguageModel === "undefined") {
				return err(unavailableError);
			}

			// Check current availability
			const availability = await LanguageModel.availability();

			if (availability === "unavailable") {
				return err(unavailableError);
			}

			// If downloadable, trigger download
			if (availability === "downloadable" || availability === "downloading") {
				try {
					// Trigger download by creating a temporary session
					const tempSession = await LanguageModel.create({
						monitor: onDownloadProgress
							? (m) => {
									m.addEventListener("downloadprogress", (e) => {
										onDownloadProgress(e.loaded * 100);
									});
								}
							: undefined,
					});

					// Clean up the temporary session
					tempSession.destroy();
				} catch {
					return err(downloadError);
				}
			}

			// Verify it's now available
			const finalStatus = await LanguageModel.availability();
			if (finalStatus === "available") {
				return ok({
					systemPrompt,
					instanceId: crypto.randomUUID(),
				});
			}

			return err(downloadError);
		})(),
	);
}

/**
 * Initializes Chromium AI and returns an instance object that must be used with all other functions.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link initializeSafe} for the safe version that returns Result types
 * @returns A ChromiumAIInstance object
 * @throws {Error} If initialization fails
 *
 * @example
 * const ai = await initialize("You are a helpful assistant");
 */
export async function initialize(
	systemPrompt?: string,
	onDownloadProgress?: (progress: number) => void,
): Promise<ChromiumAIInstance> {
	const result = await initializeSafe(systemPrompt, onDownloadProgress);
	return okOrThrow(result);
}

export type PromptResult = ResultAsync<string, Error>;

/**
 * Creates a reusable AI session using the initialized Chromium AI instance.
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param instance The initialized Chromium AI instance
 * @param options Additional session options (merged with instance system prompt)
 * @returns A Result containing either a session object or an Error
 *
 * @example
 * const sessionResult = await createSessionSafe(ai);
 * if (sessionResult.isOk()) {
 *   const session = sessionResult.value;
 *   // Use session...
 *   session.destroy();
 * }
 */
export function createSessionSafe(
	instance: ChromiumAIInstance,
	options?: LanguageModelCreateOptions,
): ResultAsync<LanguageModel, Error> {
	return new ResultAsync(
		(async () => {
			try {
				// Merge instance system prompt with session options
				const mergedOptions: LanguageModelCreateOptions = {
					...options,
				};

				if (instance.systemPrompt) {
					const systemMessage: LanguageModelSystemMessage = {
						role: "system" as LanguageModelSystemMessageRole,
						content: instance.systemPrompt,
					};

					// Always use our system message as the first prompt
					mergedOptions.initialPrompts = [systemMessage];

					// If options has initial prompts, append non-system messages
					if (options?.initialPrompts && options.initialPrompts.length > 0) {
						// Skip the first (system) message from options and add the rest
						const nonSystemMessages = options.initialPrompts.slice(
							1,
						) as LanguageModelMessage[];
						if (nonSystemMessages.length > 0) {
							mergedOptions.initialPrompts = [
								systemMessage,
								...nonSystemMessages,
							];
						}
					}
				} else if (options?.initialPrompts) {
					// No instance system prompt, use options as is
					mergedOptions.initialPrompts = options.initialPrompts;
				}

				const session = await LanguageModel.create(mergedOptions);
				return ok(session);
			} catch (error) {
				return err(
					new Error(
						`Failed to create AI session: ${error instanceof Error ? error.message : "Unknown error"}. This might be due to rate limiting or resource constraints.`,
					),
				);
			}
		})(),
	);
}

/**
 * Creates a reusable AI session using the initialized Chromium AI instance.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link createSessionSafe} for the safe version that returns Result types
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
	const result = await createSessionSafe(instance, options);
	return okOrThrow(result);
}

/**
 * Executes a callback with a temporary session, ensuring proper cleanup.
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param instance The initialized Chromium AI instance
 * @param callback The callback to execute with the session - should return ResultAsync for safety
 * @param options Additional session options
 * @returns A Result containing either the callback result or an Error
 *
 * @example
 * const result = await withSessionSafe(ai, async (session) => {
 *   return ResultAsync.fromSafePromise(session.measureInputUsage("Hello world"));
 * });
 */
export function withSessionSafe<T>(
	instance: ChromiumAIInstance,
	callback: (session: LanguageModel) => ResultAsync<T, Error>,
	options?: LanguageModelCreateOptions,
): ResultAsync<T, Error> {
	return createSessionSafe(instance, options).andThen((session) => {
		// Execute callback and ensure cleanup happens regardless of outcome
		return callback(session)
			.map((value) => {
				session.destroy();
				return value;
			})
			.mapErr((error) => {
				session.destroy();
				return error;
			});
	});
}

/**
 * Executes a callback with a temporary session, ensuring proper cleanup.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link withSessionSafe} for the safe version that returns Result types
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
	const result = await withSessionSafe(
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
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param instance The initialized Chromium AI instance
 * @param prompt The prompt to check
 * @param sessionOptions Additional session options
 * @returns A Result containing token usage information or an Error
 *
 * @example
 * const usage = await checkTokenUsageSafe(ai, "Long prompt...");
 * if (usage.isOk() && usage.value.willFit) {
 *   const response = await prompt(ai, "Long prompt...");
 * }
 */
export function checkTokenUsageSafe(
	instance: ChromiumAIInstance,
	prompt: string,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<TokenUsageInfo, Error> {
	return withSessionSafe(
		instance,
		(session) => {
			return ResultAsync.fromSafePromise(
				(async () => {
					const promptTokens = await session.measureInputUsage(prompt);
					const maxTokens = session.inputQuota || 0;
					const tokensSoFar = session.inputUsage || 0;
					const tokensAvailable = maxTokens - tokensSoFar;

					return {
						promptTokens,
						maxTokens,
						tokensSoFar,
						tokensAvailable,
						willFit: promptTokens <= tokensAvailable,
					};
				})(),
			);
		},
		sessionOptions,
	);
}

/**
 * Checks token usage for a prompt without sending it.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link checkTokenUsageSafe} for the safe version that returns Result types
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
	const result = await checkTokenUsageSafe(instance, prompt, sessionOptions);
	return okOrThrow(result);
}

/**
 * Performs a single prompt using the initialized Chromium AI instance.
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param instance The initialized Chromium AI instance
 * @param prompt The user's prompt
 * @param timeout Optional timeout in milliseconds
 * @param promptOptions Options for the prompt (signal, etc)
 * @param sessionOptions Additional session options (merged with instance system prompt)
 * @returns A Result containing either the AI's response or an Error
 *
 * @example
 * const result = await promptSafe(ai, "What is TypeScript?");
 * if (result.isOk()) {
 *   console.log(result.value);
 * }
 *
 * @example
 * // With timeout
 * const result = await promptSafe(ai, "Explain quantum computing", 5000);
 */
export function promptSafe(
	instance: ChromiumAIInstance,
	prompt: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
): PromptResult {
	return withSessionSafe(
		instance,
		(session) => {
			let timeoutId: NodeJS.Timeout | null = null;

			return ResultAsync.fromPromise(
				(async () => {
					try {
						// Handle abort signals - combine timeout and user-provided signal if both exist
						let finalPromptOptions = promptOptions || {};
						if (timeout || finalPromptOptions.signal) {
							const signals: AbortSignal[] = [];

							// Add user-provided signal if it exists
							if (finalPromptOptions.signal) {
								signals.push(finalPromptOptions.signal);
							}

							// Add timeout signal if timeout is specified
							if (timeout) {
								const timeoutController = new AbortController();
								signals.push(timeoutController.signal);
								timeoutId = setTimeout(
									() => timeoutController.abort(),
									timeout,
								);
							}

							// Combine signals using AbortSignal.any() if available, otherwise use the single signal
							if (signals.length > 1 && AbortSignal.any) {
								finalPromptOptions = {
									...finalPromptOptions,
									signal: AbortSignal.any(signals),
								};
							} else if (signals.length === 1) {
								finalPromptOptions = {
									...finalPromptOptions,
									signal: signals[0],
								};
							}
						}

						// Send prompt and return response
						const response = await session.prompt(prompt, finalPromptOptions);
						return response;
					} finally {
						// Clean up timeout
						if (timeoutId) {
							clearTimeout(timeoutId);
						}
					}
				})(),
				(error) => (error instanceof Error ? error : new Error(String(error))),
			);
		},
		sessionOptions,
	);
}

/**
 * Performs a single prompt using the initialized Chromium AI instance.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link promptSafe} for the safe version that returns Result types
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
	const result = await promptSafe(
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
 * // Default API
 * const ai = await ChromiumAI.initialize("You are helpful");
 * const response = await ChromiumAI.prompt(ai, "Hello!");
 *
 * // Safe API
 * const result = await ChromiumAI.initializeSafe("You are helpful");
 * if (result.isOk()) {
 *   const response = await ChromiumAI.promptSafe(result.value, "Hello!");
 * }
 */
const ChromiumAI = {
	// Safe API (returns Results)
	initializeSafe,
	promptSafe,
	createSessionSafe,
	withSessionSafe,
	checkTokenUsageSafe,

	// Default API (throws errors)
	initialize,
	prompt,
	createSession,
	withSession,
	checkTokenUsage,
};

// Default export for convenience
export default ChromiumAI;
