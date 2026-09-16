import { defineConfig, devices } from "@playwright/test";

// Font assets are local and receive an explicit settling delay in visual tests.
// Workerd preview never resolves document.fonts.ready on Windows in this runner.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";

const baseURL = "http://127.0.0.1:4173";
export default defineConfig({
	testDir: "./tests/e2e",
	globalSetup: "./tests/e2e/global-setup.mjs",
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
});
