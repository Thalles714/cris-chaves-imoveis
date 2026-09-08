// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { action as recoveryAction } from "~/routes/admin-recovery";

const recoveryUrl = "https://cris-chaves.example/admin/recuperar-senha";
const memberEmail = ["member", "example.test"].join("@");

function recoveryContext() {
	const limiter = { limit: vi.fn(async () => ({ success: true })) };
	return {
		get: vi.fn(() => ({
			env: {
				APP_ENV: "test",
				PUBLIC_SITE_URL: "https://cris-chaves.example",
				SUPABASE_URL: "https://project-ref.supabase.co",
				SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_value",
				ADMIN_AUTH_RATE_LIMITER: limiter,
			},
			ctx: {},
		})),
	};
}

describe("administrative password recovery route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the generic response together with the PKCE verifier cookie", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				Response.json(
					{},
					{ status: 200, headers: { "content-type": "application/json" } },
				),
			),
		);
		const request = new Request(recoveryUrl, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				origin: new URL(recoveryUrl).origin,
			},
			body: new URLSearchParams({ email: memberEmail }),
		});

		const response = await recoveryAction({
			request,
			context: recoveryContext(),
			params: {},
		} as unknown as Parameters<typeof recoveryAction>[0]);

		expect(response.data).toEqual({ accepted: true });
		expect(response.init?.status).toBe(202);
		expect(response.init?.headers).toBeInstanceOf(Headers);
		const headers = response.init?.headers as Headers;
		const cookies = headers.getSetCookie();
		expect(cookies).toHaveLength(3);
		expect(
			cookies.some((cookie) => /-flow-[a-f0-9]{32}-code-verifier=/u.test(cookie)),
		).toBe(true);
		expect(cookies.some((cookie) => /-flows-code-verifier=/u.test(cookie))).toBe(true);
		expect(cookies.some((cookie) => /-auth-token-code-verifier=/u.test(cookie))).toBe(
			true,
		);
		expect(headers.get("cache-control")).toBe("private, no-store");
		expect(headers.get("x-robots-tag")).toBe("noindex, nofollow");
	});
});
