/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./translator-safe";
import type { TranslatorInstance } from "./types";
import { okOrThrow } from "./utils";

/**
 * Initializes the Translator API for a specific language pair by checking
 * availability and triggering model download.
 * Returns an instance object with `.translate()` and `.createSession()` methods.
 *
 * @param options Language pair options (sourceLanguage, targetLanguage)
 * @returns A TranslatorInstance
 * @throws {Error} If initialization fails
 *
 * @example
 * const translator = await initTranslator({ sourceLanguage: "en", targetLanguage: "es" });
 * const translated = await translator.translate("Hello");
 */
export async function initTranslator(
	options: TranslatorCreateOptions,
): Promise<TranslatorInstance> {
	const safeInstance = await Safe.initTranslator(options);
	const safe = okOrThrow(safeInstance);

	return {
		translate: async (text, signal) => {
			const result = await safe.translate(text, signal);
			return okOrThrow(result);
		},
		createSession: async () => {
			const result = await safe.createSession();
			return okOrThrow(result);
		},
		destroy: () => safe.destroy(),
	};
}
