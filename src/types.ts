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
 * Options for initializing the LanguageModel API.
 * Only includes fields that affect model availability and download,
 * not session behavior (system prompt, temperature, etc.).
 */
export interface LanguageModelInitOptions {
	expectedInputs?: LanguageModelExpected[];
	expectedOutputs?: LanguageModelExpected[];
	monitor?: CreateMonitorCallback;
	signal?: AbortSignal;
}

/**
 * An initialized LanguageModel instance with bound methods.
 * Returned by `initLanguageModel()`. The existence of this object
 * proves the model has been downloaded and is ready to use.
 */
export interface LanguageModelInstance {
	prompt(
		text: string,
		timeout?: number,
		promptOptions?: LanguageModelPromptOptions,
		sessionOptions?: LanguageModelCreateOptions,
	): Promise<string>;
	createSession(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
	withSession<T>(
		callback: (session: LanguageModel) => Promise<T>,
		options?: LanguageModelCreateOptions,
	): Promise<T>;
	checkTokenUsage(
		prompt: string,
		sessionOptions?: LanguageModelCreateOptions,
	): Promise<TokenUsageInfo>;
}

/**
 * An initialized Translator instance with bound methods.
 * Returned by `initTranslator()`. Locked to a specific language pair.
 */
export interface TranslatorInstance {
	translate(text: string, signal?: AbortSignal): Promise<string>;
	createSession(): Promise<Translator>;
	destroy(): void;
}

/**
 * An initialized LanguageDetector instance with bound methods.
 * Returned by `initDetector()`.
 */
export interface DetectorInstance {
	detect(
		text: string,
		signal?: AbortSignal,
	): Promise<LanguageDetectionResult[]>;
	createSession(
		options?: LanguageDetectorCreateOptions,
	): Promise<LanguageDetector>;
	destroy(): void;
}

/**
 * An initialized Summarizer instance with bound methods.
 * Returned by `initSummarizer()`.
 */
export interface SummarizerInstance {
	summarize(
		text: string,
		summarizeOptions?: SummarizerSummarizeOptions,
	): Promise<string>;
	createSession(): Promise<Summarizer>;
	destroy(): void;
}

/**
 * Safe variant of LanguageModelInstance where methods return ResultAsync.
 */
export interface SafeLanguageModelInstance {
	prompt(
		text: string,
		timeout?: number,
		promptOptions?: LanguageModelPromptOptions,
		sessionOptions?: LanguageModelCreateOptions,
	): ResultAsync<string, Error>;
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
}

/**
 * Safe variant of TranslatorInstance where methods return ResultAsync.
 */
export interface SafeTranslatorInstance {
	translate(text: string, signal?: AbortSignal): ResultAsync<string, Error>;
	createSession(): ResultAsync<Translator, Error>;
	destroy(): void;
}

/**
 * Safe variant of DetectorInstance where methods return ResultAsync.
 */
export interface SafeDetectorInstance {
	detect(
		text: string,
		signal?: AbortSignal,
	): ResultAsync<LanguageDetectionResult[], Error>;
	createSession(
		options?: LanguageDetectorCreateOptions,
	): ResultAsync<LanguageDetector, Error>;
	destroy(): void;
}

/**
 * Safe variant of SummarizerInstance where methods return ResultAsync.
 */
export interface SafeSummarizerInstance {
	summarize(
		text: string,
		summarizeOptions?: SummarizerSummarizeOptions,
	): ResultAsync<string, Error>;
	createSession(): ResultAsync<Summarizer, Error>;
	destroy(): void;
}

export type PromptResult = ResultAsync<string, Error>;

export type TranslateResult = ResultAsync<string, Error>;

export type DetectResult = ResultAsync<LanguageDetectionResult[], Error>;

export type SummarizeResult = ResultAsync<string, Error>;
