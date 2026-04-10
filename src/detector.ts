/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./detector-safe";
import type { DetectorInstance } from "./types";
import { okOrThrow } from "./utils";

/**
 * Initializes the Language Detector API by checking availability and triggering model download.
 * Returns an instance object with `.detect()` and `.createSession()` methods.
 *
 * @param options Optional options with expected input languages
 * @returns A DetectorInstance
 * @throws {Error} If initialization fails
 *
 * @example
 * const detector = await initDetector();
 * const detections = await detector.detect("Bonjour le monde");
 */
export async function initDetector(
	options?: LanguageDetectorCreateOptions,
): Promise<DetectorInstance> {
	const safeInstance = await Safe.initDetector(options);
	const safe = okOrThrow(safeInstance);

	return {
		detect: async (text, signal) => {
			const result = await safe.detect(text, signal);
			return okOrThrow(result);
		},
		createSession: async (createOptions) => {
			const result = await safe.createSession(createOptions);
			return okOrThrow(result);
		},
	};
}
