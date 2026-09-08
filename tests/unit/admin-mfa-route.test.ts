// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAuthFlowError } from "~/modules/auth/auth-flow-errors.server";

const startTotpEnrollment = vi.fn();

vi.mock("~/modules/auth/index.server", async (importOriginal) => {
	const actual = await importOriginal<typeof import("~/modules/auth/index.server")>();
	return {
		...actual,
		createRequestScopedAdminAuth: () => ({
			auth: { startTotpEnrollment },
			responseHeaders: new Headers(),
		}),
	};
});

vi.mock("~/routes/admin-route-helpers.server", () => ({
	adminBindings: () => ({}),
	adminResponseHeaders: () => new Headers({ "cache-control": "private, no-store" }),
	assertAdminFormRequest: vi.fn(),
	enforceAdminRateLimit: vi.fn(),
	readAdminFormData: (request: Request) => request.formData(),
}));

import { action } from "~/routes/admin-mfa";

describe("administrative MFA route", () => {
	beforeEach(() => {
		startTotpEnrollment.mockReset();
	});

	it("keeps enrollment failures on the setup screen instead of asking for a code", async () => {
		startTotpEnrollment.mockRejectedValue(
			new AdminAuthFlowError("MFA_ENROLLMENT_FAILED"),
		);
		const request = new Request("http://localhost/admin/mfa", {
			method: "POST",
			body: new URLSearchParams({ intent: "enroll" }),
		});

		const result = await action({
			request,
			context: {},
			params: {},
		} as unknown as Parameters<typeof action>[0]);

		expect("data" in result && result.data).toMatchObject({
			state: "enrollment_required",
			error: "Não foi possível configurar o autenticador.",
		});
	});
});
