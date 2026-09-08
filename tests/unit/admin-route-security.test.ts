// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
} from "~/routes/admin-route-helpers.server";

const adminUrl = "https://cris-chaves.example/admin/imoveis/novo";

function formRequest(headers: Record<string, string> = {}, method = "POST"): Request {
	return new Request(adminUrl, {
		method,
		headers: {
			"content-length": "32",
			"content-type": "application/x-www-form-urlencoded;charset=UTF-8",
			origin: new URL(adminUrl).origin,
			...headers,
		},
		body: method === "GET" || method === "HEAD" ? undefined : "title=Casa+em+Cidreira",
	});
}

async function rejectedAdminResponse(action: () => Promise<unknown>): Promise<Response> {
	try {
		await action();
	} catch (error) {
		expect(error).toBeInstanceOf(Response);
		return error as Response;
	}
	throw new Error("A requisição administrativa deveria ter sido rejeitada.");
}

async function rejectedResponse(request: Request): Promise<Response> {
	return rejectedAdminResponse(() => assertAdminFormRequest(request));
}

function expectPrivateAdminHeaders(headers: Headers): void {
	expect(headers.get("cache-control")).toBe("private, no-store");
	expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
}

function rateLimitContext(binding: {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}) {
	return {
		get: vi.fn(() => ({
			env: {
				ADMIN_AUTH_RATE_LIMITER: binding,
				ADMIN_MUTATION_RATE_LIMITER: binding,
			},
			ctx: {},
		})),
	} as unknown as Parameters<typeof enforceAdminRateLimit>[0];
}

describe("administrative route security", () => {
	it("marks every administrative response as private and non-indexable", () => {
		expectPrivateAdminHeaders(adminResponseHeaders());
	});

	it("does not allow merged response headers to weaken admin privacy", () => {
		const extra = new Headers({
			"cache-control": "public, max-age=3600",
			"x-robots-tag": "index, follow",
			"x-request-id": "request-123",
		});
		const headers = adminResponseHeaders(extra);

		expectPrivateAdminHeaders(headers);
		expect(headers.get("x-request-id")).toBe("request-123");
	});

	it("preserves each Set-Cookie header exposed by the Node runtime", () => {
		const extra = new Headers();
		extra.append("Set-Cookie", "pkce-flow=one; Path=/; HttpOnly");
		extra.append("Set-Cookie", "pkce-index=two; Path=/; HttpOnly");

		expect(adminResponseHeaders(extra).getSetCookie()).toEqual([
			"pkce-flow=one; Path=/; HttpOnly",
			"pkce-index=two; Path=/; HttpOnly",
		]);
	});

	it("preserves each Set-Cookie header exposed by the Workers runtime", () => {
		const extra = new Headers({ "x-request-id": "workers-request" });
		Object.defineProperty(extra, "getSetCookie", { value: undefined });
		Object.defineProperty(extra, "getAll", {
			value: vi.fn((name: string) =>
				name.toLowerCase() === "set-cookie"
					? ["pkce-flow=one; Path=/; HttpOnly", "pkce-index=two; Path=/; HttpOnly"]
					: [],
			),
		});

		const merged = adminResponseHeaders(extra);
		expect(merged.getSetCookie()).toEqual([
			"pkce-flow=one; Path=/; HttpOnly",
			"pkce-index=two; Path=/; HttpOnly",
		]);
		expect(merged.get("x-request-id")).toBe("workers-request");
	});

	it("accepts only a same-origin POST form within the declared byte limit", async () => {
		await expect(assertAdminFormRequest(formRequest())).resolves.toBeUndefined();
		await expect(
			assertAdminFormRequest(formRequest({ "content-length": "32768" })),
		).resolves.toBeUndefined();
	});

	it("rejects non-POST methods with protected error headers", async () => {
		const response = await rejectedResponse(formRequest({}, "PUT"));

		expect(response.status).toBe(405);
		expectPrivateAdminHeaders(response.headers);
	});

	it.each([
		"application/json",
		"text/plain",
		"application/x-www-form-urlencoded.evil",
		"multipart/form-data",
		"multipart/form-data; boundary=",
		"multipart/form-dataevil; boundary=test",
	])("rejects unsupported or prefix-smuggled content type %s", async (contentType) => {
		const response = await rejectedResponse(formRequest({ "content-type": contentType }));

		expect(response.status).toBe(415);
		expectPrivateAdminHeaders(response.headers);
	});

	it.each([undefined, "https://attacker.example", "https://cris-chaves.example.evil"])(
		"rejects absent or cross-origin form submissions (%s)",
		async (origin) => {
			const request = formRequest();
			if (origin === undefined) request.headers.delete("origin");
			else request.headers.set("origin", origin);

			const response = await rejectedResponse(request);
			expect(response.status).toBe(403);
			expectPrivateAdminHeaders(response.headers);
		},
	);

	it.each(["32769", "not-a-number", "-1"])(
		"rejects an invalid or excessive declared body length (%s)",
		async (contentLength) => {
			const response = await rejectedResponse(
				formRequest({ "content-length": contentLength }),
			);

			expect(response.status).toBe(413);
			expectPrivateAdminHeaders(response.headers);
		},
	);

	it("measures and rejects an excessive body when no length is declared", async () => {
		const request = formRequest({
			"content-length": "",
			"content-type": "application/x-www-form-urlencoded",
		});
		request.headers.delete("content-length");
		const oversized = new Request(request.url, {
			method: "POST",
			headers: request.headers,
			body: `description=${"x".repeat(32_769)}`,
		});

		const response = await rejectedResponse(oversized);
		expect(response.status).toBe(413);
		expectPrivateAdminHeaders(response.headers);
	}, 1_000);

	it("uses independent hashed IP, identity and combined keys", async () => {
		const limit = vi.fn(async (options: { key: string }) => ({
			success: options.key.length > 0,
		}));
		const request = formRequest({ "cf-connecting-ip": "203.0.113.42" });
		await enforceAdminRateLimit(
			rateLimitContext({ limit }),
			request,
			"auth",
			"person-at-example-invalid",
		);

		expect(limit).toHaveBeenCalledTimes(3);
		const keys = limit.mock.calls.map(([options]) => options.key);
		expect(new Set(keys)).toHaveLength(3);
		for (const key of keys) {
			expect(key).toMatch(/^[a-f0-9]{32}$/u);
			expect(key).not.toContain("203.0.113.42");
			expect(key).not.toContain("person-at-example-invalid");
		}
	});

	it("returns a protected 429 response when the admin limit is exhausted", async () => {
		const response = await rejectedAdminResponse(() =>
			enforceAdminRateLimit(
				rateLimitContext({ limit: vi.fn(async () => ({ success: false })) }),
				formRequest(),
				"mutation",
				"40000000-0000-4000-8000-000000000004",
			),
		);
		expect(response.status).toBe(429);
		expect(response.headers.get("retry-after")).toBe("60");
		expectPrivateAdminHeaders(response.headers);
	});
});
