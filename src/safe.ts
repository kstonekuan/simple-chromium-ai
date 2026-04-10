/// <reference types="@types/dom-chromium-ai" />

import { err, ok, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import type {
	LanguageModelInitOptions,
	SafeLanguageModelInstance,
	TokenUsageInfo,
} from "./types";

/**
 * Initializes the LanguageModel API by checking availability and triggering model download.
 * Returns a safe instance object with `.prompt()`, `.createSession()`, `.withSession()`,
 * and `.checkTokenUsage()` methods that return ResultAsync.
 *
 * Init is only about capability (can the model run?), not behavior (what should it say?).
 * Pass system prompts via `createSession()` or the `sessionOptions` parameter on `.prompt()`.
 *
 * @param options Optional init options (expectedInputs, expectedOutputs, monitor, signal)
 * @returns A Result containing a SafeLanguageModelInstance or an Error
 *
 * @example
 * const result = await initLanguageModel();
 * result.match(
 *   (ai) => ai.prompt("Hello!"),
 *   (error) => console.error(error.message)
 * );
 */
export function initLanguageModel(
	options?: LanguageModelInitOptions,
): ResultAsync<SafeLanguageModelInstance, Error> {
	const expectedInputs = options?.expectedInputs ?? [
		{ type: "text" as const, languages: ["en"] },
	];
	const expectedOutputs = options?.expectedOutputs ?? [
		{ type: "text" as const, languages: ["en"] },
	];

	return new ResultAsync(
		(async () => {
			if (typeof LanguageModel === "undefined") {
				return err(
					new Error(
						"LanguageModel API is not available in this browser. Ensure you are using Chrome 148+ or a supported Chromium-based browser.",
					),
				);
			}

			const availability = await LanguageModel.availability({
				expectedInputs,
				expectedOutputs,
			});

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
					expectedInputs,
					expectedOutputs,
					monitor: options?.monitor,
					signal: options?.signal,
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
						expectedInputs,
						expectedOutputs,
						text,
						timeout,
						promptOptions,
						sessionOptions,
					),
				createSession: (sessionOptions) =>
					createSession(expectedInputs, expectedOutputs, sessionOptions),
				withSession: (callback, sessionOptions) =>
					withSession(
						expectedInputs,
						expectedOutputs,
						callback,
						sessionOptions,
					),
				checkTokenUsage: (promptText, sessionOptions) =>
					checkTokenUsage(
						expectedInputs,
						expectedOutputs,
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
	expectedInputs: LanguageModelExpected[],
	expectedOutputs: LanguageModelExpected[],
	options?: LanguageModelCreateOptions,
): ResultAsync<LanguageModel, Error> {
	return new ResultAsync(
		(async () => {
			try {
				const mergedOptions: LanguageModelCreateOptions = {
					...options,
				};

				if (!mergedOptions.expectedInputs && expectedInputs.length > 0) {
					mergedOptions.expectedInputs = expectedInputs;
				}

				if (!mergedOptions.expectedOutputs && expectedOutputs.length > 0) {
					mergedOptions.expectedOutputs = expectedOutputs;
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
	expectedInputs: LanguageModelExpected[],
	expectedOutputs: LanguageModelExpected[],
	callback: (session: LanguageModel) => ResultAsync<T, Error>,
	options?: LanguageModelCreateOptions,
): ResultAsync<T, Error> {
	return createSession(expectedInputs, expectedOutputs, options).andThen(
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
	expectedInputs: LanguageModelExpected[],
	expectedOutputs: LanguageModelExpected[],
	promptText: string,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<TokenUsageInfo, Error> {
	return withSession(
		expectedInputs,
		expectedOutputs,
		(session) => {
			return ResultAsync.fromSafePromise(
				(async () => {
					const promptTokens = await session.measureContextUsage(promptText);
					const maxTokens = session.contextWindow || 0;
					const tokensSoFar = session.contextUsage || 0;
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
	expectedInputs: LanguageModelExpected[],
	expectedOutputs: LanguageModelExpected[],
	text: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
): ResultAsync<string, Error> {
	return withSession(
		expectedInputs,
		expectedOutputs,
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
