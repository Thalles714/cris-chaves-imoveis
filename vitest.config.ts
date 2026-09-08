import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./app", import.meta.url)),
		},
	},
	test: {
		coverage: {
			exclude: [
				"app/**/+types/**",
				"app/**/*.d.ts",
				"app/entry.server.tsx",
				"workers/**",
			],
			provider: "v8",
			reporter: ["text", "json-summary", "html"],
			reportsDirectory: "coverage",
		},
		css: false,
		environment: "jsdom",
		globals: true,
		include: ["tests/unit/**/*.{test,spec}.{ts,tsx}", "tests/architecture/**/*.test.ts"],
		setupFiles: ["./tests/setup.ts"],
	},
});
