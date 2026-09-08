import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

function expectPrivateHeaders(headers: Record<string, string>): void {
	expect(headers["cache-control"]).toBe("private, no-store");
	expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
}

test.describe("fronteira administrativa sem sessão autenticada", () => {
	test.describe.configure({ timeout: 60_000 });

	test("entrega o login privado, responsivo e acessível sem expor o painel", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const response = await page.goto("/admin/entrar", {
			waitUntil: "domcontentloaded",
		});

		expect(response?.status()).toBe(200);
		expectPrivateHeaders(response?.headers() ?? {});
		await expect(page).toHaveTitle(/Entrar.*Administra/u);
		await expect(
			page.getByRole("heading", { name: "Entrar com segurança." }),
		).toBeVisible();
		await expect(page.getByLabel("E-mail")).toHaveAttribute("autocomplete", "username");
		await expect(page.getByLabel("Senha")).toHaveAttribute(
			"autocomplete",
			"current-password",
		);
		await expect(page.getByText("MFA confirmado")).toHaveCount(0);

		const horizontalOverflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(horizontalOverflow).toBe(false);

		await page.keyboard.press("Tab");
		await expect(
			page.getByRole("link", {
				name: "Cris Chaves Corretor de Imóveis — início",
				exact: true,
			}),
		).toBeFocused();
		const results = await new AxeBuilder({ page })
			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
			.analyze();
		expect(
			results.violations.filter(({ impact }) =>
				["critical", "serious"].includes(impact ?? ""),
			),
		).toEqual([]);
	});

	test("mantém recuperação e callback inválido privados e sem enumeração", async ({
		request,
	}) => {
		const recovery = await request.get("/admin/recuperar-senha");
		expect(recovery.status()).toBe(200);
		expectPrivateHeaders(recovery.headers());

		const callback = await request.get(
			"/admin/auth/callback?next=https%3A%2F%2Fexample.invalid",
			{ maxRedirects: 0 },
		);
		expect(callback.status()).toBe(302);
		expect(callback.headers()["location"]).toBe("/admin/entrar?recuperacao=invalida");
		expectPrivateHeaders(callback.headers());
	});

	test("nega acesso às páginas protegidas sem sessão administrativa", async ({
		request,
	}) => {
		for (const path of [
			"/admin",
			"/admin/imoveis",
			"/admin/imoveis/novo",
			"/admin/imoveis/40000000-0000-4000-8000-000000000004/midia",
			"/admin/membros",
			"/admin/auditoria",
		]) {
			const response = await request.get(path, { maxRedirects: 0 });
			expect([302, 503], path).toContain(response.status());
			if (response.status() === 302) {
				expect(response.headers()["location"], path).toBe("/admin/entrar");
			}
			expectPrivateHeaders(response.headers());
			expect(await response.text(), path).not.toContain("MFA confirmado");
		}
	});
});
