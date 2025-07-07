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
 * Represents an initialized Chromium AI instance with a configured system prompt.
 * This object must be passed to all other SDK functions to ensure proper initialization.
 */
export interface ChromiumAIInstance {
	/** The system prompt that will be used for all sessions created from this instance */
	readonly systemPrompt?: string;
	/** Unique identifier for this instance */
	readonly instanceId: string;
}

export type PromptResult = ResultAsync<string, Error>;
