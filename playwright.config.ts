import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

// Font assets are local and receive an explicit settling delay in visual tests.
// Workerd preview never resolves document.fonts.ready on Windows in this runner.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";

const baseURL = "http://127.0.0.1:4173";
const webServerEnv = {
	APP_ENV: "test",
	CC_LOCAL_PORT: "4173",
	CC_LOCAL_VARS_FILE: ".dev.vars.test",
	CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
	ComSpec: process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
	PATH: process.env.PATH ?? "",
	SystemRoot: process.env.SystemRoot ?? "C:\\Windows",
	TEMP: process.env.TEMP ?? path.resolve(".cache/tmp"),
	TMP: process.env.TMP ?? path.resolve(".cache/tmp"),
	XDG_CONFIG_HOME: path.resolve(".cache/xdg-config"),
};

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL,
		screenshot: "only-on-failure",
		trace: "retain-on-failure",
		video: "off",
	},
	projects: [
		{
			name: "desktop-chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile-chromium",
			use: { ...devices["Pixel 7"] },
		},
	],
	webServer: {
		command: "node scripts/serve-built-local.mjs",
		env: webServerEnv,
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
