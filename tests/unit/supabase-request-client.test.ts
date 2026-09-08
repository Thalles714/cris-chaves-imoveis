import { describe, expect, it, vi } from "vitest";

import { readSupabaseServerConfig } from "~/lib/supabase/config.server";
import { createRequestScopedSupabaseClient } from "~/lib/supabase/request-client.server";

describe("request-scoped Supabase client", () => {
	it("rejects privileged keys and insecure production origins", () => {
		expect(() =>
			readSupabaseServerConfig({
				APP_ENV: "production",
				SUPABASE_URL: "http://localhost:54321",
				SUPABASE_PUBLISHABLE_KEY: `sb_${"secret"}_not_allowed_in_this_client`,
			}),
		).toThrow();
	});

	it("isolates cookies per request and enforces private no-store responses", () => {
		const createServerClient = vi.fn().mockReturnValue({ requestScoped: true });
		const scoped = createRequestScopedSupabaseClient({
			request: new Request("https://example.test/admin", {
				headers: { Cookie: "session=synthetic%20value" },
			}),
			config: {
				appEnvironment: "test",
				url: "https://project-ref.supabase.co",
				publishableKey: "sb_publishable_synthetic_value",
			},
			adapter: { createServerClient },
		});

		const options = createServerClient.mock.calls[0]?.[0];
		expect(options.cookies.getAll()).toEqual([
			{ name: "session", value: "synthetic value" },
		]);
		options.cookies.setAll(
			[
				{
					name: "session",
					value: "rotated",
					options: { secure: true, sameSite: "lax" },
				},
			],
			{ Pragma: "no-cache" },
		);

		expect(scoped.responseHeaders.get("Cache-Control")).toBe("private, no-store");
		expect(scoped.responseHeaders.get("Pragma")).toBe("no-cache");
		expect(scoped.responseHeaders.get("Set-Cookie")).toContain("HttpOnly");
		expect(scoped.responseHeaders.get("Set-Cookie")).toContain("Secure");
	});
});
