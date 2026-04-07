import ChromiumAI, { type SafePromptInstance } from "simple-chromium-ai";

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

let ai: SafePromptInstance | null = null;

// Toggle visible section based on dropdown
apiSelect?.addEventListener("change", () => {
	for (const [key, el] of Object.entries(sections)) {
		if (el) el.style.display = key === apiSelect.value ? "block" : "none";
	}
	if (responseEl) responseEl.textContent = "";
});

// Initialize Chrome AI for Prompt API
async function init() {
	const result = await ChromiumAI.Safe.Prompt.create({
		systemPrompt: "You are a helpful assistant",
	});

	result.match(
		(instance) => {
			ai = instance;
			if (statusEl) statusEl.textContent = "Chrome AI is ready!";
			if (interfaceEl) interfaceEl.style.display = "block";
		},
		(error) => {
			if (statusEl) statusEl.textContent = `Error: ${error.message}`;
		},
	);
}

async function handlePrompt() {
	const text = inputPrompt?.value.trim();
	if (!text || !ai) return;

	const result = await ai.prompt(text);
	result.match(
		(response) => {
			if (responseEl) responseEl.textContent = response;
		},
		(error) => {
			if (responseEl) responseEl.textContent = `Error: ${error.message}`;
		},
	);
}

async function handleTranslate() {
	const text = inputTranslate?.value.trim();
	if (!text) return;

	const result = await ChromiumAI.Safe.Translator.translate(text, {
		sourceLanguage: sourceLang.value,
		targetLanguage: targetLang.value,
	});
	result.match(
		(translated) => {
			if (responseEl) responseEl.textContent = translated;
		},
		(error) => {
			if (responseEl) responseEl.textContent = `Error: ${error.message}`;
		},
	);
}

async function handleDetect() {
	const text = inputDetect?.value.trim();
	if (!text) return;

	const result = await ChromiumAI.Safe.Detector.detect(text);
	result.match(
		(detections) => {
			if (responseEl) {
				responseEl.textContent = detections
					.map(
						(d) =>
							`${d.detectedLanguage}: ${((d.confidence ?? 0) * 100).toFixed(1)}%`,
					)
					.join("\n");
			}
		},
		(error) => {
			if (responseEl) responseEl.textContent = `Error: ${error.message}`;
		},
	);
}

async function handleSummarize() {
	const text = inputSummarize?.value.trim();
	if (!text) return;

	const result = await ChromiumAI.Safe.Summarizer.summarize(text, {
		type: summaryType.value as SummarizerType,
		length: summaryLength.value as SummarizerLength,
	});
	result.match(
		(summary) => {
			if (responseEl) responseEl.textContent = summary;
		},
		(error) => {
			if (responseEl) responseEl.textContent = `Error: ${error.message}`;
		},
	);
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
