/// <reference types="@types/dom-chromium-ai" />

import type { ResultAsync } from "neverthrow";

/**
 * Information about token usage for a prompt
 */
export interface TokenUsageInfo {
	promptTokens: number;
	maxTokens: number;
	tokensSoFar: number;
	tokensAvailable: number;
	willFit: boolean;
}

/**
 * Options for creating a Prompt instance
 */
export interface PromptCreateOptions {
	systemPrompt?: string;
	expectedOutputLanguages?: string[];
}

/**
 * Options for prompting
 */
export interface PromptOptions {
	timeout?: number;
	promptOptions?: LanguageModelPromptOptions;
	sessionOptions?: LanguageModelCreateOptions;
}

/**
 * A Prompt instance with bound configuration.
 * Created via `Prompt.create()`.
 */
export interface PromptInstance {
	readonly systemPrompt?: string;
	readonly instanceId: string;
	readonly expectedOutputLanguages?: string[];
	prompt(prompt: string, options?: PromptOptions): Promise<string>;
	createSession(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
	withSession<T>(
		callback: (session: LanguageModel) => Promise<T>,
		options?: LanguageModelCreateOptions,
	): Promise<T>;
	checkTokenUsage(
		prompt: string,
		sessionOptions?: LanguageModelCreateOptions,
	): Promise<TokenUsageInfo>;
	destroy(): void;
}

/**
 * A safe Prompt instance where methods return ResultAsync instead of throwing.
 * Created via `Prompt.Safe.create()`.
 */
export interface SafePromptInstance {
	readonly systemPrompt?: string;
	readonly instanceId: string;
	readonly expectedOutputLanguages?: string[];
	prompt(prompt: string, options?: PromptOptions): PromptResult;
	createSession(
		options?: LanguageModelCreateOptions,
	): ResultAsync<LanguageModel, Error>;
	withSession<T>(
		callback: (session: LanguageModel) => ResultAsync<T, Error>,
		options?: LanguageModelCreateOptions,
	): ResultAsync<T, Error>;
	checkTokenUsage(
		prompt: string,
		sessionOptions?: LanguageModelCreateOptions,
	): ResultAsync<TokenUsageInfo, Error>;
	destroy(): void;
}

export type PromptResult = ResultAsync<string, Error>;

export type TranslateResult = ResultAsync<string, Error>;

export type DetectResult = ResultAsync<LanguageDetectionResult[], Error>;

export type SummarizeResult = ResultAsync<string, Error>;
