import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "simpleChromiumAI",
			fileName: "simple-chromium-ai",
		},
		rollupOptions: {
			output: {
				globals: {},
				exports: "named",
			},
		},
	},
});
