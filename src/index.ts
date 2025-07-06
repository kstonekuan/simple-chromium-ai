/// <reference types="@types/dom-chromium-ai" />

import { err, ok, type Result, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";

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

export type TriggerDownload = () => ResultAsync<ChromiumAIInstance, Error>;

export type InitializeResult =
	| { type: "initialized"; instance: ChromiumAIInstance }
	| { type: "needs-download"; trigger: TriggerDownload };

export type PromptResult = ResultAsync<string, Error>;

function okOrThrow<T, E>(result: Result<T, E>): T {
	return result.match(
		(ok) => ok,
		(err) => {
			throw err;
		},
	);
}

/**
 * Safe API namespace containing all functions that return Result types
 */
namespace Safe {
	/**
	 * Initializes Chromium AI and returns an instance object wrapped in a Result.
	 * This is the safe version that returns a Result instead of throwing.
	 *
	 * @param systemPrompt Optional system prompt that will be used for all sessions
	 * @param onDownloadProgress Optional callback for download progress
	 * @returns A Result containing InitializeResult (tagged union)
	 *
	 * @example
	 * const result = await ChromiumAI.Safe.initialize("You are a helpful assistant");
	 * if (result.isOk()) {
	 *   const value = result.value;
	 *   if (value.type === 'initialized') {
	 *     const ai = value.instance;
	 *     // Use ai...
	 *   } else {
	 *     // Need to trigger download
	 *     const aiResult = await value.trigger();
	 *     if (aiResult.isOk()) {
	 *       const ai = aiResult.value;
	 *       // Use ai...
	 *     }
	 *   }
	 * }
	 */
	export function initialize(
		systemPrompt?: string,
		onDownloadProgress?: (progress: number) => void,
	): ResultAsync<InitializeResult, Error> {
		const unavailableError = new Error(
			"Chromium AI API is not available. Please ensure you're using Chrome 138+ with AI features enabled or another Chromium browser that supports it.",
		);
		const triggerOrViewDownload = (
			availability: Availability,
		): ResultAsync<ChromiumAIInstance, Error> => {
			return new ResultAsync(
				(async () => {
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
					} catch (error) {
						return err(
							new Error(
								`Failed to trigger or view download ${error instanceof Error ? error.message : "Unknown error"}, availability: ${availability}.`,
							),
						);
					}

					// Verify it's now available
					const finalStatus = await LanguageModel.availability();

					return match(finalStatus)
						.with("available", () =>
							ok({
								systemPrompt,
								instanceId: crypto.randomUUID(),
							}),
						)
						.otherwise((status) =>
							err(
								new Error(
									`Chromium AI API is still not available after download attempt. Current status: ${status}.`,
								),
							),
						);
				})(),
			);
		};
		return new ResultAsync(
			(async () => {
				// Check if API exists
				if (typeof LanguageModel === "undefined") {
					return err(unavailableError);
				}

				// Check current availability
				const availability = await LanguageModel.availability();

				return match(availability)
					.with("unavailable", () => err(unavailableError))
					.with("downloadable", () =>
						ok({
							type: "needs-download" as const,
							trigger: () => triggerOrViewDownload(availability),
						}),
					)
					.with("downloading", () =>
						triggerOrViewDownload(availability)
							.map((instance) => ({
								type: "initialized" as const,
								instance,
							}))
							.mapErr(
								(error) =>
									new Error(
										`Failed to view download: ${error instanceof Error ? error.message : "Unknown error"}`,
									),
							),
					)
					.with("available", () =>
						ok({
							type: "initialized" as const,
							instance: {
								systemPrompt,
								instanceId: crypto.randomUUID(),
							},
						}),
					)
					.exhaustive();
			})(),
		);
	}

	/**
	 * Creates a reusable AI session using the initialized Chromium AI instance.
	 * This is the safe version that returns a Result instead of throwing.
	 *
	 * @param instance The initialized Chromium AI instance
	 * @param options Additional session options (merged with instance system prompt)
	 * @returns A Result containing either a session object or an Error
	 *
	 * @example
	 * const sessionResult = await ChromiumAI.Safe.createSession(ai);
	 * if (sessionResult.isOk()) {
	 *   const session = sessionResult.value;
	 *   // Use session...
	 *   session.destroy();
	 * }
	 */
	export function createSession(
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
					}


						// If options has initial prompts, override the system prompt
						if (options?.initialPrompts && options.initialPrompts.length > 0) {
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
	 * Executes a callback with a temporary session, ensuring proper cleanup.
	 * This is the safe version that returns a Result instead of throwing.
	 *
	 * @param instance The initialized Chromium AI instance
	 * @param callback The callback to execute with the session - should return ResultAsync for safety
	 * @param options Additional session options
	 * @returns A Result containing either the callback result or an Error
	 *
	 * @example
	 * const result = await ChromiumAI.Safe.withSession(ai, async (session) => {
	 *   return ResultAsync.fromSafePromise(session.measureInputUsage("Hello world"));
	 * });
	 */
	export function withSession<T>(
		instance: ChromiumAIInstance,
		callback: (session: LanguageModel) => ResultAsync<T, Error>,
		options?: LanguageModelCreateOptions,
	): ResultAsync<T, Error> {
		return createSession(instance, options).andThen((session) => {
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
	 * Checks token usage for a prompt without sending it.
	 * This is the safe version that returns a Result instead of throwing.
	 *
	 * @param instance The initialized Chromium AI instance
	 * @param prompt The prompt to check
	 * @param sessionOptions Additional session options
	 * @returns A Result containing token usage information or an Error
	 *
	 * @example
	 * const usage = await ChromiumAI.Safe.checkTokenUsage(ai, "Long prompt...");
	 * if (usage.isOk() && usage.value.willFit) {
	 *   const response = await ChromiumAI.Safe.prompt(ai, "Long prompt...");
	 * }
	 */
	export function checkTokenUsage(
		instance: ChromiumAIInstance,
		prompt: string,
		sessionOptions?: LanguageModelCreateOptions,
	): ResultAsync<TokenUsageInfo, Error> {
		return withSession(
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
	 * const result = await ChromiumAI.Safe.prompt(ai, "What is TypeScript?");
	 * if (result.isOk()) {
	 *   console.log(result.value);
	 * }
	 */
	export function prompt(
		instance: ChromiumAIInstance,
		prompt: string,
		timeout?: number,
		promptOptions?: LanguageModelPromptOptions,
		sessionOptions?: LanguageModelCreateOptions,
	): PromptResult {
		return withSession(
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
					(error) =>
						error instanceof Error ? error : new Error(String(error)),
				);
			},
			sessionOptions,
		);
	}
}

/**
 * Initializes Chromium AI and returns an instance object that must be used with all other functions.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link Safe.initialize} for the safe version that returns Result types
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @param onDownloadProgress Optional callback for download progress
 * @returns A ChromiumAIInstance object or a function to trigger download
 * @throws {Error} If initialization fails
 *
 * @example
 * const result = await initialize("You are a helpful assistant");
 * if (result.type === 'initialized') {
 *   const ai = result.instance;
 * } else {
 *   // Need to trigger download from user interaction
 *   const ai = await result.trigger();
 * }
 */
export async function initialize(
	systemPrompt?: string,
	onDownloadProgress?: (progress: number) => void,
): Promise<InitializeResult> {
	const result = await Safe.initialize(systemPrompt, onDownloadProgress);
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
 * const ai = result.type === 'initialized'
 *   ? result.instance
 *   : await result.trigger();
 * const response = await ChromiumAI.prompt(ai, "Hello!");
 *
 * // Safe API (returns Results)
 * const result = await ChromiumAI.Safe.initialize("You are helpful");
 * if (result.isOk() && result.value.type === 'initialized') {
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
