// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { loader } from "~/routes/admin-auth-callback";
import { action as recoveryAction } from "~/routes/admin-recovery";

const origin = "https://cris-chaves.example";
const memberEmail = ["member", "example.test"].join("@");

function authContext() {
	const limiter = { limit: vi.fn(async () => ({ success: true })) };
	return {
		get: vi.fn(() => ({
			env: {
				APP_ENV: "test",
				PUBLIC_SITE_URL: origin,
				SUPABASE_URL: "https://project-ref.supabase.co",
				SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_value",
				ADMIN_AUTH_RATE_LIMITER: limiter,
			},
			ctx: {},
		})),
	};
}

function requestUrl(input: RequestInfo | URL): string {
	return input instanceof Request ? input.url : input.toString();
}

describe("administrative recovery callback route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("keeps the callback denial generic when Supabase rejects the verifier", async () => {
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			if (requestUrl(input).includes("/recover")) {
				return Response.json({}, { status: 200 });
			}
			return Response.json(
				{ code: "bad_code_verifier", message: "PKCE verification failed" },
				{ status: 400 },
			);
		});
		vi.stubGlobal("fetch", fetchSpy);
		const recoveryRequest = new Request(`${origin}/admin/recuperar-senha`, {
			method: "POST",
			headers: {
				"content-type": "application/x-www-form-urlencoded",
				origin,
			},
			body: new URLSearchParams({ email: memberEmail }),
		});
		const recoveryResponse = await recoveryAction({
			request: recoveryRequest,
			context: authContext(),
			params: {},
		} as unknown as Parameters<typeof recoveryAction>[0]);
		const recoveryHeaders = recoveryResponse.init?.headers as Headers;
		const verifierCookies = recoveryHeaders.getSetCookie();
		expect(verifierCookies).toHaveLength(3);
		const cookieHeader = verifierCookies
			.map((cookie) => cookie.slice(0, cookie.indexOf(";")))
			.join("; ");
		const callbackRequest = new Request(
			`${origin}/admin/auth/callback?next=%2Fadmin%2Fredefinir-senha&code=valid-pkce-code-123`,
			{ headers: { cookie: cookieHeader } },
		);

		const response = await loader({
			request: callbackRequest,
			context: authContext(),
			params: {},
		} as unknown as Parameters<typeof loader>[0]);

		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/admin/entrar?recuperacao=invalida");
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it("rejects an unapproved next destination before contacting Supabase", async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal("fetch", fetchSpy);
		const request = new Request(
			`${origin}/admin/auth/callback?next=https%3A%2F%2Fattacker.example&code=valid-pkce-code-123`,
		);

		const response = await loader({
			request,
			context: authContext(),
			params: {},
		} as unknown as Parameters<typeof loader>[0]);

		expect(response.headers.get("location")).toBe("/admin/entrar?recuperacao=invalida");
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
