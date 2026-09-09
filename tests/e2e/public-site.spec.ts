import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("site público", () => {
	test.describe.configure({ timeout: 60_000 });

	test("entrega home editorial real, SEO e segurança sem conteúdo fictício", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			const state = window as unknown as { __cspViolations: string[] };
			state.__cspViolations = [];
			document.addEventListener("securitypolicyviolation", (event) => {
				state.__cspViolations.push(`${event.violatedDirective}:${event.blockedURI}`);
			});
		});
		const response = await page.goto("/home", { waitUntil: "domcontentloaded" });
		expect(response?.status()).toBe(200);
		expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
		const csp = response?.headers()["content-security-policy"];
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("base-uri 'none'");
		expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9_-]{22}'/u);
		expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
		expect(response?.headers()["content-security-policy-report-only"]).toBeUndefined();
		await expect(page).toHaveTitle(/Imóveis no Litoral Norte Gaúcho/u);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			"href",
			/\/home$/u,
		);
		await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
			"content",
			/Cris Chaves/u,
		);
		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			"Seu lugar no litoral",
		);
		await expect(page.getByText("O catálogo está sendo preparado")).toBeVisible();
		await expect(page.getByText(/R\$ 640\.000/u)).toHaveCount(0);
		expect(await page.locator(".cc-property-card img").count()).toBe(0);
		await page.waitForTimeout(250);
		expect(
			await page.evaluate(
				() => (window as unknown as { __cspViolations: string[] }).__cspViolations,
			),
		).toEqual([]);
	});

	test("busca textual preserva filtros na raiz e mantém URL compartilhável", async ({
		page,
	}) => {
		const response = await page.goto(
			"/?busca=casa+na+beira+da+praia&finalidade=venda&cidade=Tramanda%C3%AD&dormitorios=2",
			{ waitUntil: "domcontentloaded" },
		);
		expect(response?.status()).toBe(200);
		await expect(
			page.getByRole("heading", { name: "Encontrei 0 imóveis" }),
		).toBeVisible();
		await expect(page.getByLabel("Buscar imóveis")).toHaveValue("casa na beira da praia");
		await page.getByRole("button", { name: /Filtros/u }).click();
		await expect(page.getByLabel("Finalidade")).toHaveValue("venda");
		await expect(page.getByLabel("Cidade")).toHaveValue("Tramandaí");
		await expect(page.getByLabel("Dormitórios (mínimo)")).toHaveValue("2");
		await expect(
			page.getByText("Ainda não encontrei um imóvel para esta busca"),
		).toBeVisible();
	});

	test("rejeita filtros ambíguos e detalhes inexistentes sem enumerar dados", async ({
		page,
	}) => {
		const invalid = await page.goto("/?cidade=Cidreira&cidade=Tramandai", {
			waitUntil: "domcontentloaded",
		});
		expect(invalid?.status()).toBe(400);
		await expect(
			page.getByRole("heading", { name: "Não foi possível aplicar esta busca" }),
		).toBeVisible();

		const missing = await page.goto("/imoveis/anuncio-que-nao-existe", {
			waitUntil: "domcontentloaded",
		});
		expect(missing?.status()).toBe(404);
		await expect(
			page.getByText("não existe ou o conteúdo não está publicado"),
		).toBeVisible();
	});

	test("redireciona a listagem legada com 308 e preserva a busca", async ({
		request,
	}) => {
		const response = await request.get("/imoveis?cidade=Cidreira&pagina=2", {
			maxRedirects: 0,
		});
		expect(response.status()).toBe(308);
		expect(response.headers().location).toBe("/?cidade=Cidreira&pagina=2");
	});

	test("oferece contato direto sem coletar dados antes da aprovação do fluxo LGPD", async ({
		page,
	}) => {
		await page.goto("/anuncie-seu-imovel", { waitUntil: "domcontentloaded" });
		await expect(page.getByText("Atendimento direto")).toBeVisible();
		await expect(page.locator(".contact-form-panel__cta")).toHaveAttribute(
			"href",
			/^https:\/\/wa\.me\//u,
		);
		await expect(page.locator("form")).toHaveCount(0);
		await expect(page.getByLabel("Nome")).toHaveCount(0);
	});

	test("expõe robots e sitemap apenas com URLs públicas canônicas", async ({
		request,
	}) => {
		const robots = await request.get("/robots.txt");
		expect(robots.ok()).toBe(true);
		expect(await robots.text()).toContain("Disallow: /admin");

		const sitemap = await request.get("/sitemap.xml");
		expect(sitemap.ok()).toBe(true);
		expect(sitemap.headers()["cache-control"]).toBe("private, no-store");
		const xml = await sitemap.text();
		expect(xml).toContain("<urlset");
		expect(xml).toContain("/home</loc>");
		expect(xml).not.toContain("/imoveis</loc>");
		expect(xml).not.toContain("/admin");
	});

	test("publica termos e privacidade vigentes sem linguagem de minuta", async ({
		page,
	}) => {
		for (const path of ["/privacidade", "/termos"]) {
			const response = await page.goto(path, { waitUntil: "domcontentloaded" });
			expect(response?.status()).toBe(200);
			await expect(
				page.getByText("Última atualização: 9 de setembro de 2026."),
			).toBeVisible();
			await expect(page.locator("main")).not.toContainText(/preliminar|minuta/u);
			await expect(
				page.getByRole("link", { name: /página de contato/u }).first(),
			).toBeVisible();
		}
	});

	test("funciona por teclado, em menu móvel e com movimento reduzido", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/home", { waitUntil: "domcontentloaded" });
		await page.keyboard.press("Tab");
		await expect(page.getByRole("link", { name: "Ir para o conteúdo" })).toBeFocused();

		const menu = page.getByRole("button", { name: "Abrir menu" });
		if (await menu.isVisible()) {
			await menu.click();
			const navigation = page.locator(".cc-public-nav__links");
			await expect(navigation).toHaveAttribute("data-open", "true");
			await page.keyboard.press("Escape");
			await expect(navigation).not.toHaveAttribute("data-open", "true");
		}
		const animationName = await page
			.locator(".cc-home-hero__coastline-accent")
			.evaluate((element) => getComputedStyle(element).animationName);
		expect(animationName).toBe("none");
	});

	test("não apresenta violações sérias nas páginas principais", async ({ page }) => {
		for (const path of [
			"/",
			"/home",
			"/regioes",
			"/anuncie-seu-imovel",
			"/contato",
			"/privacidade",
			"/termos",
		]) {
			await page.goto(path, { waitUntil: "domcontentloaded" });
			const results = await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
				.analyze();
			expect(
				results.violations.filter(({ impact }) =>
					["critical", "serious"].includes(impact ?? ""),
				),
			).toEqual([]);
		}
	});
});
