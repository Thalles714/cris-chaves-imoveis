import { describe, expect, it, vi } from "vitest";

import {
	assertProductionBaseUrl,
	runProductionHttpSecurityChecks,
} from "../../scripts/check-production-http-security.mjs";

const origin = "https://crischaves.com.br";
const headers = {
	"cache-control": "private, no-store",
	"content-security-policy":
		"default-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'nonce-0123456789abcdefghijkl'",
	"cross-origin-opener-policy": "same-origin",
	"cross-origin-resource-policy": "same-origin",
	"permissions-policy": "camera=(), geolocation=(), microphone=()",
	"strict-transport-security": "max-age=31536000; includeSubDomains",
	"x-content-type-options": "nosniff",
	"x-frame-options": "DENY",
};
const propertyPath = "/imoveis/casa-segura";
const mediaPath = "/media/60000000-0000-4000-8000-000000000006";

function document(path: string, body = "") {
	return `<!doctype html><html><head><link rel="canonical" href="${origin}${path}"><meta property="og:url" content="${origin}${path}"></head><body>${body}</body></html>`;
}

function ok(body: BodyInit | null, extraHeaders: HeadersInit = {}) {
	return new Response(body, { status: 200, headers: { ...headers, ...extraHeaders } });
}

describe("smoke test HTTP de produção", () => {
	it("recusa qualquer origem diferente do domínio canônico exato", () => {
		expect(assertProductionBaseUrl(origin).href).toBe(`${origin}/`);
		for (const value of [
			"http://crischaves.com.br",
			"https://www.crischaves.com.br",
			"https://crischaves.com.br:444",
			"https://crischaves.com.br/caminho",
			"https://attacker.invalid",
		]) {
			expect(() => assertProductionBaseUrl(value)).toThrow(
				/origem de produção autorizada/u,
			);
		}
	});

	it("executa somente HEAD e GET, sem mutação", async () => {
		const sitemap = `<urlset><url><loc>${origin}${propertyPath}</loc></url></urlset>`;
		const routes = new Map<string, Response>([
			[
				"HEAD http://crischaves.com.br/home?verificacao=canonico",
				new Response(null, {
					status: 301,
					headers: { location: `${origin}/home?verificacao=canonico` },
				}),
			],
			[
				"HEAD https://www.crischaves.com.br/home?verificacao=canonico",
				new Response(null, {
					status: 308,
					headers: { location: `${origin}/home?verificacao=canonico` },
				}),
			],
			["GET https://crischaves.com.br/", ok(document("/"))],
			["GET https://crischaves.com.br/home", ok(document("/home"))],
			["GET https://crischaves.com.br/regioes", ok(document("/regioes"))],
			["GET https://crischaves.com.br/sobre-cris", ok(document("/sobre-cris"))],
			[
				"GET https://crischaves.com.br/anuncie-seu-imovel",
				ok(document("/anuncie-seu-imovel")),
			],
			["GET https://crischaves.com.br/contato", ok(document("/contato"))],
			[
				"GET https://crischaves.com.br/sitemap.xml",
				ok(sitemap, { "content-type": "application/xml" }),
			],
			[
				"GET https://crischaves.com.br/imoveis/casa-segura",
				ok(
					document(
						propertyPath,
						`<p>Eu preservo o endereço exato.</p><img src="${mediaPath}">`,
					),
				),
			],
			[
				"GET https://crischaves.com.br/media/60000000-0000-4000-8000-000000000006",
				ok("image", { "content-type": "image/webp" }),
			],
			[
				"GET https://crischaves.com.br/robots.txt",
				ok(`Disallow: /admin\nSitemap: ${origin}/sitemap.xml\n`),
			],
			[
				"GET https://crischaves.com.br/admin/entrar",
				ok("login", { "x-robots-tag": "noindex, nofollow" }),
			],
			["GET https://crischaves.com.br/privacidade", ok(document("/privacidade"))],
			["GET https://crischaves.com.br/termos", ok(document("/termos"))],
		]);
		const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = input instanceof Request ? input.url : input.toString();
			const method = init?.method ?? (input instanceof Request ? input.method : "GET");
			const response = routes.get(`${method} ${url}`);
			if (!response) throw new Error(`Requisição inesperada: ${method} ${url}`);
			return response.clone();
		});

		await expect(
			runProductionHttpSecurityChecks({ fetchImpl: fetchMock }),
		).resolves.toMatchObject({
			checks: 15,
			propertyPath,
			mediaPath,
		});
		expect(fetchMock).toHaveBeenCalledTimes(routes.size + 1);
		expect(fetchMock.mock.calls.map(([, init]) => init?.method ?? "GET")).toEqual([
			"HEAD",
			"HEAD",
			...Array(14).fill("GET"),
		]);
	});
});
