/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./summarizer-safe";
import type { SummarizerInstance } from "./types";
import { okOrThrow } from "./utils";

/**
 * Initializes the Summarizer API by checking availability and triggering model download.
 * Returns an instance object with `.summarize()` and `.createSession()` methods.
 *
 * @param createOptions Optional creation options (type, format, length, sharedContext)
 * @returns A SummarizerInstance
 * @throws {Error} If initialization fails
 *
 * @example
 * const summarizer = await initSummarizer({ type: "tldr" });
 * const summary = await summarizer.summarize("Long article...");
 */
export async function initSummarizer(
	createOptions?: SummarizerCreateOptions,
): Promise<SummarizerInstance> {
	const safeInstance = await Safe.initSummarizer(createOptions);
	const safe = okOrThrow(safeInstance);

	return {
		summarize: async (text, summarizeOptions) => {
			const result = await safe.summarize(text, summarizeOptions);
			return okOrThrow(result);
		},
		createSession: async () => {
			const result = await safe.createSession();
			return okOrThrow(result);
		},
	};
}
