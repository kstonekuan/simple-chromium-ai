import { crx } from "@crxjs/vite-plugin";
import { defineConfig, type Plugin } from "vite";
import manifest from "./manifest.json";

// Chrome extensions serve local files without MIME headers;
// the crossorigin attribute forces a CORS fetch that breaks module loading.
function stripCrossorigin(): Plugin {
	return {
		name: "strip-crossorigin",
		enforce: "post",
		transformIndexHtml(html) {
			return html.replace(/ crossorigin/g, "");
		},
	};
}

export default defineConfig({
	base: "",
	plugins: [crx({ manifest }), stripCrossorigin()],
});
