import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("fundação pública", () => {
	test.describe.configure({ timeout: 60_000 });

	test("carrega em desktop e mobile sem falhas graves de acessibilidade", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const response = await page.goto("/", { waitUntil: "domcontentloaded" });

		expect(response, "a navegação deve produzir uma resposta HTTP").not.toBeNull();
		expect(response?.ok(), `status inesperado: ${response?.status()}`).toBe(true);
		await expect(page.locator("html")).toHaveAttribute("lang", /\S+/);
		await expect(page.locator("main")).toBeVisible();

		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.analyze();
		const blockingViolations = results.violations.filter(({ impact }) =>
			["critical", "serious"].includes(impact ?? ""),
		);

		expect(blockingViolations).toEqual([]);
	});

	test("permite alcançar o primeiro controle interativo com teclado", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		const controls = page.locator(
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
		);

		test.skip((await controls.count()) === 0, "a fundação ainda não expõe controles");
		await page.keyboard.press("Tab");

		await expect
			.poll(() => page.evaluate(() => document.activeElement !== document.body))
			.toBe(true);
	});
});
