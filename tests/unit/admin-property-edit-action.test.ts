// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findById, listMedia, transition, update, requireAdminRoute } = vi.hoisted(() => ({
	findById: vi.fn(),
	listMedia: vi.fn(),
	transition: vi.fn(),
	update: vi.fn(),
	requireAdminRoute: vi.fn(),
}));

vi.mock("~/modules/properties/admin/index.server", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("~/modules/properties/admin/index.server")>();
	return {
		...actual,
		SupabaseAdminPropertyRepository: class {
			findById = findById;
			transition = transition;
			update = update;
		},
	};
});

vi.mock("~/modules/media/admin/index.server", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("~/modules/media/admin/index.server")>();
	return {
		...actual,
		SupabaseAdminMediaRepository: class {
			list = listMedia;
		},
	};
});

vi.mock("~/routes/admin-route-helpers.server", () => ({
	adminResponseHeaders: (headers?: Headers) => headers ?? new Headers(),
	assertAdminFormRequest: vi.fn(),
	readAdminFormData: (request: Request) => request.formData(),
	requireAdminRoute,
}));

import { action, loader } from "~/routes/admin-property-edit";

const propertyId = "fcd5e63b-2be3-4079-8c8d-378d352ae759";

describe("administrative property transitions", () => {
	beforeEach(() => {
		findById.mockReset();
		listMedia.mockReset();
		transition.mockReset();
		update.mockReset();
		requireAdminRoute.mockReset();
		transition.mockResolvedValue(undefined);
		update.mockResolvedValue(undefined);
		requireAdminRoute.mockResolvedValue({
			client: {},
			responseHeaders: new Headers({ "x-admin-session": "verified" }),
		});
	});

	it("preserves characteristics when only the numeric price is under consultation", async () => {
		const request = new Request(`http://localhost/admin/imoveis/${propertyId}`, {
			method: "POST",
			body: new URLSearchParams({
				intent: "update",
				expectedVersion: "3",
				publicCode: "DEMO-004",
				title: "Imóvel demonstrativo 004",
				slug: "imovel-demonstrativo-004",
				purpose: "sale",
				propertyType: "Casa",
				city: "Cidreira",
				neighborhood: "Monte Alegre",
				priceDisplay: "on_request",
				price: "",
				description: "Casa ótima",
				totalAreaSquareMeters: "180",
				privateAreaSquareMeters: "120",
				lotAreaSquareMeters: "300",
				bedrooms: "3",
				suites: "1",
				bathrooms: "2",
				parkingSpaces: "2",
				features: "Pátio, Churrasqueira",
				isFeatured: "false",
			}),
		});

		const response = await action({
			request,
			context: {},
			params: { propertyId },
		} as unknown as Parameters<typeof action>[0]);

		if (!(response instanceof Response)) throw new Error("Expected a redirect response.");
		expect(update).toHaveBeenCalledWith(
			propertyId,
			expect.objectContaining({
				priceDisplay: "on_request",
				priceInCents: null,
				totalAreaSquareMeters: 180,
				privateAreaSquareMeters: 120,
				lotAreaSquareMeters: 300,
				bedrooms: 3,
				suites: 1,
				bathrooms: 2,
				parkingSpaces: 2,
				features: ["Pátio", "Churrasqueira"],
			}),
		);
		expect(response.headers.get("location")).toBe(`/admin/imoveis/${propertyId}?salvo=1`);
	});

	it("opens a recoverable deleted property without requesting active-only media", async () => {
		findById.mockResolvedValue({
			id: propertyId,
			title: "Rascunho excluído",
			description: "",
			isDeleted: true,
		});
		listMedia.mockRejectedValue(
			new Error("Não foi possível concluir a operação de mídia."),
		);

		const result = await loader({
			request: new Request(`http://localhost/admin/imoveis/${propertyId}`),
			context: {},
			params: { propertyId },
		} as unknown as Parameters<typeof loader>[0]);

		expect(listMedia).not.toHaveBeenCalled();
		expect("data" in result && result.data).toMatchObject({
			property: { id: propertyId, isDeleted: true },
		});
	});

	it("returns to the property list after moving a draft to deleted items", async () => {
		const request = new Request(`http://localhost/admin/imoveis/${propertyId}`, {
			method: "POST",
			body: new URLSearchParams({
				intent: "transition",
				transition: "softDelete",
				expectedVersion: "1",
			}),
		});

		const response = await action({
			request,
			context: {},
			params: { propertyId },
		} as unknown as Parameters<typeof action>[0]);

		if (!(response instanceof Response)) throw new Error("Expected a redirect response.");
		expect(transition).toHaveBeenCalledWith({
			authorizationConfirmed: false,
			propertyId,
			transition: "softDelete",
			expectedVersion: 1,
		});
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("/admin/imoveis");
	});

	it("keeps non-deletion transitions on the property detail", async () => {
		const request = new Request(`http://localhost/admin/imoveis/${propertyId}`, {
			method: "POST",
			body: new URLSearchParams({
				intent: "transition",
				transition: "archive",
				expectedVersion: "1",
			}),
		});

		const response = await action({
			request,
			context: {},
			params: { propertyId },
		} as unknown as Parameters<typeof action>[0]);

		if (!(response instanceof Response)) throw new Error("Expected a redirect response.");
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(`/admin/imoveis/${propertyId}?salvo=1`);
	});

	it("returns editorial transitions to the review step when requested", async () => {
		const request = new Request(`http://localhost/admin/imoveis/${propertyId}`, {
			method: "POST",
			body: new URLSearchParams({
				intent: "transition",
				transition: "archive",
				expectedVersion: "1",
				returnTo: "review",
			}),
		});

		const response = await action({
			request,
			context: {},
			params: { propertyId },
		} as unknown as Parameters<typeof action>[0]);

		if (!(response instanceof Response)) throw new Error("Expected a redirect response.");
		expect(response.headers.get("location")).toBe(
			`/admin/imoveis/${propertyId}/revisar?salvo=1`,
		);
	});
});
