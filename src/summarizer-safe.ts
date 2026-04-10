/// <reference types="@types/dom-chromium-ai" />

import { errAsync, ResultAsync } from "neverthrow";
import type { SafeSummarizerInstance } from "./types";
import { checkAvailability } from "./utils";

/**
 * Initializes the Summarizer API by checking availability and triggering model download.
 * Returns a safe instance object with `.summarize()` and `.createSession()` methods.
 *
 * @param createOptions Optional creation options (type, format, length, sharedContext)
 * @returns A Result containing a SafeSummarizerInstance or an Error
 *
 * @example
 * const result = await initSummarizer({ type: "tldr" });
 * result.match(
 *   (summarizer) => summarizer.summarize("Long article..."),
 *   (error) => console.error(error.message)
 * );
 */
export function initSummarizer(
	createOptions?: SummarizerCreateOptions,
): ResultAsync<SafeSummarizerInstance, Error> {
	// Default outputLanguage to "en" if not specified
	const mergedOptions: SummarizerCreateOptions = {
		outputLanguage: "en",
		...createOptions,
	};

	if (typeof Summarizer === "undefined") {
		return errAsync(
			new Error(
				"Summarizer API is not available in this browser. Ensure you are using Chrome 138+ or a supported Chromium-based browser.",
			),
		);
	}

	return checkAvailability(
		() => Summarizer.availability(mergedOptions),
		"Summarizer",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				// Trigger actual model download (pass monitor/signal for download progress)
				const summarizer = await Summarizer.create(mergedOptions);
				summarizer.destroy();

				const instance: SafeSummarizerInstance = {
					summarize: (text, summarizeOptions) =>
						ResultAsync.fromPromise(
							(async () => {
								const s = await Summarizer.create(mergedOptions);
								try {
									return await s.summarize(text, summarizeOptions);
								} finally {
									s.destroy();
								}
							})(),
							(error) =>
								error instanceof Error
									? error
									: new Error(`Summarization failed: ${String(error)}`),
						),
					createSession: () =>
						ResultAsync.fromPromise(
							Summarizer.create(mergedOptions),
							(error) =>
								error instanceof Error
									? error
									: new Error(
											`Failed to create Summarizer session: ${String(error)}`,
										),
						),
				};

				return instance;
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Failed to initialize Summarizer: ${String(error)}`),
		),
	);
}
