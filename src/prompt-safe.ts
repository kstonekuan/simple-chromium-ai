/// <reference types="@types/dom-chromium-ai" />

import { err, ok, ResultAsync } from "neverthrow";
import type {
	PromptCreateOptions,
	PromptOptions,
	PromptResult,
	SafePromptInstance,
	TokenUsageInfo,
} from "./types";
import { checkAvailability } from "./utils";

/**
 * Checks availability of the LanguageModel API.
 * Returns a Result containing the availability status.
 */
export function availability(): ResultAsync<Availability, Error> {
	return new ResultAsync(
		(async () => {
			if (typeof LanguageModel === "undefined") {
				return err(
					new Error(
						"LanguageModel API is not available in this browser. Ensure you are using Chrome 148+ or a supported Chromium-based browser.",
					),
				);
			}
			try {
				const result = await LanguageModel.availability();
				return ok(result);
			} catch (error) {
				return err(
					error instanceof Error
						? error
						: new Error(
								`Failed to check LanguageModel availability: ${String(error)}`,
							),
				);
			}
		})(),
	);
}

function buildSessionOptions(
	instance: { systemPrompt?: string; expectedOutputLanguages?: string[] },
	options?: LanguageModelCreateOptions,
): LanguageModelCreateOptions {
	const merged: LanguageModelCreateOptions = { ...options };

	if (!merged.expectedOutputs && instance.expectedOutputLanguages) {
		merged.expectedOutputs = [
			{ type: "text", languages: instance.expectedOutputLanguages },
		];
	}

	if (options?.initialPrompts && options.initialPrompts.length > 0) {
		merged.initialPrompts = options.initialPrompts;
	} else if (instance.systemPrompt) {
		merged.initialPrompts = [
			{
				role: "system" as LanguageModelSystemMessageRole,
				content: instance.systemPrompt,
			},
		];
	}

	return merged;
}

function createSafeSession(
	instance: { systemPrompt?: string; expectedOutputLanguages?: string[] },
	options?: LanguageModelCreateOptions,
): ResultAsync<LanguageModel, Error> {
	return new ResultAsync(
		(async () => {
			try {
				const session = await LanguageModel.create(
					buildSessionOptions(instance, options),
				);
				return ok(session);
			} catch (error) {
				return err(
					new Error(
						`Failed to create AI session: ${error instanceof Error ? error.message : "Unknown error"}`,
					),
				);
			}
		})(),
	);
}

function safeWithSession<T>(
	instance: { systemPrompt?: string; expectedOutputLanguages?: string[] },
	callback: (session: LanguageModel) => ResultAsync<T, Error>,
	options?: LanguageModelCreateOptions,
): ResultAsync<T, Error> {
	return createSafeSession(instance, options).andThen((session) => {
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

function safeCheckTokenUsage(
	instance: { systemPrompt?: string; expectedOutputLanguages?: string[] },
	prompt: string,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<TokenUsageInfo, Error> {
	return safeWithSession(
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

function safePrompt(
	instance: { systemPrompt?: string; expectedOutputLanguages?: string[] },
	prompt: string,
	options?: PromptOptions,
): PromptResult {
	return safeWithSession(
		instance,
		(session) => {
			let timeoutId: ReturnType<typeof setTimeout> | null = null;

			return ResultAsync.fromPromise(
				(async () => {
					try {
						let finalPromptOptions = options?.promptOptions || {};
						if (options?.timeout || finalPromptOptions.signal) {
							const signals: AbortSignal[] = [];

							if (finalPromptOptions.signal) {
								signals.push(finalPromptOptions.signal);
							}

							if (options?.timeout) {
								const timeoutController = new AbortController();
								signals.push(timeoutController.signal);
								timeoutId = setTimeout(
									() => timeoutController.abort(),
									options.timeout,
								);
							}

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

						return await session.prompt(prompt, finalPromptOptions);
					} finally {
						if (timeoutId) {
							clearTimeout(timeoutId);
						}
					}
				})(),
				(error) => (error instanceof Error ? error : new Error(String(error))),
			);
		},
		options?.sessionOptions,
	);
}

/**
 * Creates a safe Prompt instance with bound configuration.
 * All methods on the returned instance return ResultAsync instead of throwing.
 */
export function create(
	options?: PromptCreateOptions,
): ResultAsync<SafePromptInstance, Error> {
	return checkAvailability(
		() => LanguageModel.availability(),
		"LanguageModel",
	).map(() => {
		const config = {
			systemPrompt: options?.systemPrompt,
			instanceId: crypto.randomUUID(),
			expectedOutputLanguages: options?.expectedOutputLanguages ?? ["en"],
		};

		return {
			...config,
			prompt: (prompt: string, opts?: PromptOptions) =>
				safePrompt(config, prompt, opts),
			createSession: (opts?: LanguageModelCreateOptions) =>
				createSafeSession(config, opts),
			withSession: <T>(
				callback: (session: LanguageModel) => ResultAsync<T, Error>,
				opts?: LanguageModelCreateOptions,
			) => safeWithSession(config, callback, opts),
			checkTokenUsage: (prompt: string, opts?: LanguageModelCreateOptions) =>
				safeCheckTokenUsage(config, prompt, opts),
			destroy: () => {},
		};
	});
}

/**
 * One-shot prompt: creates a session, sends the prompt, and destroys the session.
 * Returns a ResultAsync with the response.
 */
export function prompt(
	text: string,
	options?: PromptCreateOptions & PromptOptions,
): PromptResult {
	return checkAvailability(
		() => LanguageModel.availability(),
		"LanguageModel",
	).andThen(() => {
		const config = {
			systemPrompt: options?.systemPrompt,
			expectedOutputLanguages: options?.expectedOutputLanguages ?? ["en"],
		};
		return safePrompt(config, text, options);
	});
}
