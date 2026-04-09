/// <reference types="@types/dom-chromium-ai" />

import { err, ok, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import type { SafeLanguageModelInstance, TokenUsageInfo } from "./types";

/**
 * Initializes the LanguageModel API by checking availability and triggering model download.
 * Returns a safe instance object with `.prompt()`, `.createSession()`, `.withSession()`,
 * and `.checkTokenUsage()` methods that return ResultAsync.
 *
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @param expectedInputLanguages Expected input languages (defaults to ["en"])
 * @param expectedOutputLanguages Expected output languages (defaults to ["en"])
 * @returns A Result containing a SafeLanguageModelInstance or an Error
 *
 * @example
 * const result = await initLanguageModel("You are a helpful assistant");
 * result.match(
 *   (ai) => ai.prompt("Hello!"),
 *   (error) => console.error(error.message)
 * );
 */
export function initLanguageModel(
	systemPrompt?: string,
	expectedInputLanguages: string[] = ["en"],
	expectedOutputLanguages: string[] = ["en"],
): ResultAsync<SafeLanguageModelInstance, Error> {
	return new ResultAsync(
		(async () => {
			if (typeof LanguageModel === "undefined") {
				return err(
					new Error(
						"LanguageModel API is not available in this browser. Ensure you are using Chrome 148+ or a supported Chromium-based browser.",
					),
				);
			}

			const availability = await LanguageModel.availability();

			const canProceed = match(availability)
				.with("unavailable", () =>
					err(
						new Error(
							"LanguageModel API is present but the model is unavailable on this device.",
						),
					),
				)
				.with("downloadable", "downloading", "available", () => ok(undefined))
				.exhaustive();

			if (canProceed.isErr()) {
				return canProceed;
			}

			// Trigger actual model download by creating and immediately destroying a session
			try {
				const session = await LanguageModel.create({
					expectedInputs: [
						{ type: "text", languages: expectedInputLanguages },
					],
					expectedOutputs: [
						{ type: "text", languages: expectedOutputLanguages },
					],
				});
				session.destroy();
			} catch (error) {
				return err(
					new Error(
						`Failed to download LanguageModel: ${error instanceof Error ? error.message : String(error)}`,
					),
				);
			}

			const instance: SafeLanguageModelInstance = {
				prompt: (text, timeout, promptOptions, sessionOptions) =>
					prompt(
						systemPrompt,
						expectedInputLanguages,
						expectedOutputLanguages,
						text,
						timeout,
						promptOptions,
						sessionOptions,
					),
				createSession: (options) =>
					createSession(
						systemPrompt,
						expectedInputLanguages,
						expectedOutputLanguages,
						options,
					),
				withSession: (callback, options) =>
					withSession(
						systemPrompt,
						expectedInputLanguages,
						expectedOutputLanguages,
						callback,
						options,
					),
				checkTokenUsage: (promptText, sessionOptions) =>
					checkTokenUsage(
						systemPrompt,
						expectedInputLanguages,
						expectedOutputLanguages,
						promptText,
						sessionOptions,
					),
			};

			return ok(instance);
		})(),
	);
}

/** @deprecated Use initLanguageModel instead */
export const initialize = initLanguageModel;

function createSession(
	systemPrompt: string | undefined,
	expectedInputLanguages: string[],
	expectedOutputLanguages: string[],
	options?: LanguageModelCreateOptions,
): ResultAsync<LanguageModel, Error> {
	return new ResultAsync(
		(async () => {
			try {
				const mergedOptions: LanguageModelCreateOptions = {
					...options,
				};

				if (
					!mergedOptions.expectedInputs &&
					expectedInputLanguages.length > 0
				) {
					mergedOptions.expectedInputs = [
						{ type: "text", languages: expectedInputLanguages },
					];
				}

				if (
					!mergedOptions.expectedOutputs &&
					expectedOutputLanguages.length > 0
				) {
					mergedOptions.expectedOutputs = [
						{ type: "text", languages: expectedOutputLanguages },
					];
				}

				if (options?.initialPrompts && options.initialPrompts.length > 0) {
					mergedOptions.initialPrompts = options.initialPrompts;
				} else if (systemPrompt) {
					mergedOptions.initialPrompts = [
						{
							role: "system" as LanguageModelSystemMessageRole,
							content: systemPrompt,
						},
					];
				}

				const session = await LanguageModel.create(mergedOptions);
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

function withSession<T>(
	systemPrompt: string | undefined,
	expectedInputLanguages: string[],
	expectedOutputLanguages: string[],
	callback: (session: LanguageModel) => ResultAsync<T, Error>,
	options?: LanguageModelCreateOptions,
): ResultAsync<T, Error> {
	return createSession(systemPrompt, expectedInputLanguages, expectedOutputLanguages, options).andThen(
		(session) => {
			return callback(session)
				.map((value) => {
					session.destroy();
					return value;
				})
				.mapErr((error) => {
					session.destroy();
					return error;
				});
		},
	);
}

function checkTokenUsage(
	systemPrompt: string | undefined,
	expectedInputLanguages: string[],
	expectedOutputLanguages: string[],
	promptText: string,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<TokenUsageInfo, Error> {
	return withSession(
		systemPrompt,
		expectedInputLanguages,
		expectedOutputLanguages,
		(session) => {
			return ResultAsync.fromSafePromise(
				(async () => {
					const promptTokens = await session.measureInputUsage(promptText);
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

function prompt(
	systemPrompt: string | undefined,
	expectedInputLanguages: string[],
	expectedOutputLanguages: string[],
	text: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<string, Error> {
	return withSession(
		systemPrompt,
		expectedInputLanguages,
		expectedOutputLanguages,
		(session) => {
			let timeoutId: ReturnType<typeof setTimeout> | null = null;

			return ResultAsync.fromPromise(
				(async () => {
					try {
						let finalPromptOptions = promptOptions || {};
						if (timeout || finalPromptOptions.signal) {
							const signals: AbortSignal[] = [];

							if (finalPromptOptions.signal) {
								signals.push(finalPromptOptions.signal);
							}

							if (timeout) {
								const timeoutController = new AbortController();
								signals.push(timeoutController.signal);
								timeoutId = setTimeout(
									() => timeoutController.abort(),
									timeout,
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

						const response = await session.prompt(text, finalPromptOptions);
						return response;
					} finally {
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
