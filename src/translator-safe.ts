/// <reference types="@types/dom-chromium-ai" />

import { errAsync, ResultAsync } from "neverthrow";
import type { SafeTranslatorInstance } from "./types";
import { checkAvailability } from "./utils";

/**
 * Initializes the Translator API for a specific language pair by checking
 * availability and triggering model download.
 * Returns a safe instance object with `.translate()` and `.createSession()` methods.
 *
 * @param options Language pair options (sourceLanguage, targetLanguage)
 * @returns A Result containing a SafeTranslatorInstance or an Error
 *
 * @example
 * const result = await initTranslator({ sourceLanguage: "en", targetLanguage: "es" });
 * result.match(
 *   (translator) => translator.translate("Hello"),
 *   (error) => console.error(error.message)
 * );
 */
export function initTranslator(
	options: TranslatorCreateCoreOptions,
): ResultAsync<SafeTranslatorInstance, Error> {
	if (typeof Translator === "undefined") {
		return errAsync(
			new Error(
				"Translator API is not available in this browser. Ensure you are using Chrome 138+ or a supported Chromium-based browser.",
			),
		);
	}

	return checkAvailability(
		() => Translator.availability(options),
		"Translator",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				// Trigger actual model download
				const translator = await Translator.create(options);
				translator.destroy();

				const instance: SafeTranslatorInstance = {
					translate: (text, signal) =>
						ResultAsync.fromPromise(
							(async () => {
								const t = await Translator.create(options);
								try {
									return await t.translate(
										text,
										signal ? { signal } : undefined,
									);
								} finally {
									t.destroy();
								}
							})(),
							(error) =>
								error instanceof Error
									? error
									: new Error(`Translation failed: ${String(error)}`),
						),
					createSession: () =>
						ResultAsync.fromPromise(Translator.create(options), (error) =>
							error instanceof Error
								? error
								: new Error(
										`Failed to create Translator session: ${String(error)}`,
									),
						),
				};

				return instance;
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Failed to initialize Translator: ${String(error)}`),
		),
	);
}
