/// <reference types="@types/dom-chromium-ai" />

import { ResultAsync } from "neverthrow";
import * as Safe from "./prompt-safe";
import type {
	PromptCreateOptions,
	PromptInstance,
	PromptOptions,
} from "./types";
import { okOrThrow } from "./utils";

/**
 * Checks availability of the LanguageModel API.
 * @throws {Error} If availability check fails
 */
export async function availability(): Promise<Availability> {
	const result = await Safe.availability();
	return okOrThrow(result);
}

/**
 * Creates a reusable Prompt instance with bound configuration.
 * The returned instance has `.prompt()`, `.createSession()`, `.withSession()`,
 * and `.checkTokenUsage()` methods.
 *
 * @throws {Error} If creation fails
 *
 * @example
 * const ai = await Prompt.create({ systemPrompt: "You are a helpful assistant" });
 * const response = await ai.prompt("Write a haiku");
 * ai.destroy();
 */
export async function create(
	options?: PromptCreateOptions,
): Promise<PromptInstance> {
	const safeResult = await Safe.create(options);
	const safeInstance = okOrThrow(safeResult);

	return {
		systemPrompt: safeInstance.systemPrompt,
		instanceId: safeInstance.instanceId,
		expectedOutputLanguages: safeInstance.expectedOutputLanguages,

		async prompt(prompt: string, opts?: PromptOptions): Promise<string> {
			const result = await safeInstance.prompt(prompt, opts);
			return okOrThrow(result);
		},

		async createSession(
			opts?: LanguageModelCreateOptions,
		): Promise<LanguageModel> {
			const result = await safeInstance.createSession(opts);
			return okOrThrow(result);
		},

		async withSession<T>(
			callback: (session: LanguageModel) => Promise<T>,
			opts?: LanguageModelCreateOptions,
		): Promise<T> {
			const result = await safeInstance.withSession(
				(session) =>
					ResultAsync.fromPromise(callback(session), (error) =>
						error instanceof Error ? error : new Error(String(error)),
					),
				opts,
			);
			return okOrThrow(result);
		},

		async checkTokenUsage(prompt: string, opts?: LanguageModelCreateOptions) {
			const result = await safeInstance.checkTokenUsage(prompt, opts);
			return okOrThrow(result);
		},

		destroy() {
			safeInstance.destroy();
		},
	};
}

/**
 * One-shot prompt: creates a session, sends the prompt, and destroys the session.
 * @throws {Error} If the prompt fails
 *
 * @example
 * const response = await prompt("Write a haiku", { systemPrompt: "You are a poet" });
 */
export async function prompt(
	text: string,
	options?: PromptCreateOptions & PromptOptions,
): Promise<string> {
	const result = await Safe.prompt(text, options);
	return okOrThrow(result);
}
