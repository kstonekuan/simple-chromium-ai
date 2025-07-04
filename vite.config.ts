import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	plugins: [
		dts({
			insertTypesEntry: true,
			rollupTypes: true,
		}),
	],
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
