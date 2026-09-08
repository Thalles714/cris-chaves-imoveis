import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		watch: {
			ignored: [/[\\/]app-scaffold(?:2)?[\\/]/u, /[\\/]\.cache[\\/]/u],
		},
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
});
