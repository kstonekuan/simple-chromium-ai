/// <reference types="@types/dom-chromium-ai" />

/**
 * Custom error class for Chrome AI SDK errors
 */
export class ChromeAIError extends Error {
	constructor(
		message: string,
		public code:
			| "UNAVAILABLE"
			| "DOWNLOAD_FAILED"
			| "SESSION_FAILED"
			| "PROMPT_FAILED"
			| "TIMEOUT",
	) {
		super(message);
		this.name = "ChromeAIError";
	}
}

/**
 * Represents an initialized Chrome AI instance with a configured system prompt.
 * This object must be passed to all other SDK functions to ensure proper initialization.
 */
export interface ChromeAIInstance {
	/** The system prompt that will be used for all sessions created from this instance */
	readonly systemPrompt?: string;
	/** Unique identifier for this instance */
	readonly instanceId: string;
}

/**
 * Initializes Chrome AI and returns an instance object that must be used with all other functions.
 * This pattern ensures that the AI is properly initialized before use through TypeScript's type system.
 *
 * @param systemPrompt Optional system prompt that will be used for all sessions
 * @param onDownloadProgress Optional callback for download progress
 * @returns A ChromeAIInstance object or null if unavailable
 *
 * @example
 * // Basic initialization
 * const ai = await initializeChromeAI();
 * if (!ai) {
 *   console.error("Chrome AI is not available");
 *   return;
 * }
 *
 * // Now you can use the ai instance with other functions
 * const response = await singlePrompt(ai, "Hello!");
 *
 * @example
 * // With system prompt for consistent behavior
 * const ai = await initializeChromeAI(
 *   "You are a helpful assistant that provides concise answers."
 * );
 *
 * @example
 * // With download progress monitoring
 * const ai = await initializeChromeAI(
 *   undefined,
 *   (progress) => console.log(`Downloading: ${progress}%`)
 * );
 */
export async function initializeChromeAI(
	systemPrompt?: string,
	onDownloadProgress?: (progress: number) => void,
): Promise<ChromeAIInstance | null> {
	// Check if API exists
	if (typeof LanguageModel === "undefined") {
		const error = new ChromeAIError(
			"Chrome AI API is not available. Please ensure you're using Chrome 127+ or Edge 127+ with AI features enabled. See README for setup instructions.",
			"UNAVAILABLE",
		);
		console.error(error.message);
		return null;
	}

	// Check current availability
	let availability: Availability;
	try {
		availability = await LanguageModel.availability();
	} catch (error) {
		const aiError = new ChromeAIError(
			"Failed to check Chrome AI availability. The API may not be properly initialized.",
			"UNAVAILABLE",
		);
		console.error(aiError.message, error);
		return null;
	}

	if (availability === "unavailable") {
		const error = new ChromeAIError(
			"Chrome AI is not available on this device. This may be due to hardware limitations or missing components.",
			"UNAVAILABLE",
		);
		console.error(error.message);
		return null;
	}

	// If already available, return immediately
	if (availability === "available") {
		return {
			systemPrompt,
			instanceId: crypto.randomUUID(),
		};
	}

	// Trigger download by creating a temporary session
	try {
		const tempSession = await LanguageModel.create({
			monitor: onDownloadProgress
				? (m) => {
						m.addEventListener("downloadprogress", (e) => {
							onDownloadProgress(Math.round(e.loaded * 100));
						});
					}
				: undefined,
		});

		// Clean up the temporary session
		tempSession.destroy();

		// Verify it's now available
		try {
			const finalStatus = await LanguageModel.availability();
			if (finalStatus === "available") {
				return {
					systemPrompt,
					instanceId: crypto.randomUUID(),
				};
			}
		} catch (error) {
			const aiError = new ChromeAIError(
				"Failed to verify model availability after download.",
				"DOWNLOAD_FAILED",
			);
			console.error(aiError.message, error);
		}

		const downloadError = new ChromeAIError(
			"AI model download failed. Please check your internet connection and try again.",
			"DOWNLOAD_FAILED",
		);
		console.error(downloadError.message);
		return null;
	} catch (error) {
		const aiError = new ChromeAIError(
			`Failed to download AI model: ${error instanceof Error ? error.message : "Unknown error"}`,
			"DOWNLOAD_FAILED",
		);
		console.error(aiError.message, error);
		return null;
	}
}

/**
 * Performs a single prompt using the initialized Chrome AI instance.
 * The instance ensures the AI is properly initialized before use.
 *
 * @param instance The initialized Chrome AI instance from initializeChromeAI()
 * @param prompt The user's prompt
 * @param timeout Optional timeout in milliseconds
 * @param promptOptions Options for the prompt (signal, etc)
 * @param sessionOptions Additional session options (merged with instance system prompt)
 * @returns The AI's response, or null if failed
 *
 * @example
 * // Basic usage
 * const ai = await initializeChromeAI("You are a helpful assistant");
 * if (ai) {
 *   const response = await singlePrompt(ai, "What is TypeScript?");
 *   console.log(response);
 * }
 *
 * @example
 * // With timeout
 * const ai = await initializeChromeAI();
 * if (ai) {
 *   const response = await singlePrompt(ai, "Write a story", 5000);
 *   if (!response) {
 *     console.log("Request timed out");
 *   }
 * }
 *
 * @example
 * // With custom cancellation
 * const controller = new AbortController();
 * const response = await singlePrompt(
 *   ai,
 *   "Write a long story",
 *   undefined,
 *   { signal: controller.signal }
 * );
 * // Cancel with: controller.abort()
 *
 * @example
 * // With both timeout and custom cancellation (both will work)
 * const controller = new AbortController();
 * const response = await singlePrompt(
 *   ai,
 *   "Complex task",
 *   10000, // 10 second timeout
 *   { signal: controller.signal } // Can still manually abort before timeout
 * );
 *
 * @example
 * // With session options
 * const response = await singlePrompt(
 *   ai,
 *   "Be creative",
 *   undefined,
 *   undefined,
 *   { temperature: 0.8, topK: 40 }
 * );
 *
 * @example
 * // With timeout and options
 * const response = await singlePrompt(
 *   ai,
 *   "Quick summary",
 *   3000,
 *   undefined,
 *   { temperature: 0.3 }
 * );
 */
export async function singlePrompt(
	instance: ChromeAIInstance,
	prompt: string,
	timeout?: number,
	promptOptions?: LanguageModelPromptOptions,
	sessionOptions?: LanguageModelCreateOptions,
): Promise<string | null> {
	let session: LanguageModel | null = null;
	let timeoutId: NodeJS.Timeout | null = null;

	try {
		// Handle abort signals - combine timeout and user-provided signal if both exist
		let finalPromptOptions = promptOptions || {};
		if (timeout || finalPromptOptions.signal) {
			const signals: AbortSignal[] = [];
			
			// Add user-provided signal if it exists
			if (finalPromptOptions.signal) {
				signals.push(finalPromptOptions.signal);
			}
			
			// Add timeout signal if timeout is specified
			if (timeout) {
				const timeoutController = new AbortController();
				signals.push(timeoutController.signal);
				timeoutId = setTimeout(() => timeoutController.abort(), timeout);
			}
			
			// Combine signals using AbortSignal.any() if available, otherwise use the single signal
			if (signals.length > 1 && AbortSignal.any) {
				finalPromptOptions = { ...finalPromptOptions, signal: AbortSignal.any(signals) };
			} else if (signals.length === 1) {
				finalPromptOptions = { ...finalPromptOptions, signal: signals[0] };
			}
		}

		// Merge instance system prompt with session options
		const mergedOptions: LanguageModelCreateOptions = {
			...sessionOptions,
		};

		if (instance.systemPrompt) {
			const systemMessage: LanguageModelSystemMessage = {
				role: "system" as LanguageModelSystemMessageRole,
				content: instance.systemPrompt,
			};
			
			// Always use our system message as the first prompt
			mergedOptions.initialPrompts = [systemMessage];
			
			// If session options has initial prompts, append non-system messages
			if (sessionOptions?.initialPrompts && sessionOptions.initialPrompts.length > 0) {
				// Skip the first (system) message from sessionOptions and add the rest
				const nonSystemMessages = sessionOptions.initialPrompts.slice(1) as LanguageModelMessage[];
				if (nonSystemMessages.length > 0) {
					mergedOptions.initialPrompts = [systemMessage, ...nonSystemMessages];
				}
			}
		} else if (sessionOptions?.initialPrompts) {
			// No instance system prompt, use session options as is
			mergedOptions.initialPrompts = sessionOptions.initialPrompts;
		}

		// Create session
		session = await LanguageModel.create(mergedOptions);

		// Send prompt and return response
		return await session.prompt(prompt, finalPromptOptions);
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			console.info("AI prompt was cancelled by user");
			return null;
		}

		const aiError = new ChromeAIError(
			`AI prompt failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			"PROMPT_FAILED",
		);
		console.error(aiError.message, error);
		return null;
	} finally {
		// Always clean up
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		session?.destroy();
	}
}

/**
 * Creates a reusable AI session using the initialized Chrome AI instance.
 * The session will include the instance's system prompt automatically.
 *
 * @param instance The initialized Chrome AI instance from initializeChromeAI()
 * @param options Additional session options (merged with instance system prompt)
 * @returns Session object for multiple prompts, or null if failed
 *
 * @example
 * // Create a conversational session
 * const ai = await initializeChromeAI("You are a friendly chatbot");
 * if (ai) {
 *   const session = await createSession(ai);
 *   if (session) {
 *     try {
 *       const response1 = await session.prompt("Hello!");
 *       const response2 = await session.prompt("How are you?");
 *     } finally {
 *       session.destroy();
 *     }
 *   }
 * }
 *
 * @example
 * // With additional options
 * const ai = await initializeChromeAI();
 * if (ai) {
 *   const session = await createSession(ai, {
 *     temperature: 0.8,
 *     topK: 40
 *   });
 * }
 */
export async function createSession(
	instance: ChromeAIInstance,
	options?: LanguageModelCreateOptions,
): Promise<LanguageModel | null> {
	try {
		// Merge instance system prompt with session options
		const mergedOptions: LanguageModelCreateOptions = {
			...options,
		};

		if (instance.systemPrompt) {
			const systemMessage: LanguageModelSystemMessage = {
				role: "system" as LanguageModelSystemMessageRole,
				content: instance.systemPrompt,
			};
			
			// Always use our system message as the first prompt
			mergedOptions.initialPrompts = [systemMessage];
			
			// If options has initial prompts, append non-system messages
			if (options?.initialPrompts && options.initialPrompts.length > 0) {
				// Skip the first (system) message from options and add the rest
				const nonSystemMessages = options.initialPrompts.slice(1) as LanguageModelMessage[];
				if (nonSystemMessages.length > 0) {
					mergedOptions.initialPrompts = [systemMessage, ...nonSystemMessages];
				}
			}
		} else if (options?.initialPrompts) {
			// No instance system prompt, use options as is
			mergedOptions.initialPrompts = options.initialPrompts;
		}

		return await LanguageModel.create(mergedOptions);
	} catch (error) {
		const aiError = new ChromeAIError(
			`Failed to create AI session: ${error instanceof Error ? error.message : "Unknown error"}. This might be due to rate limiting or resource constraints.`,
			"SESSION_FAILED",
		);
		console.error(aiError.message, error);
		return null;
	}
}


/**
 * ChromeAI namespace containing all SDK functions for convenient access
 * @example
 * import ChromeAI from 'simple-chromium-ai';
 *
 * const ai = await ChromeAI.initialize("You are helpful");
 * if (ai) {
 *   const response = await ChromeAI.singlePrompt(ai, "Hello!");
 * }
 */
export const ChromeAI = {
	initialize: initializeChromeAI,
	singlePrompt,
	createSession,
	ChromeAIError,
};

// Default export for convenience
export default ChromeAI;
