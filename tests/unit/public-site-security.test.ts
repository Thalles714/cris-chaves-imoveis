import { describe, expect, it } from "vitest";

import type { CloudflareContext } from "~/lib/cloudflare-context";
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
		expect(secured.headers.has("Content-Security-Policy-Report-Only")).toBe(false);
		expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
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

	it("mantém toda resposta administrativa privada, inclusive erros", () => {
		const secured = applySecurityHeaders(
			new Request("https://example.com/admin/imoveis"),
			new Response("indisponível", { status: 503 }),
			nonce,
		);
		expect(secured.headers.get("Cache-Control")).toBe("private, no-store");
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
