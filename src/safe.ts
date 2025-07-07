/// <reference types="@types/dom-chromium-ai" />

import { err, ok, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import type { ChromiumAIInstance, PromptResult, TokenUsageInfo } from "./types";

/**
 * Initializes Chromium AI and returns an instance object wrapped in a Result.
 * This is the safe version that returns a Result instead of throwing.
 *
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @returns A Result containing InitializeResult
 *
 * @example
 * const result = await ChromiumAI.Safe.initialize("You are a helpful assistant");
 * if (result.isOk()) {
 *   const ai = result.value.instance;
 *   // Use ai...
 * }
 */
export function initialize(
	systemPrompt?: string,
): ResultAsync<ChromiumAIInstance, Error> {
	const unavailableError = new Error(
		"Chromium AI API is not available. To use Chrome AI:\n" +
			"1. You must call this from a browser extension\n" +
			"2. Use Chrome 138+ or supported Chromium browser\n" +
			"3. Enable 'Prompt API for Gemini Nano' in chrome://flags\n" +
			"4. Update 'Optimization Guide On Device Model' in chrome://components (Warning: This will download ~22GB)\n" +
			"5. Join Chrome EPP for web: https://developer.chrome.com/docs/ai/join-epp",
	);
	return new ResultAsync(
		(async () => {
			// Check if API exists
			if (typeof LanguageModel === "undefined") {
				return err(unavailableError);
			}

			// Check current availability
			const availability = await LanguageModel.availability();

			return match(availability)
				.with("unavailable", "downloadable", "downloading", () =>
					err(unavailableError),
				)
				.with("available", () =>
					ok({
						systemPrompt,
						instanceId: crypto.randomUUID(),
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
				(error) => (error instanceof Error ? error : new Error(String(error))),
			);
		},
		sessionOptions,
	);
}
