/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./summarizer-safe";
import { okOrThrow } from "./utils";

/**
 * Checks availability of the Summarizer API.
 * @throws {Error} If availability check fails
 */
export async function availability(
	options?: SummarizerCreateCoreOptions,
): Promise<Availability> {
	const result = await Safe.availability(options);
	return okOrThrow(result);
}

/**
 * Creates a reusable Summarizer instance.
 * The caller is responsible for calling `.destroy()` when done.
 * @throws {Error} If creation fails
 */
export async function create(
	options?: SummarizerCreateOptions,
): Promise<Summarizer> {
	const result = await Safe.create(options);
	return okOrThrow(result);
}

/**
 * One-shot summarize: creates a Summarizer, summarizes text, and destroys the instance.
 * @throws {Error} If summarization fails
 */
export async function summarize(
	text: string,
	createOptions?: SummarizerCreateOptions,
	summarizeOptions?: SummarizerSummarizeOptions,
): Promise<string> {
	const result = await Safe.summarize(text, createOptions, summarizeOptions);
	return okOrThrow(result);
}
