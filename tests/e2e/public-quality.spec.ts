import { expect, test } from "@playwright/test";

const widths = [320, 375, 390, 768, 1024, 1280, 1440] as const;
const expectedCreci = ["CRECI-RS", "89448"].join(" ");
const themes = [
	"horizonte",
	"atlantico",
	"araucaria",
	"dunas",
	"entardecer",
	"grafite",
] as const;

const themeCta = {
	horizonte: "#9f4429",
	atlantico: "#0e668c",
	araucaria: "#21684f",
	dunas: "#8d5728",
	entardecer: "#a54331",
	grafite: "#354a55",
} as const;

const themeSurfaces = {
	horizonte: {
		light: { background: "#f4f1ed", text: "#183c49" },
		dark: { background: "#0e171b", text: "#edf4f4" },
	},
	atlantico: {
		light: { background: "#edf5f7", text: "#0e3342" },
		dark: { background: "#081820", text: "#e9f7fa" },
	},
	araucaria: {
		light: { background: "#f0f5f1", text: "#17382f" },
		dark: { background: "#0b1814", text: "#edf6f1" },
	},
	dunas: {
		light: { background: "#f6f1e9", text: "#403426" },
		dark: { background: "#1d1711", text: "#f6efe5" },
	},
	entardecer: {
		light: { background: "#f7f0f3", text: "#442f3a" },
		dark: { background: "#1b1118", text: "#f8edf3" },
	},
	grafite: {
		light: { background: "#f1f3f3", text: "#25363d" },
		dark: { background: "#101416", text: "#f1f4f5" },
	},
} as const;

const schemeIndexes = { dark: 0, black: 1, light: 2 } as const;

test.describe("qualidade visual e desempenho público", () => {
	test.describe.configure({ timeout: 180_000 });

	test.beforeEach(({ page }, testInfo) => {
		void page;
		test.skip(testInfo.project.name !== "desktop-chromium");
	});

	test("não produz overflow na matriz responsiva obrigatória", async ({ page }) => {
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/", { waitUntil: "domcontentloaded" });
			const dimensions = await page.evaluate(() => ({
				client: document.documentElement.clientWidth,
				scroll: document.documentElement.scrollWidth,
			}));
			expect(dimensions.scroll, `overflow em ${width}px`).toBeLessThanOrEqual(
				dimensions.client,
			);
			await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
			if (width <= 760) {
				const headerCta = page.locator(".site-header-cta");
				await expect(headerCta.locator(".site-header-cta__wide")).toBeHidden();
				await expect(headerCta.locator(".site-header-cta__short")).toHaveText("Contato");
				await expect(headerCta.locator(".site-header-cta__short")).toBeVisible();
				const [credentialBox, ctaBox] = await Promise.all([
					page.locator(".brand-lockup--header .brand-lockup__credential").boundingBox(),
					headerCta.boundingBox(),
				]);
				expect(credentialBox).not.toBeNull();
				expect(ctaBox).not.toBeNull();
				expect(credentialBox!.x + credentialBox!.width).toBeLessThanOrEqual(ctaBox!.x);

				const filterTrigger = page.getByRole("button", { name: /Filtros/u });
				await expect(filterTrigger).toBeVisible();
				await filterTrigger.click();
				await expect(page.getByLabel("Finalidade")).toBeVisible();
				await page.keyboard.press("Escape");
				await expect(page.getByLabel("Finalidade")).toBeHidden();
			}
		}
	});

	test("mantém a grade de destaques preenchida dentro da tela", async ({ page }) => {
		for (const [width, columns] of [
			[375, 1],
			[768, 2],
			[1280, 3],
		] as const) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/home", { waitUntil: "domcontentloaded" });
			const layout = await page.evaluate(() => {
				const section = document.querySelector(".cc-home-featured");
				if (!section) throw new Error("Seção de destaques ausente.");
				const grid = document.createElement("div");
				grid.className = "property-grid cc-home-featured__grid";
				grid.innerHTML = Array.from(
					{ length: 3 },
					(_, index) =>
						`<div class="cc-home-reveal"><article class="cc-property-card"><div class="cc-property-card__body"><h3 class="cc-property-card__title">Imóvel demonstrativo com título longo ${index + 1}</h3></div></article></div>`,
				).join("");
				section.replaceChildren(grid);
				return {
					client: document.documentElement.clientWidth,
					scroll: document.documentElement.scrollWidth,
					columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
				};
			});
			expect(layout.scroll, `overflow da grade em ${width}px`).toBeLessThanOrEqual(
				layout.client,
			);
			expect(layout.columns).toBe(columns);
		}
	});

	test("preserva o escuro temático e oferece Black independente", async ({ page }) => {
		await page.goto("/home", { waitUntil: "domcontentloaded" });
		const trigger = page.getByRole("button", { name: "Mudar aparência" });
		await trigger.click();
		await expect(page.getByRole("dialog", { name: "Aparência" })).toBeVisible();

		for (const [index, theme] of themes.entries()) {
			await page
				.locator(".theme-btn")
				.nth(index)
				.evaluate((element) => (element as HTMLButtonElement).click());
			for (const scheme of ["light", "dark", "black"] as const) {
				await page
					.locator(".scheme-btn")
					.nth(schemeIndexes[scheme])
					.evaluate((element) => (element as HTMLButtonElement).click());
				await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
				await expect(page.locator("html")).toHaveAttribute("data-color-scheme", scheme);
				await expect(page.locator(".cc-public-nav .brand-lockup__creci")).toBeVisible();
				const schemeTokens = await page.locator("html").evaluate((element) => {
					const styles = getComputedStyle(element);
					return {
						background: styles.getPropertyValue("--cc-bg").trim(),
						text: styles.getPropertyValue("--cc-text").trim(),
						cta: styles.getPropertyValue("--cc-accent-action").trim(),
					};
				});
				expect(schemeTokens).toEqual(
					scheme === "black"
						? { background: "#050607", text: "#f7f9fb", cta: "#0b6fe8" }
						: { ...themeSurfaces[theme][scheme], cta: themeCta[theme] },
				);
			}
		}

		await page.keyboard.press("Escape");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await expect(trigger).toBeFocused();
		await page.reload({ waitUntil: "domcontentloaded" });
		await expect(page.locator("html")).toHaveAttribute("data-theme", "grafite");
		await expect(page.locator("html")).toHaveAttribute("data-color-scheme", "black");
	});

	test("preserva o popover de aparência do design system", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto("/home", { waitUntil: "domcontentloaded" });
		await page.getByRole("button", { name: "Mudar aparência" }).click();
		const panel = page.getByRole("dialog", { name: "Aparência" });
		await expect(panel).toBeVisible();
		await expect(panel.locator(".scheme-btn")).toHaveText([
			"Escuro",
			"Black",
			"Claro",
			"Sistema",
		]);
		await expect(panel.locator(".theme-btn")).toHaveCount(6);
		await expect(panel).toHaveScreenshot("appearance-popover.png", {
			animations: "disabled",
			caret: "hide",
		});
	});

	test("mantém marca e CRECI legíveis e associados em toda a matriz responsiva", async ({
		page,
	}) => {
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto("/home", { waitUntil: "domcontentloaded" });

			const headerCredential = page.locator(".cc-public-nav .brand-lockup__creci");
			const footerCredential = page.locator(".site-footer .brand-lockup__creci");
			await expect(headerCredential).toHaveText(expectedCreci);
			await expect(headerCredential).toBeVisible();
			await expect(footerCredential).toHaveText(expectedCreci);

			const presentation = await headerCredential.evaluate((element) => ({
				fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
				tagName: element.tagName,
			}));
			expect(presentation.fontSize).toBeGreaterThanOrEqual(10);
			expect(presentation.tagName).toBe("SPAN");

			const dimensions = await page.evaluate(() => ({
				client: document.documentElement.clientWidth,
				scroll: document.documentElement.scrollWidth,
			}));
			expect(dimensions.scroll, `overflow da marca em ${width}px`).toBeLessThanOrEqual(
				dimensions.client,
			);
		}
	});

	test("mantém referências visuais em Claro, Escuro e Black", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const catalogDesktop = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(catalogDesktop).toMatchSnapshot("catalog-desktop-light.png");

		await page.getByRole("button", { name: /^Filtros/u }).click();
		await expect(page.getByRole("dialog", { name: "Filtrar imóveis" })).toHaveScreenshot(
			"catalog-filter-modal-desktop.png",
			{
				animations: "disabled",
				caret: "hide",
			},
		);
		await page.keyboard.press("Escape");

		await page.setViewportSize({ width: 375, height: 812 });
		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "dark"));
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const catalogMobile = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(catalogMobile).toMatchSnapshot("catalog-mobile-dark.png");

		await page.getByRole("button", { name: /^Filtros/u }).click();
		await expect(page.getByRole("dialog", { name: "Filtrar imóveis" })).toHaveScreenshot(
			"catalog-filter-drawer-mobile.png",
			{
				animations: "disabled",
				caret: "hide",
			},
		);
		await page.keyboard.press("Escape");

		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "light"));
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto("/home", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const desktop = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(desktop).toMatchSnapshot("home-desktop-light.png");

		await page.setViewportSize({ width: 375, height: 812 });
		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "dark"));
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const mobile = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(mobile).toMatchSnapshot("home-mobile-dark.png");

		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "black"));
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const mobileBlack = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(mobileBlack).toMatchSnapshot("home-mobile-black.png");

		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "dark"));

		await page.goto("/regioes", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const regionsMobile = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(regionsMobile).toMatchSnapshot("regions-mobile-dark.png");

		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "light"));
		await page.setViewportSize({ width: 1440, height: 1000 });
		await page.goto("/anuncie-seu-imovel", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const sellDesktop = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(sellDesktop).toMatchSnapshot("sell-desktop-light.png");

		await page.setViewportSize({ width: 375, height: 812 });
		await page.evaluate(() => localStorage.setItem("cris.colorScheme", "dark"));
		await page.reload({ waitUntil: "domcontentloaded" });
		await page.waitForTimeout(500);
		const sellMobile = await page.screenshot({
			animations: "disabled",
			caret: "hide",
			fullPage: true,
		});
		expect(sellMobile).toMatchSnapshot("sell-mobile-dark.png");
	});

	test("respeita os orçamentos locais de carregamento e Core Web Vitals", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			const state = window as unknown as { __lcp: number; __cls: number };
			state.__lcp = 0;
			state.__cls = 0;
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) state.__lcp = entry.startTime;
			}).observe({ type: "largest-contentful-paint", buffered: true });
			new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					const shift = entry as PerformanceEntry & {
						value: number;
						hadRecentInput: boolean;
					};
					if (!shift.hadRecentInput) state.__cls += shift.value;
				}
			}).observe({ type: "layout-shift", buffered: true });
		});
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(250);
		const metrics = await page.evaluate(() => {
			const navigation = performance.getEntriesByType(
				"navigation",
			)[0] as PerformanceNavigationTiming;
			const state = window as unknown as { __lcp: number; __cls: number };
			const scriptBytes = performance
				.getEntriesByType("resource")
				.filter((entry) => entry.name.includes(".js"))
				.reduce(
					(total, entry) => total + (entry as PerformanceResourceTiming).transferSize,
					0,
				);
			return {
				domContentLoaded: navigation.domContentLoadedEventEnd,
				lcp: state.__lcp,
				cls: state.__cls,
				scriptBytes,
			};
		});
		expect(metrics.domContentLoaded).toBeLessThan(2_500);
		expect(metrics.lcp).toBeGreaterThan(0);
		expect(metrics.lcp).toBeLessThan(2_500);
		expect(metrics.cls).toBeLessThanOrEqual(0.1);
		expect(metrics.scriptBytes).toBeLessThanOrEqual(400_000);
	});
});
