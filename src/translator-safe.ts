/// <reference types="@types/dom-chromium-ai" />

import { ResultAsync } from "neverthrow";
import type { TranslateResult } from "./types";
import { checkAvailability } from "./utils";

/**
 * Checks availability of the Translator API for the given language pair.
 * Returns a Result containing the availability status.
 *
 * @param options Language pair options (sourceLanguage, targetLanguage)
 * @returns A Result containing the Availability status or an Error
 */
export function availability(
	options: TranslatorCreateCoreOptions,
): ResultAsync<Availability, Error> {
	return ResultAsync.fromPromise(Translator.availability(options), (error) =>
		error instanceof Error
			? error
			: new Error(`Failed to check Translator availability: ${String(error)}`),
	);
}

/**
 * Creates a reusable Translator instance.
 * The caller is responsible for calling `.destroy()` when done.
 *
 * @param options Translator creation options including language pair
 * @returns A Result containing a Translator instance or an Error
 */
export function create(
	options: TranslatorCreateOptions,
): ResultAsync<Translator, Error> {
	return checkAvailability(
		() => Translator.availability(options),
		"Translator",
	).andThen(() =>
		ResultAsync.fromPromise(Translator.create(options), (error) =>
			error instanceof Error
				? error
				: new Error(`Failed to create Translator: ${String(error)}`),
		),
	);
}

/**
 * One-shot translate: creates a Translator, translates text, and destroys the instance.
 *
 * @param text The text to translate
 * @param options Language pair options (sourceLanguage, targetLanguage)
 * @param signal Optional AbortSignal for cancellation
 * @returns A Result containing the translated text or an Error
 */
export function translate(
	text: string,
	options: TranslatorCreateCoreOptions,
	signal?: AbortSignal,
): TranslateResult {
	return checkAvailability(
		() => Translator.availability(options),
		"Translator",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				const translator = await Translator.create(options);
				try {
					return await translator.translate(
						text,
						signal ? { signal } : undefined,
					);
				} finally {
					translator.destroy();
				}
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Translation failed: ${String(error)}`),
		),
	);
}
