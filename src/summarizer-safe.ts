/// <reference types="@types/dom-chromium-ai" />

import { ResultAsync } from "neverthrow";
import type { CheckInputUsageResult, SummarizeResult } from "./types";
import { checkAvailability } from "./utils";

/**
 * Checks availability of the Summarizer API.
 * Returns a Result containing the availability status.
 *
 * @param options Optional options for type, format, length, etc.
 * @returns A Result containing the Availability status or an Error
 */
export function availability(
	options?: SummarizerCreateCoreOptions,
): ResultAsync<Availability, Error> {
	return ResultAsync.fromPromise(Summarizer.availability(options), (error) =>
		error instanceof Error
			? error
			: new Error(`Failed to check Summarizer availability: ${String(error)}`),
	);
}

/**
 * Creates a reusable Summarizer instance.
 * The caller is responsible for calling `.destroy()` when done.
 *
 * @param options Optional creation options (type, format, length, sharedContext)
 * @returns A Result containing a Summarizer instance or an Error
 */
export function create(
	options?: SummarizerCreateOptions,
): ResultAsync<Summarizer, Error> {
	return checkAvailability(
		() => Summarizer.availability(options),
		"Summarizer",
	).andThen(() =>
		ResultAsync.fromPromise(Summarizer.create(options), (error) =>
			error instanceof Error
				? error
				: new Error(`Failed to create Summarizer: ${String(error)}`),
		),
	);
}

/**
 * One-shot summarize: creates a Summarizer, summarizes text, and destroys the instance.
 *
 * @param text The text to summarize
 * @param createOptions Optional creation options (type, format, length, sharedContext)
 * @param summarizeOptions Optional options for the summarize call (context, signal)
 * @returns A Result containing the summary or an Error
 */
export function summarize(
	text: string,
	createOptions?: SummarizerCreateOptions,
	summarizeOptions?: SummarizerSummarizeOptions,
): SummarizeResult {
	return checkAvailability(
		() => Summarizer.availability(createOptions),
		"Summarizer",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				const summarizer = await Summarizer.create(createOptions);
				try {
					return await summarizer.summarize(text, summarizeOptions);
				} finally {
					summarizer.destroy();
				}
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Summarization failed: ${String(error)}`),
		),
	);
}

/**
 * Checks input usage for a summarization request without performing it.
 * Creates a temporary Summarizer instance to measure the input, then destroys it.
 *
 * @param input The text to measure
 * @param createOptions Optional creation options (type, format, length, sharedContext)
 * @param summarizeOptions Optional options for the measurement (context, signal)
 * @returns A Result containing input usage information or an Error
 */
export function checkInputUsage(
	input: string,
	createOptions?: SummarizerCreateOptions,
	summarizeOptions?: SummarizerSummarizeOptions,
): CheckInputUsageResult {
	return checkAvailability(
		() => Summarizer.availability(createOptions),
		"Summarizer",
	).andThen(() =>
		ResultAsync.fromPromise(
			(async () => {
				const summarizer = await Summarizer.create(createOptions);
				try {
					const inputUsage = await summarizer.measureInputUsage(
						input,
						summarizeOptions,
					);
					const inputQuota = summarizer.inputQuota || 0;
					return { inputUsage, inputQuota, willFit: inputUsage <= inputQuota };
				} finally {
					summarizer.destroy();
				}
			})(),
			(error) =>
				error instanceof Error
					? error
					: new Error(`Failed to check input usage: ${String(error)}`),
		),
	);
}
