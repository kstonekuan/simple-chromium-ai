/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./detector-safe";
import { okOrThrow } from "./utils";

/**
 * Checks availability of the Language Detector API.
 * @throws {Error} If availability check fails
 */
export async function availability(
	options?: LanguageDetectorCreateCoreOptions,
): Promise<Availability> {
	const result = await Safe.availability(options);
	return okOrThrow(result);
}

/**
 * Creates a reusable LanguageDetector instance.
 * The caller is responsible for calling `.destroy()` when done.
 * @throws {Error} If creation fails
 */
export async function create(
	options?: LanguageDetectorCreateOptions,
): Promise<LanguageDetector> {
	const result = await Safe.create(options);
	return okOrThrow(result);
}

/**
 * One-shot detect: creates a LanguageDetector, detects language, and destroys the instance.
 * @throws {Error} If detection fails
 */
export async function detect(
	text: string,
	options?: LanguageDetectorCreateCoreOptions,
	signal?: AbortSignal,
): Promise<LanguageDetectionResult[]> {
	const result = await Safe.detect(text, options, signal);
	return okOrThrow(result);
}
