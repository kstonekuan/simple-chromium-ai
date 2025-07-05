/// <reference types="@types/dom-chromium-ai" />

import { err, ok, type Result, ResultAsync } from "neverthrow";

// Re-export Result types for users who want them
export { err, ok, Result, ResultAsync } from "neverthrow";

/**
 * Context provided to the onInputTooLong callback
 */
export interface InputTooLongContext {
	tokenCount: number;
	maxTokens: number;
	tokensSoFar: number;
	originalPrompt: string;
}

/**
 * Context provided to the onTimeout callback
 */
export interface TimeoutContext {
	timeoutMs: number;
	originalPrompt: string;
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
 * // Using Result type
 * const result = await initializeSafe();
 * result.match(
 *   ai => console.log("Initialized successfully"),
 *   error => console.error("Failed:", error.message)
 * );
 *
 * @example
 * // With system prompt and chaining
 * await initializeSafe("You are a helpful assistant")
 *   .andThen(ai => promptSafe(ai, "Hello"))
 *   .match(
 *     response => console.log(response),
 *     error => console.error(error)
 *   );
 */
export function initializeSafe(
	systemPrompt?: string,
	onDownloadProgress?: (progress: number) => void,
): ResultAsync<ChromiumAIInstance, Error> {
	const unavailableError = new Error(
		"Chromium AI API is not available. Please ensure you're using Chrome 138+ with AI features enabled or another Chromium browser that supports it.",
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

			// If already available, return immediately
			if (availability === "available") {
				return ok({
					systemPrompt,
					instanceId: crypto.randomUUID(),
				});
			}

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

			// Verify it's now available
			const finalStatus = await LanguageModel.availability();
			if (finalStatus === "available") {
				return ok({
					systemPrompt,
					instanceId: crypto.randomUUID(),
				});
			}

			return err(
				new Error(
					"AI model download failed. Please check your internet connection and try again.",
				),
			);
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
 * // Using Result type
 * const sessionResult = await createSessionSafe(ai);
 * if (sessionResult.isOk()) {
 *   const session = sessionResult.value;
 *   try {
 *     const response = await session.prompt("Hello!");
 *   } finally {
 *     session.destroy();
 *   }
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
 * try {
 *   const response = await session.prompt("Hello!");
 * } finally {
 *   session.destroy();
 * }
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
 * @param callback The callback to execute with the session
 * @param options Additional session options
 * @returns A Result containing either the callback result or an Error
 *
 * @example
 * // Count tokens with error handling
 * const result = await withSessionSafe(ai, async (session) => {
 *   return await session.measureInputUsage("Hello world");
 * });
 * result.match(
 *   tokenCount => console.log(`Token count: ${tokenCount}`),
 *   error => console.error("Failed:", error.message)
 * );
 *
 * @example
 * // Chain with other operations
 * await withSessionSafe(ai, async (session) => {
 *   const prompt = "Long text...";
 *   const tokens = await session.measureInputUsage(prompt);
 *   if (tokens > session.inputQuota) {
 *     throw new Error("Prompt too long");
 *   }
 *   return await session.prompt(prompt);
 * }).match(
 *   response => console.log(response),
 *   error => console.error(error)
 * );
 */
export function withSessionSafe<T>(
	instance: ChromiumAIInstance,
	callback: (session: LanguageModel) => Promise<T>,
	options?: LanguageModelCreateOptions,
): ResultAsync<T, Error> {
	return new ResultAsync(
		(async () => {
			const sessionResult = await createSessionSafe(instance, options);
			if (sessionResult.isErr()) {
				return err(sessionResult.error);
			}

			const session = sessionResult.value;
			try {
				const result = await callback(session);
				return ok(result);
			} catch (error) {
				return err(
					new Error(
						`Callback failed: ${error instanceof Error ? error.message : "Unknown error"}`,
					),
				);
			} finally {
				session.destroy();
			}
		})(),
	);
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
	const result = await withSessionSafe(instance, callback, options);
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
 * @param checkInputLimitBeforeSending Check if the prompt exceeds token limits before sending
 * @param recoveryCallbacks Optional callbacks for handling recoverable errors
 * @returns A Result containing either the AI's response or an Error
 *
 * @example
 * // Using Result type
 * const result = await promptSafe(ai, "What is TypeScript?");
 * if (result.isOk()) {
 *   console.log(result.value);
 * }
 *
 * @example
 * // With token limit checking
 * const result = await promptSafe(
 *   ai,
 *   "Very long prompt...",
 *   undefined,
 *   undefined,
 *   undefined,
 *   true // checkInputLimitBeforeSending
 * );
 * if (result.isErr()) {
 *   console.log(`Error: ${result.error.message}`);
 * }
 *
 * @example
 * // With chaining
 * await promptSafe(ai, "Tell me a joke")
 *   .map(response => response.toUpperCase())
 *   .match(
 *     joke => console.log(joke),
 *     error => console.error(error)
 *   );
 *
 * @example
 * // With recovery callbacks
 * await promptSafe(
 *   ai,
 *   "Very long prompt...",
 *   5000,
 *   undefined,
 *   undefined,
 *   true,
 *   (error, context) => {
 *     // Return a shorter prompt
 *     return ResultAsync.fromSafePromise("Summarize briefly");
 *   },
 *   (error, context) => {
 *     // Handle timeout - return error to fail
 *     return err(new Error("Timeout - aborting"));
 *   }
 * ).match(
 *   response => console.log("Success:", response),
 *   error => console.error("Error:", error.message)
 * );
 */
export function promptSafe(
	instance: ChromiumAIInstance,
	prompt: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
	checkInputLimitBeforeSending?: boolean,
	/** Called when the input prompt is too long. Return a shorter prompt to retry. */
	onInputTooLong?: (err: Error, context: InputTooLongContext) => PromptResult,
	/** Called when the request times out. Return the prompt to retry. */
	onTimeout?: (err: Error, context: TimeoutContext) => PromptResult,
): PromptResult {
	return withSessionSafe(
		instance,
		async (session) => {
			let timeoutId: NodeJS.Timeout | null = null;

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
						timeoutId = setTimeout(() => timeoutController.abort(), timeout);
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

				// Check token limits if requested
				if (checkInputLimitBeforeSending) {
					try {
						const promptTokens = await session.measureInputUsage(prompt);

						if (promptTokens !== undefined) {
							// Get the context window size and current usage
							const maxTokens = session.inputQuota;
							const tokensSoFar = session.inputUsage;

							if (maxTokens && promptTokens > maxTokens - tokensSoFar) {
								const error = new Error(
									`Prompt exceeds available token limit: ${promptTokens} tokens needed, but only ${maxTokens - tokensSoFar} available (max: ${maxTokens}, used: ${tokensSoFar})`,
								);
								// Try recovery callback if available
								if (onInputTooLong) {
									const context: InputTooLongContext = {
										tokenCount: promptTokens,
										maxTokens,
										tokensSoFar,
										originalPrompt: prompt,
									};
									const recoveryResult = await onInputTooLong(error, context);
									if (recoveryResult.isOk()) {
										return recoveryResult.value;
									}
									throw recoveryResult.error;
								}
								// No recovery callback
								throw error;
							}
						} else {
							console.warn(
								"Token counting not available in this Chromium AI version",
							);
						}
					} catch (tokenCheckError) {
						// If token checking fails, log it but continue
						console.warn("Failed to check token count:", tokenCheckError);
					}
				}

				// Send prompt and return response
				const response = await session.prompt(prompt, finalPromptOptions);
				return response;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					// Try recovery callback if available
					if (onTimeout && timeout) {
						const timeoutError = new Error(
							"AI prompt was cancelled due to timeout",
						);
						const context: TimeoutContext = {
							timeoutMs: timeout,
							originalPrompt: prompt,
						};
						const recoveryResult = await onTimeout(timeoutError, context);
						if (recoveryResult.isOk()) {
							return recoveryResult.value;
						}
						throw recoveryResult.error;
					}
					// No recovery callback
					throw new Error("AI prompt was cancelled due to timeout");
				}

				throw error;
			} finally {
				// Clean up timeout
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
			}
		},
		sessionOptions,
	);
}

/**
 * Performs a single prompt using the initialized Chromium AI instance.
 * This is the default version that throws errors instead of returning Result types.
 *
 * @see {@link promptSafe} for the safe version that returns Result types
 * @param onInputTooLong Called when input is too long. Return a shorter prompt to retry.
 * @param onTimeout Called when request times out. Return a prompt to retry.
 * @returns The AI's response
 * @throws {Error} If the prompt fails
 *
 * @example
 * // Basic usage
 * const response = await prompt(ai, "What is TypeScript?");
 *
 * @example
 * // With recovery callbacks
 * const response = await prompt(
 *   ai,
 *   "Very long prompt...",
 *   5000,
 *   undefined,
 *   undefined,
 *   true,
 *   async (error, context) => "Shorter prompt", // onInputTooLong
 *   async (error, context) => {
 *     throw error; // Propagate timeout error
 *   }
 * );
 */
export async function prompt(
	instance: ChromiumAIInstance,
	prompt: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
	checkInputLimitBeforeSending?: boolean,
	/** Called when the input prompt is too long. Return a shorter prompt to retry. */
	onInputTooLong?: (
		err: Error,
		context: InputTooLongContext,
	) => Promise<string>,
	/** Called when the request times out. Return the prompt to retry. */
	onTimeout?: (err: Error, context: TimeoutContext) => Promise<string>,
): Promise<string> {
	const result = await promptSafe(
		instance,
		prompt,
		timeout,
		promptOptions,
		sessionOptions,
		checkInputLimitBeforeSending,
		onInputTooLong
			? (err, context) =>
					ResultAsync.fromSafePromise(onInputTooLong(err, context))
			: undefined,

		onTimeout
			? (err, context) => ResultAsync.fromSafePromise(onTimeout(err, context))
			: undefined,
	);
	return okOrThrow(result);
}

/**
 * ChromiumAI namespace containing all SDK functions for convenient access
 * @example
 * import ChromiumAI from 'simple-chromium-ai';
 *
 * // Default API (throws errors)
 * try {
 *   const ai = await ChromiumAI.initialize("You are helpful");
 *   const response = await ChromiumAI.prompt(ai, "Hello!");
 * } catch (error) {
 *   console.error(error);
 * }
 *
 * // Safe API (returns Results)
 * await ChromiumAI.initializeSafe("You are helpful")
 *   .andThen(ai => ChromiumAI.promptSafe(ai, "Hello!"))
 *   .match(
 *     response => console.log(response),
 *     error => console.error(error)
 *   );
 */
export const ChromiumAI = {
	// Safe API (returns Results)
	initializeSafe,
	promptSafe,
	createSessionSafe,
	withSessionSafe,

	// Default API (throws errors)
	initialize,
	prompt,
	createSession,
	withSession,
};

// Default export for convenience
export default ChromiumAI;
