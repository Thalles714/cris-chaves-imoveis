// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createDraft, requireAdminRoute } = vi.hoisted(() => ({
	createDraft: vi.fn(),
	requireAdminRoute: vi.fn(),
}));

vi.mock("~/modules/properties/admin/index.server", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("~/modules/properties/admin/index.server")>();
	return {
		...actual,
		SupabaseAdminPropertyRepository: class {
			createDraft = createDraft;
		},
	};
});

vi.mock("~/routes/admin-route-helpers.server", () => ({
	adminResponseHeaders: (headers?: Headers) => headers ?? new Headers(),
	assertAdminFormRequest: vi.fn(),
	readAdminFormData: (request: Request) => request.formData(),
	requireAdminRoute,
}));

import { action } from "~/routes/admin-property-new";

describe("new property workflow", () => {
	beforeEach(() => {
		createDraft.mockReset();
		requireAdminRoute.mockReset();
		requireAdminRoute.mockResolvedValue({
			client: {},
			responseHeaders: new Headers({ "x-admin-session": "verified" }),
		});
	});

	it("continues directly to media after creating the draft", async () => {
		const propertyId = "fcd5e63b-2be3-4079-8c8d-378d352ae759";
		createDraft.mockResolvedValue({ id: propertyId });
		const request = new Request("http://localhost/admin/imoveis/novo", {
			method: "POST",
			body: new URLSearchParams({
				publicCode: "CC-099",
				title: "Casa demonstrativa",
				slug: "casa-demonstrativa",
				purpose: "sale",
				propertyType: "Casa",
				city: "Cidreira",
				neighborhood: "Centro",
				priceDisplay: "on_request",
				description: "",
				features: "",
			}),
		});

		const response = await action({
			request,
			context: {},
			params: {},
		} as unknown as Parameters<typeof action>[0]);

		if (!(response instanceof Response)) throw new Error("Expected a redirect response.");
		expect(createDraft).toHaveBeenCalledOnce();
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			`/admin/imoveis/${propertyId}/midia?criado=1`,
		);
	});
});
