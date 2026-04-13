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

// Monitor callback to show download progress in status
function createMonitor(label: string): CreateMonitorCallback {
	return (monitor) => {
		monitor.addEventListener("downloadprogress", (e) => {
			const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
			if (statusEl)
				statusEl.textContent = `${label}: downloading model ${pct}%`;
		});
	};
}

// Lazy-init APIs on dropdown selection
async function initForSelection(api: string) {
	try {
		switch (api) {
			case "prompt":
				if (!ai) {
					if (statusEl) statusEl.textContent = "Initializing Prompt API...";
					ai = await ChromiumAI.initLanguageModel({
						monitor: createMonitor("Prompt API"),
					});
				}
				if (statusEl) statusEl.textContent = "Prompt API ready!";
				break;
			case "detect":
				if (!detector) {
					if (statusEl)
						statusEl.textContent = "Initializing Language Detector...";
					detector = await ChromiumAI.initDetector({
						monitor: createMonitor("Language Detector"),
					});
				}
				if (statusEl) statusEl.textContent = "Language Detector ready!";
				break;
			case "translate":
				await initTranslatorIfNeeded();
				break;
			case "summarize":
				await initSummarizerIfNeeded();
				break;
		}
	} catch (error) {
		if (statusEl)
			statusEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}
}

// Toggle visible section and lazy-init on dropdown change
apiSelect?.addEventListener("change", () => {
	for (const [key, el] of Object.entries(sections)) {
		if (el) el.style.display = key === apiSelect.value ? "block" : "none";
	}
	if (responseEl) responseEl.textContent = "";
	initForSelection(apiSelect.value);
});

// Track the language pair the translator was initialized with
let translatorSourceLang = "";
let translatorTargetLang = "";

// Track the summarizer options it was initialized with
let summarizerType = "";
let summarizerLength = "";

async function initTranslatorIfNeeded() {
	if (
		!translator ||
		translatorSourceLang !== sourceLang.value ||
		translatorTargetLang !== targetLang.value
	) {
		if (translator) translator.destroy();
		if (statusEl) statusEl.textContent = "Initializing Translator...";
		translatorSourceLang = sourceLang.value;
		translatorTargetLang = targetLang.value;
		translator = await ChromiumAI.initTranslator({
			sourceLanguage: translatorSourceLang,
			targetLanguage: translatorTargetLang,
			monitor: createMonitor("Translator"),
		});
	}
	if (statusEl) statusEl.textContent = "Translator ready!";
}

async function initSummarizerIfNeeded() {
	if (
		!summarizer ||
		summarizerType !== summaryType.value ||
		summarizerLength !== summaryLength.value
	) {
		if (summarizer) summarizer.destroy();
		if (statusEl) statusEl.textContent = "Initializing Summarizer...";
		summarizerType = summaryType.value;
		summarizerLength = summaryLength.value;
		summarizer = await ChromiumAI.initSummarizer({
			type: summarizerType as "tldr" | "key-points" | "teaser" | "headline",
			length: summarizerLength as "short" | "medium" | "long",
			monitor: createMonitor("Summarizer"),
		});
	}
	if (statusEl) statusEl.textContent = "Summarizer ready!";
}

// Re-init translator/summarizer reactively when config fields change
for (const el of [sourceLang, targetLang]) {
	el?.addEventListener("change", () => {
		if (apiSelect.value === "translate") initTranslatorIfNeeded();
	});
}
for (const el of [summaryType, summaryLength]) {
	el?.addEventListener("change", () => {
		if (apiSelect.value === "summarize") initSummarizerIfNeeded();
	});
}

async function handlePrompt() {
	const text = inputPrompt?.value.trim();
	if (!text) return;

	if (!ai) {
		if (statusEl) statusEl.textContent = "Initializing Prompt API...";
		ai = await ChromiumAI.initLanguageModel({
			monitor: createMonitor("Prompt API"),
		});
		if (statusEl) statusEl.textContent = "Prompt API ready!";
	}

	const response = await ai.prompt(text, undefined, undefined, {
		initialPrompts: [
			{ role: "system", content: "You are a helpful assistant." },
		],
	});
	if (responseEl) responseEl.textContent = response;
}

async function handleTranslate() {
	const text = inputTranslate?.value.trim();
	if (!text) return;

	await initTranslatorIfNeeded();
	if (!translator) return;
	const translated = await translator.translate(text);
	if (responseEl) responseEl.textContent = translated;
}

async function handleDetect() {
	const text = inputDetect?.value.trim();
	if (!text) return;

	if (!detector) {
		if (statusEl) statusEl.textContent = "Initializing Language Detector...";
		detector = await ChromiumAI.initDetector({
			monitor: createMonitor("Language Detector"),
		});
		if (statusEl) statusEl.textContent = "Language Detector ready!";
	}

	const detections = await detector.detect(text);
	if (responseEl) {
		responseEl.textContent = detections
			.map(
				(d) =>
					`${d.detectedLanguage}: ${((d.confidence ?? 0) * 100).toFixed(1)}%`,
			)
			.join("\n");
	}
}

async function handleSummarize() {
	const text = inputSummarize?.value.trim();
	if (!text) return;

	await initSummarizerIfNeeded();
	if (!summarizer) return;
	const summary = await summarizer.summarize(text);
	if (responseEl) responseEl.textContent = summary;
}

// Handle submit
submitBtn?.addEventListener("click", async () => {
	submitBtn.disabled = true;
	if (responseEl) responseEl.textContent = "Processing...";

	try {
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
	} catch (error) {
		if (responseEl)
			responseEl.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
	}

	submitBtn.disabled = false;
});

// Show interface immediately — init is lazy
if (interfaceEl) interfaceEl.style.display = "block";
if (statusEl) statusEl.textContent = "Select an API to get started";

// Init for the default selection (prompt)
initForSelection(apiSelect.value);
