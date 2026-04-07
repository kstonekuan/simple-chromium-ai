/// <reference types="@types/dom-chromium-ai" />

import { ResultAsync } from "neverthrow";
import type { DetectResult } from "./types";
import { checkAvailability } from "./utils";

/**
 * Checks availability of the Language Detector API.
 * Returns a Result containing the availability status.
 *
 * @param options Optional options with expected input languages
 * @returns A Result containing the Availability status or an Error
 */
export function availability(
	options?: LanguageDetectorCreateCoreOptions,
): ResultAsync<Availability, Error> {
	return ResultAsync.fromPromise(
		LanguageDetector.availability(options),
		(error) =>
			error instanceof Error
				? error
				: new Error(
						`Failed to check Language Detector availability: ${String(error)}`,
					),
	);
}

/**
 * Creates a reusable LanguageDetector instance.
 * The caller is responsible for calling `.destroy()` when done.
 *
 * @param options Optional creation options
 * @returns A Result containing a LanguageDetector instance or an Error
 */
export function create(
	options?: LanguageDetectorCreateOptions,
): ResultAsync<LanguageDetector, Error> {
	return checkAvailability(
		() => LanguageDetector.availability(options),
		"Language Detector",
	).andThen(() =>
		ResultAsync.fromPromise(LanguageDetector.create(options), (error) =>
			error instanceof Error
				? error
				: new Error(`Failed to create Language Detector: ${String(error)}`),
		),
	);
}

/**
 * One-shot detect: creates a LanguageDetector, detects language, and destroys the instance.
 *
 * @param text The text to detect the language of
 * @param options Optional creation options with expected input languages
 * @param signal Optional AbortSignal for cancellation
 * @returns A Result containing an array of detection results or an Error
 */
export function detect(
	text: string,
	options?: LanguageDetectorCreateCoreOptions,
	signal?: AbortSignal,
): DetectResult {
	return checkAvailability(
		() => LanguageDetector.availability(options),
		"Language Detector",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				const detector = await LanguageDetector.create(options);
				try {
					return await detector.detect(text, signal ? { signal } : undefined);
				} finally {
					detector.destroy();
				}
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Language detection failed: ${String(error)}`),
		),
	);
}
