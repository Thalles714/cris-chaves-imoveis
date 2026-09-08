import { describe, expect, it, vi } from "vitest";

import {
	CloudflareTurnstileVerifier,
	processContactSubmission,
	type ContactDelivery,
	type ContactRateLimiter,
	type TurnstileVerifier,
} from "~/modules/contact/contact-service.server";
import { buildAnonymousRateLimitKey } from "~/modules/contact/rate-limit.server";

function validForm() {
	const form = new FormData();
	form.set("name", "Maria Silva");
	form.set("phone", ["(51)", "99999", "0000"].join(" "));
	form.set("email", ["maria", "example.com"].join("@"));
	form.set("message", "Gostaria de receber mais informações.");
	form.set("intent", "general");
	form.set("cf-turnstile-response", "valid-token");
	return form;
}

const allow: ContactRateLimiter = { limit: vi.fn(async () => true) };
const validTurnstile: TurnstileVerifier = {
	verify: vi.fn(async () => ({ success: true, action: "contact", errorCodes: [] })),
};
const delivered: ContactDelivery = { deliver: vi.fn(async () => true) };

describe("conversão segura sem retenção", () => {
	it("aceita a orquestração somente com limite, Turnstile e entrega válidos", async () => {
		await expect(
			processContactSubmission({
				formData: validForm(),
				rateLimitKey: "anonymous-key",
				rateLimiter: allow,
				turnstile: validTurnstile,
				delivery: delivered,
			}),
		).resolves.toEqual({ ok: true, status: 200 });
	});

	it("rejeita campos extras e conteúdo com marcação antes de chamar serviços", async () => {
		const form = validForm();
		form.set("message", "<script>alert(1)</script>");
		form.set("isAdmin", "true");
		const limiter = { limit: vi.fn(async () => true) };
		const result = await processContactSubmission({
			formData: form,
			rateLimitKey: "anonymous-key",
			rateLimiter: limiter,
			turnstile: validTurnstile,
			delivery: delivered,
		});

		expect(result).toEqual({ ok: false, status: 400, code: "invalid" });
		expect(limiter.limit).not.toHaveBeenCalled();
	});

	it("responde 429 antes de consumir um token Turnstile", async () => {
		const turnstile = { verify: vi.fn() };
		const result = await processContactSubmission({
			formData: validForm(),
			rateLimitKey: "anonymous-key",
			rateLimiter: { limit: vi.fn(async () => false) },
			turnstile,
			delivery: delivered,
		});
		expect(result).toEqual({ ok: false, status: 429, code: "limited" });
		expect(turnstile.verify).not.toHaveBeenCalled();
	});

	it("rejeita token inválido, expirado ou reutilizado sem entregar dados", async () => {
		const delivery = { deliver: vi.fn() };
		const result = await processContactSubmission({
			formData: validForm(),
			rateLimitKey: "anonymous-key",
			rateLimiter: allow,
			turnstile: {
				verify: vi.fn(async () => ({
					success: false,
					errorCodes: ["timeout-or-duplicate"],
				})),
			},
			delivery,
		});
		expect(result).toEqual({ ok: false, status: 400, code: "invalid" });
		expect(delivery.deliver).not.toHaveBeenCalled();
	});

	it("falha de modo fechado quando não existe destino aprovado", async () => {
		const result = await processContactSubmission({
			formData: validForm(),
			rateLimitKey: "anonymous-key",
			rateLimiter: allow,
			turnstile: validTurnstile,
			delivery: { deliver: vi.fn(async () => false) },
		});
		expect(result).toEqual({ ok: false, status: 503, code: "unavailable" });
	});

	it("valida ação e hostname na resposta do Siteverify", async () => {
		const fetcher = vi.fn(async () =>
			Response.json({ success: true, action: "contact", hostname: "imoveis.example" }),
		);
		const verifier = new CloudflareTurnstileVerifier(
			"secret",
			"imoveis.example",
			fetcher,
		);
		await expect(
			verifier.verify({ token: "token", idempotencyKey: crypto.randomUUID() }),
		).resolves.toMatchObject({ success: true, action: "contact" });
		expect(fetcher).toHaveBeenCalledOnce();
	});

	it("deriva uma chave pseudônima sem expor IP ou agente", async () => {
		const key = await buildAnonymousRateLimitKey({
			ip: "203.0.113.9",
			userAgent: "Test Browser",
			salt: "a-long-random-test-secret",
		});
		expect(key).toMatch(/^[a-f0-9]{32}$/u);
		expect(key).not.toContain("203.0.113.9");
		expect(key).not.toContain("Test Browser");
	});
});
