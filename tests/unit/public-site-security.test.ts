import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { CloudflareContext } from "~/lib/cloudflare-context";
import { redirectToCanonicalOrigin } from "~/lib/http/canonical-host.server";
import {
	applySecurityHeaders,
	buildContentSecurityPolicy,
	createCspNonce,
} from "~/lib/http/security-headers.server";
import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { readPublicSiteConfig } from "~/lib/public-site/config.server";

function cloudflare(bindings: Record<string, unknown>): CloudflareContext {
	return {
		cspNonce: "0123456789abcdefghijkl",
		env: bindings as unknown as Env,
		ctx: {} as ExecutionContext,
	};
}

describe("configuração do site público", () => {
	it("redireciona HTTP e www de produção para a origem HTTPS canônica", () => {
		const response = redirectToCanonicalOrigin(
			new Request("https://www.crischaves.com.br/imoveis?pagina=2"),
			{
				appEnvironment: "production",
				publicSiteUrl: "https://crischaves.com.br",
			},
		);
		expect(response?.status).toBe(308);
		expect(response?.headers.get("Location")).toBe(
			"https://crischaves.com.br/imoveis?pagina=2",
		);
		const insecureResponse = redirectToCanonicalOrigin(
			new Request("http://crischaves.com.br/imoveis?pagina=2"),
			{
				appEnvironment: "production",
				publicSiteUrl: "https://crischaves.com.br",
			},
		);
		expect(insecureResponse?.status).toBe(308);
		expect(insecureResponse?.headers.get("Location")).toBe(
			"https://crischaves.com.br/imoveis?pagina=2",
		);

		expect(
			redirectToCanonicalOrigin(new Request("https://crischaves.com.br/"), {
				appEnvironment: "production",
				publicSiteUrl: "https://crischaves.com.br",
			}),
		).toBeNull();
		expect(
			redirectToCanonicalOrigin(new Request("https://www.crischaves.com.br/"), {
				appEnvironment: "preview",
				publicSiteUrl: undefined,
			}),
		).toBeNull();
	});

	it("não publica WhatsApp ou CRECI ausentes", () => {
		const config = readPublicSiteConfig(
			new Request("http://localhost:5173/imoveis"),
			cloudflare({ APP_ENV: "development" }),
		);
		expect(config.whatsappNumber).toBeNull();
		expect(config.creci).toBeNull();
		expect(config.canonicalUrl).toBe("http://localhost:5173/imoveis");
		expect(config.contactFormAvailable).toBe(false);
	});

	it("exige origem canônica HTTPS em produção", () => {
		expect(() =>
			readPublicSiteConfig(
				new Request("https://worker.example/imoveis"),
				cloudflare({ APP_ENV: "production", PUBLIC_SITE_URL: "http://example.com" }),
			),
		).toThrow(/HTTPS/u);
	});

	it("trata APP_ENV ausente como produção e falha fechado", () => {
		expect(() =>
			readPublicSiteConfig(new Request("https://worker.example/imoveis"), cloudflare({})),
		).toThrow(/PUBLIC_SITE_URL/u);
	});

	it("gera WhatsApp canônico somente com código e URL pública", () => {
		const value = buildWhatsAppUrl("5551999990000", {
			propertyCode: "IMV-010",
			canonicalUrl: "https://example.com/imoveis/casa",
		});
		expect(value).toContain("https://wa.me/5551999990000?text=");
		expect(decodeURIComponent(value ?? "")).toContain("Código: IMV-010");
		expect(decodeURIComponent(value ?? "")).toContain("https://example.com/imoveis/casa");
	});
});

describe("cabeçalhos de segurança", () => {
	const nonce = "0123456789abcdefghijkl";

	it("aplica proteção comum e HSTS apenas em HTTPS", async () => {
		const secured = applySecurityHeaders(
			new Request("https://example.com/"),
			new Response("ok"),
			nonce,
		);
		const policy = secured.headers.get("Content-Security-Policy");
		expect(policy).toContain("frame-ancestors 'none'");
		expect(policy).toContain("base-uri 'none'");
		expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
		expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
		expect(policy).not.toContain("*.supabase.co");
		expect(secured.headers.has("Content-Security-Policy-Report-Only")).toBe(false);
		expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(secured.headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
		expect(secured.headers.get("Permissions-Policy")).toBe(
			"camera=(), geolocation=(), microphone=()",
		);
		expect(secured.headers.get("Strict-Transport-Security")).toContain(
			"max-age=31536000",
		);
		expect(await secured.text()).toBe("ok");

		const local = applySecurityHeaders(
			new Request("http://localhost/"),
			new Response("ok"),
			nonce,
		);
		expect(local.headers.has("Strict-Transport-Security")).toBe(false);
	});

	it("limita conexões do navegador à origem exata do Supabase", () => {
		const policy = buildContentSecurityPolicy(
			nonce,
			"https://projeto-seguro.supabase.co",
		);
		expect(policy).toContain(
			"connect-src 'self' https://projeto-seguro.supabase.co https://challenges.cloudflare.com",
		);
		expect(policy).not.toContain("https://*.supabase.co");
		const credentialedOrigin = new URL("https://example.com");
		credentialedOrigin.username = "usuario";
		credentialedOrigin.password = "senha";
		expect(() =>
			buildContentSecurityPolicy(nonce, credentialedOrigin.toString()),
		).toThrow(/Origem de conexão CSP inválida/u);
		expect(() =>
			buildContentSecurityPolicy(nonce, "http://projeto-seguro.supabase.co"),
		).toThrow(/Origem de conexão CSP inválida/u);
	});

	it("aplica headers equivalentes aos assets servidos fora do Worker", async () => {
		const headers = await readFile(resolve(process.cwd(), "public/_headers"), "utf8");
		expect(headers).toContain("Cross-Origin-Resource-Policy: same-origin");
		expect(headers).toContain(
			"Permissions-Policy: camera=(), geolocation=(), microphone=()",
		);
		expect(headers).toContain(
			"Strict-Transport-Security: max-age=31536000; includeSubDomains",
		);
		expect(headers).toContain("X-Content-Type-Options: nosniff");
		expect(headers).toContain("X-Robots-Tag: noindex, nofollow");
	});

	it("mantém toda resposta administrativa privada, inclusive erros", () => {
		const secured = applySecurityHeaders(
			new Request("https://example.com/admin/imoveis"),
			new Response("indisponível", { status: 503 }),
			nonce,
		);
		expect(secured.headers.get("Cache-Control")).toBe("private, no-store");
		expect(secured.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});

	it("impede indexação de toda rota no ambiente de preview", () => {
		const secured = applySecurityHeaders(
			new Request("https://staging.example.com/imoveis/demo"),
			new Response("ok"),
			nonce,
			"preview",
		);
		expect(secured.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
	});

	it("gera nonce imprevisível no formato aceito e rejeita valor inseguro", () => {
		const first = createCspNonce();
		const second = createCspNonce();
		expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/u);
		expect(second).not.toBe(first);
		expect(() => buildContentSecurityPolicy("valor'; img-src *")).toThrow(
			/Nonce CSP inválido/u,
		);
	});
});
