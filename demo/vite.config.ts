import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function copyStatic(): Plugin {
	return {
		name: "copy-static",
		writeBundle() {
			copyFileSync(
				resolve(__dirname, "manifest.json"),
				resolve(__dirname, "dist/manifest.json"),
			);
			copyFileSync(
				resolve(__dirname, "popup.html"),
				resolve(__dirname, "dist/popup.html"),
			);
		},
	};
}

export default defineConfig({
	plugins: [copyStatic()],
	build: {
		outDir: "dist",
		lib: {
			entry: resolve(__dirname, "popup.ts"),
			name: "popup",
			formats: ["iife"],
			fileName: () => "popup.js",
		},
	},
});
