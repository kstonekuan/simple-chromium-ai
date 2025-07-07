import ChromiumAI, { type ChromiumAIInstance } from "simple-chromium-ai";

const statusEl = document.getElementById("status") as HTMLDivElement;
const interfaceEl = document.getElementById("interface") as HTMLDivElement;
const inputEl = document.getElementById("input") as HTMLTextAreaElement;
const submitBtn = document.getElementById("submit") as HTMLButtonElement;
const responseEl = document.getElementById("response") as HTMLPreElement;

let ai: ChromiumAIInstance | null = null;

// Initialize Chrome AI using Safe API
async function init() {
	const result = await ChromiumAI.Safe.initialize(
		"You are a helpful assistant",
	);

	result.match(
		(instance) => {
			ai = instance;
			if (statusEl) statusEl.textContent = "Chrome AI is ready!";
			if (interfaceEl) interfaceEl.style.display = "block";
		},
		(error) => {
			if (statusEl) statusEl.innerHTML = error.message.replace(/\n/g, "<br>");
		},
	);
}

// Handle submit
submitBtn?.addEventListener("click", async () => {
	const prompt = inputEl?.value.trim();
	if (!prompt || !ai) return;

	submitBtn.disabled = true;
	if (responseEl) responseEl.textContent = "Processing...";

	const result = await ChromiumAI.Safe.prompt(ai, prompt);

	result.match(
		(response) => {
			if (responseEl) responseEl.textContent = response;
		},
		(error) => {
			if (responseEl) responseEl.textContent = `Error: ${error.message}`;
		},
	);

	submitBtn.disabled = false;
});

init();
