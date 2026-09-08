import { describe, expect, it } from "vitest";

import {
	adminPropertyDraftInputSchema,
	adminPropertyPrivateInputSchema,
	adminPropertyTransitionSchema,
	adminPropertyUpdateInputSchema,
	parseAdminPropertyQuery,
} from "~/modules/properties/admin/admin-property";
import { AdminPropertyConflictError } from "~/modules/properties/admin/admin-property-repository.server";

const validDraft = {
	publicCode: "IMV-001",
	slug: "casa-em-cidreira",
	title: "Casa em Cidreira",
	purpose: "sale" as const,
	propertyType: "Casa",
	priceDisplay: "show" as const,
	priceInCents: 450_000_00,
	city: "Cidreira",
	neighborhood: "Centro",
	description: "",
	totalAreaSquareMeters: 180,
	privateAreaSquareMeters: 120,
	lotAreaSquareMeters: 300,
	bedrooms: 3,
	suites: 1,
	bathrooms: 2,
	parkingSpaces: 2,
	features: ["Pátio"],
	isFeatured: false,
};

describe("admin property contracts", () => {
	it("accepts a complete draft without allowing a publication state", () => {
		expect(adminPropertyDraftInputSchema.parse(validDraft)).toEqual(validDraft);
		expect(
			adminPropertyDraftInputSchema.safeParse({
				...validDraft,
				publicationStatus: "published",
			}).success,
		).toBe(false);
	});

	it("requires consistent price and bedroom values", () => {
		expect(
			adminPropertyDraftInputSchema.safeParse({
				...validDraft,
				priceDisplay: "on_request",
			}).success,
		).toBe(false);
		expect(
			adminPropertyDraftInputSchema.safeParse({
				...validDraft,
				bedrooms: 1,
				suites: 2,
			}).success,
		).toBe(false);
	});

	it("accepts a complete optimistic-concurrency update contract", () => {
		expect(
			adminPropertyUpdateInputSchema.parse({
				...validDraft,
				expectedVersion: 7,
			}),
		).toEqual({ ...validDraft, expectedVersion: 7 });

		expect(
			adminPropertyUpdateInputSchema.safeParse({
				...validDraft,
				expectedVersion: 0,
			}).success,
		).toBe(false);
	});

	it("normalizes empty private fields without accepting client-managed audit data", () => {
		const parsed = adminPropertyPrivateInputSchema.parse({
			addressLine: " Rua das Flores ",
			addressNumber: " 42 ",
			addressComplement: "  ",
			postalCode: "95555-000",
			ownerName: " ",
			ownerContact: "",
			internalNotes: " Visita somente pela manhã ",
			expectedVersion: 0,
		});

		expect(parsed).toEqual({
			addressLine: "Rua das Flores",
			addressNumber: "42",
			addressComplement: null,
			postalCode: "95555-000",
			ownerName: null,
			ownerContact: null,
			internalNotes: "Visita somente pela manhã",
			expectedVersion: 0,
		});
		expect(
			adminPropertyPrivateInputSchema.safeParse({
				...parsed,
				authorizationConfirmedBy: "10000000-0000-4000-8000-000000000001",
			}).success,
		).toBe(false);
	});

	it("rejects obsolete authorization fields from the operational form", () => {
		const result = adminPropertyPrivateInputSchema.safeParse({
			addressLine: "Rua Petúnia",
			addressNumber: "2215",
			addressComplement: "",
			postalCode: "",
			ownerName: "",
			ownerContact: "",
			internalNotes: "Chave com o proprietário. Aceita proposta.",
			authorizationConfirmed: true,
			expectedVersion: 0,
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0]?.code).toBe("unrecognized_keys");
	});

	it("normalizes the allowlisted listing filters", () => {
		const query = parseAdminPropertyQuery(
			new URL(
				"https://example.test/admin/imoveis?pagina=2&busca=Casa&status=draft&negociacao=available",
			),
		);
		expect(query).toEqual({
			page: 2,
			pageSize: 20,
			search: "Casa",
			publicationStatus: "draft",
			dealStatus: "available",
			showDeleted: false,
		});
	});

	it("rejects PostgREST filter syntax in the search field", () => {
		expect(() =>
			parseAdminPropertyQuery(
				new URL(
					"https://example.test/admin/imoveis?busca=Casa%25%2Cdeleted_at.not.is.null",
				),
			),
		).toThrow();
	});

	it("rejects malformed transition identifiers and versions", () => {
		expect(
			adminPropertyTransitionSchema.safeParse({
				propertyId: "../outro-imovel",
				expectedVersion: 0,
				transition: "publish",
			}).success,
		).toBe(false);
	});

	it("allows only the named editorial and commercial transitions", () => {
		const propertyId = "10000000-0000-4000-8000-000000000001";
		const transitions = [
			"publish",
			"archive",
			"restore",
			"reserve",
			"releaseReservation",
			"markSold",
			"softDelete",
		] as const;

		for (const transition of transitions) {
			expect(
				adminPropertyTransitionSchema.safeParse({
					propertyId,
					expectedVersion: 3,
					transition,
					authorizationConfirmed: transition === "publish",
				}).success,
				transition,
			).toBe(true);
		}
		expect(
			adminPropertyTransitionSchema.safeParse({
				propertyId,
				expectedVersion: 3,
				transition: "hardDelete",
			}).success,
		).toBe(false);
	});

	it("requires a simple written-authorization confirmation only when publishing", () => {
		const propertyId = "10000000-0000-4000-8000-000000000001";
		expect(
			adminPropertyTransitionSchema.safeParse({
				propertyId,
				expectedVersion: 3,
				transition: "publish",
				authorizationConfirmed: false,
			}).success,
		).toBe(false);
	});

	it("exposes a stable, non-technical conflict for stale writes", () => {
		const conflict = new AdminPropertyConflictError();

		expect(conflict.name).toBe("AdminPropertyConflictError");
		expect(conflict.message).toBe(
			"O imóvel foi alterado em outra sessão. Atualize a página antes de continuar.",
		);
	});
});
