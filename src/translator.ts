/// <reference types="@types/dom-chromium-ai" />

import * as Safe from "./translator-safe";
import { okOrThrow } from "./utils";

/**
 * Checks availability of the Translator API for the given language pair.
 * @throws {Error} If availability check fails
 */
export async function availability(
	options: TranslatorCreateCoreOptions,
): Promise<Availability> {
	const result = await Safe.availability(options);
	return okOrThrow(result);
}

/**
 * Creates a reusable Translator instance.
 * The caller is responsible for calling `.destroy()` when done.
 * @throws {Error} If creation fails
 */
export async function create(
	options: TranslatorCreateOptions,
): Promise<Translator> {
	const result = await Safe.create(options);
	return okOrThrow(result);
}

/**
 * One-shot translate: creates a Translator, translates text, and destroys the instance.
 * @throws {Error} If translation fails
 */
export async function translate(
	text: string,
	options: TranslatorCreateCoreOptions,
	signal?: AbortSignal,
): Promise<string> {
	const result = await Safe.translate(text, options, signal);
	return okOrThrow(result);
}
