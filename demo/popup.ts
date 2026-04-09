import ChromiumAI, {
	type DetectorInstance,
	type LanguageModelInstance,
	type SummarizerInstance,
	type TranslatorInstance,
} from "simple-chromium-ai";

const statusEl = document.getElementById("status") as HTMLDivElement;
const interfaceEl = document.getElementById("interface") as HTMLDivElement;
const apiSelect = document.getElementById("api-select") as HTMLSelectElement;
const submitBtn = document.getElementById("submit") as HTMLButtonElement;
const responseEl = document.getElementById("response") as HTMLPreElement;

// Prompt elements
const inputPrompt = document.getElementById(
	"input-prompt",
) as HTMLTextAreaElement;

// Translate elements
const sourceLang = document.getElementById("source-lang") as HTMLInputElement;
const targetLang = document.getElementById("target-lang") as HTMLInputElement;
const inputTranslate = document.getElementById(
	"input-translate",
) as HTMLTextAreaElement;

// Detect elements
const inputDetect = document.getElementById(
	"input-detect",
) as HTMLTextAreaElement;

// Summarize elements
const summaryType = document.getElementById(
	"summary-type",
) as HTMLSelectElement;
const summaryLength = document.getElementById(
	"summary-length",
) as HTMLSelectElement;
const inputSummarize = document.getElementById(
	"input-summarize",
) as HTMLTextAreaElement;

// Sections
const sections: Record<string, HTMLElement | null> = {
	prompt: document.getElementById("section-prompt"),
	translate: document.getElementById("section-translate"),
	detect: document.getElementById("section-detect"),
	summarize: document.getElementById("section-summarize"),
};

let ai: LanguageModelInstance | null = null;
let translator: TranslatorInstance | null = null;
let detector: DetectorInstance | null = null;
let summarizer: SummarizerInstance | null = null;

// Toggle visible section based on dropdown
apiSelect?.addEventListener("change", () => {
	for (const [key, el] of Object.entries(sections)) {
		if (el) el.style.display = key === apiSelect.value ? "block" : "none";
	}
	if (responseEl) responseEl.textContent = "";
});

// Track the language pair the translator was initialized with
let translatorSourceLang = "";
let translatorTargetLang = "";

// Track the summarizer options it was initialized with
let summarizerType = "";
let summarizerLength = "";

// Initialize APIs (except translator, which inits on first translate)
async function init() {
	if (statusEl) statusEl.textContent = "Initializing APIs...";

	try {
		const [aiResult, detectorResult] = await Promise.allSettled([
			ChromiumAI.initLanguageModel("You are a helpful assistant"),
			ChromiumAI.initDetector(),
		]);

		if (aiResult.status === "fulfilled") ai = aiResult.value;
		if (detectorResult.status === "fulfilled") detector = detectorResult.value;

		if (statusEl) statusEl.textContent = "Chrome AI is ready!";
		if (interfaceEl) interfaceEl.style.display = "block";
	} catch (error) {
		if (statusEl)
			statusEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

async function handlePrompt() {
	const text = inputPrompt?.value.trim();
	if (!text || !ai) return;

	try {
		const response = await ai.prompt(text);
		if (responseEl) responseEl.textContent = response;
	} catch (error) {
		if (responseEl)
			responseEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

async function handleTranslate() {
	const text = inputTranslate?.value.trim();
	if (!text) return;

	try {
		// Re-init translator if language pair changed or not yet initialized
		if (
			!translator ||
			translatorSourceLang !== sourceLang.value ||
			translatorTargetLang !== targetLang.value
		) {
			translatorSourceLang = sourceLang.value;
			translatorTargetLang = targetLang.value;
			translator = await ChromiumAI.initTranslator({
				sourceLanguage: translatorSourceLang,
				targetLanguage: translatorTargetLang,
			});
		}
		const translated = await translator.translate(text);
		if (responseEl) responseEl.textContent = translated;
	} catch (error) {
		if (responseEl)
			responseEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

async function handleDetect() {
	const text = inputDetect?.value.trim();
	if (!text || !detector) return;

	try {
		const detections = await detector.detect(text);
		if (responseEl) {
			responseEl.textContent = detections
				.map(
					(d) =>
						`${d.detectedLanguage}: ${((d.confidence ?? 0) * 100).toFixed(1)}%`,
				)
				.join("\n");
		}
	} catch (error) {
		if (responseEl)
			responseEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

async function handleSummarize() {
	const text = inputSummarize?.value.trim();
	if (!text) return;

	try {
		// Re-init summarizer if type or length changed or not yet initialized
		if (
			!summarizer ||
			summarizerType !== summaryType.value ||
			summarizerLength !== summaryLength.value
		) {
			summarizerType = summaryType.value;
			summarizerLength = summaryLength.value;
			summarizer = await ChromiumAI.initSummarizer({
				type: summarizerType as "tldr" | "key-points" | "teaser" | "headline",
				length: summarizerLength as "short" | "medium" | "long",
			});
		}
		const summary = await summarizer.summarize(text);
		if (responseEl) responseEl.textContent = summary;
	} catch (error) {
		if (responseEl)
			responseEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

// Handle submit
submitBtn?.addEventListener("click", async () => {
	submitBtn.disabled = true;
	if (responseEl) responseEl.textContent = "Processing...";

	switch (apiSelect.value) {
		case "prompt":
			await handlePrompt();
			break;
		case "translate":
			await handleTranslate();
			break;
		case "detect":
			await handleDetect();
			break;
		case "summarize":
			await handleSummarize();
			break;
	}

	submitBtn.disabled = false;
});

init();
