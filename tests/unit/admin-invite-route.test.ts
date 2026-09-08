// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const setSession = vi.fn();
const activateMembership = vi.fn();

vi.mock("~/modules/auth/index.server", () => ({
	createRequestScopedAdminAuth: () => ({
		client: {
			auth: { setSession },
			rpc: activateMembership,
		},
		responseHeaders: new Headers(),
	}),
}));

vi.mock("~/routes/admin-route-helpers.server", () => ({
	adminBindings: () => ({}),
	adminResponseHeaders: (headers?: Headers) => headers ?? new Headers(),
	assertAdminFormRequest: vi.fn(),
	enforceAdminRateLimit: vi.fn(),
	readAdminFormData: (request: Request) => request.formData(),
}));

import { action } from "~/routes/admin-invite-accept";

function inviteRequest(fields: Record<string, string>) {
	return new Request("https://cris-chaves.example/admin/convite", {
		method: "POST",
		body: new URLSearchParams(fields),
	});
}

describe("administrative invite route", () => {
	beforeEach(() => {
		setSession.mockReset();
		activateMembership.mockReset();
		setSession.mockResolvedValue({ data: { session: {} }, error: null });
		activateMembership.mockResolvedValue({ data: true, error: null });
	});

	it("accepts an opaque short refresh token and delegates its verification to Supabase", async () => {
		const response = await action({
			request: inviteRequest({
				access_token: "synthetic-access-token",
				refresh_token: "short-token",
				type: "invite",
			}),
			context: {},
			params: {},
		} as unknown as Parameters<typeof action>[0]);

		expect(setSession).toHaveBeenCalledWith({
			access_token: "synthetic-access-token",
			refresh_token: "short-token",
		});
		expect(activateMembership).toHaveBeenCalledWith("activate_own_admin_membership");
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/admin/redefinir-senha");
	});

	it("rejects a wrong flow type before handing tokens to Supabase", async () => {
		const response = await action({
			request: inviteRequest({
				access_token: "synthetic-access-token",
				refresh_token: "short-token",
				type: "recovery",
			}),
			context: {},
			params: {},
		} as unknown as Parameters<typeof action>[0]);

		expect(setSession).not.toHaveBeenCalled();
		expect(activateMembership).not.toHaveBeenCalled();
		expect(response.headers.get("location")).toBe("/admin/entrar?convite=invalido");
	});
});
