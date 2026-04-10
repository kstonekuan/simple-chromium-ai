/// <reference types="@types/dom-chromium-ai" />

import { errAsync, ResultAsync } from "neverthrow";
import type { SafeDetectorInstance } from "./types";
import { checkAvailability } from "./utils";

/**
 * Initializes the Language Detector API by checking availability and triggering model download.
 * Returns a safe instance object with `.detect()` and `.createSession()` methods.
 *
 * @param options Optional options with expected input languages
 * @returns A Result containing a SafeDetectorInstance or an Error
 *
 * @example
 * const result = await initDetector();
 * result.match(
 *   (detector) => detector.detect("Bonjour le monde"),
 *   (error) => console.error(error.message)
 * );
 */
export function initDetector(
	options?: LanguageDetectorCreateOptions,
): ResultAsync<SafeDetectorInstance, Error> {
	if (typeof LanguageDetector === "undefined") {
		return errAsync(
			new Error(
				"Language Detector API is not available in this browser. Ensure you are using Chrome 138+ or a supported Chromium-based browser.",
			),
		);
	}

	return checkAvailability(
		() => LanguageDetector.availability(options),
		"Language Detector",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				// Trigger actual model download
				const detector = await LanguageDetector.create(options);
				detector.destroy();

				const instance: SafeDetectorInstance = {
					detect: (text, signal) =>
						ResultAsync.fromPromise(
							(async () => {
								const d = await LanguageDetector.create(options);
								try {
									return await d.detect(text, signal ? { signal } : undefined);
								} finally {
									d.destroy();
								}
							})(),
							(error) =>
								error instanceof Error
									? error
									: new Error(`Language detection failed: ${String(error)}`),
						),
					createSession: (createOptions) =>
						ResultAsync.fromPromise(
							LanguageDetector.create(createOptions ?? options),
							(error) =>
								error instanceof Error
									? error
									: new Error(
											`Failed to create Language Detector session: ${String(error)}`,
										),
						),
				};

				return instance;
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(
							`Failed to initialize Language Detector: ${String(error)}`,
						),
		),
	);
}
