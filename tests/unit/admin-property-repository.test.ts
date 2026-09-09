// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import type { AppSupabaseClient } from "~/lib/supabase/index.server";
import {
	AdminPropertyConflictError,
	SupabaseAdminPropertyRepository,
} from "~/modules/properties/admin/index.server";

const propertyId = "10000000-0000-4000-8000-000000000001";
const validUpdate = {
	publicCode: "IMV-001",
	slug: "casa-em-cidreira",
	title: "Casa em Cidreira",
	purpose: "sale" as const,
	propertyType: "Casa",
	priceDisplay: "show" as const,
	priceInCents: 450_000_00,
	city: "Cidreira",
	neighborhood: "Centro",
	description: "Casa próxima ao mar.",
	totalAreaSquareMeters: 180,
	privateAreaSquareMeters: 120,
	lotAreaSquareMeters: 300,
	bedrooms: 3,
	suites: 1,
	bathrooms: 2,
	parkingSpaces: 2,
	features: ["Pátio"],
	isFeatured: false,
	expectedVersion: 7,
};

function updateHarness(result: { data: unknown; error: unknown }) {
	const maybeSingle = vi.fn().mockResolvedValue(result);
	const select = vi.fn().mockReturnValue({ maybeSingle });
	const eq = vi.fn();
	const filter = { eq, select };
	eq.mockReturnValue(filter);
	const update = vi.fn().mockReturnValue(filter);
	const from = vi.fn().mockReturnValue({ update });
	const rpc = vi.fn().mockResolvedValue(result);
	const client = { from, rpc } as unknown as AppSupabaseClient;

	return {
		repository: new SupabaseAdminPropertyRepository(client),
		spies: { eq, from, maybeSingle, rpc, select, update },
	};
}

describe("admin property repository concurrency", () => {
	it("uses the record id and expected version for an administrative update", async () => {
		const updatedRow = {
			id: propertyId,
			public_code: validUpdate.publicCode,
			title: validUpdate.title,
			purpose: validUpdate.purpose,
			property_type: validUpdate.propertyType,
			publication_status: "draft",
			deal_status: "available",
			price_display: validUpdate.priceDisplay,
			price_in_cents: validUpdate.priceInCents,
			city: validUpdate.city,
			neighborhood: validUpdate.neighborhood,
			featured: validUpdate.isFeatured,
			updated_at: "2026-09-03T12:00:00.000Z",
			version: 8,
			deleted_at: null,
		};
		const setup = updateHarness({ data: updatedRow, error: null });

		await expect(setup.repository.update(propertyId, validUpdate)).resolves.toMatchObject(
			{
				id: propertyId,
				version: 8,
			},
		);
		expect(setup.spies.from).toHaveBeenCalledWith("properties");
		expect(setup.spies.eq).toHaveBeenNthCalledWith(1, "id", propertyId);
		expect(setup.spies.eq).toHaveBeenNthCalledWith(
			2,
			"version",
			validUpdate.expectedVersion,
		);
	});

	it.each([
		{ data: null, error: null },
		{ data: null, error: new Error("serialization failure") },
	])("reports a conflict when the versioned write changes no row", async (result) => {
		const setup = updateHarness(result);

		await expect(setup.repository.update(propertyId, validUpdate)).rejects.toBeInstanceOf(
			AdminPropertyConflictError,
		);
	});

	it.each([
		["publish", { publication_status: "published" }],
		["archive", { publication_status: "archived" }],
		["restore", { publication_status: "draft", deleted_at: null }],
		["reserve", { deal_status: "reserved" }],
		["releaseReservation", { deal_status: "available" }],
		["markSold", { deal_status: "sold" }],
	] as const)(
		"maps the %s transition to an optimistic database write",
		async (transition, changes) => {
			const updatedRow = {
				id: propertyId,
				public_code: validUpdate.publicCode,
				title: validUpdate.title,
				purpose: validUpdate.purpose,
				property_type: validUpdate.propertyType,
				publication_status:
					transition === "publish"
						? "published"
						: transition === "archive"
							? "archived"
							: "draft",
				deal_status:
					transition === "reserve"
						? "reserved"
						: transition === "releaseReservation"
							? "available"
							: transition === "markSold"
								? "sold"
								: "available",
				price_display: validUpdate.priceDisplay,
				price_in_cents: validUpdate.priceInCents,
				city: validUpdate.city,
				neighborhood: validUpdate.neighborhood,
				featured: validUpdate.isFeatured,
				updated_at: "2026-09-03T12:00:00.000Z",
				version: 8,
				deleted_at: null,
			};
			const setup = updateHarness({ data: updatedRow, error: null });

			await expect(
				setup.repository.transition({
					propertyId,
					expectedVersion: validUpdate.expectedVersion,
					transition,
					authorizationConfirmed: transition === "publish",
				}),
			).resolves.toMatchObject({ version: 8 });
			if (transition === "publish") {
				expect(setup.spies.rpc).toHaveBeenCalledWith("publish_property", {
					p_property_id: propertyId,
					p_expected_version: validUpdate.expectedVersion,
					p_authorization_confirmed: true,
				});
				expect(setup.spies.update).not.toHaveBeenCalled();
			} else {
				expect(setup.spies.update).toHaveBeenCalledWith(changes);
				expect(setup.spies.eq).toHaveBeenNthCalledWith(1, "id", propertyId);
				expect(setup.spies.eq).toHaveBeenNthCalledWith(
					2,
					"version",
					validUpdate.expectedVersion,
				);
			}
		},
	);

	it("updates optional private details without touching legacy authorization columns", async () => {
		const privateRow = {
			property_id: propertyId,
			address_line: "Rua das Flores",
			address_number: "42",
			address_complement: null,
			postal_code: null,
			owner_name: "Maria",
			owner_contact: null,
			internal_notes: "Chave na imobiliária.",
			authorization_reference: null,
			authorization_confirmed_at: null,
			version: 2,
		};
		const setup = updateHarness({ data: privateRow, error: null });

		await setup.repository.updatePrivate(propertyId, {
			addressLine: "Rua das Flores",
			addressNumber: "42",
			addressComplement: null,
			postalCode: null,
			ownerName: "Maria",
			ownerContact: null,
			internalNotes: "Chave na imobiliária.",
			expectedVersion: 1,
		});

		const payload = setup.spies.update.mock.calls[0]?.[0] as Record<string, unknown>;
		expect(payload).not.toHaveProperty("authorization_reference");
		expect(payload).not.toHaveProperty("authorization_confirmed_at");
	});

	it("fails closed when the current publication contract is unavailable", async () => {
		const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST202" } });
		const from = vi.fn();
		const repository = new SupabaseAdminPropertyRepository({
			from,
			rpc,
		} as unknown as AppSupabaseClient);

		await expect(
			repository.transition({
				propertyId,
				expectedVersion: validUpdate.expectedVersion,
				transition: "publish",
				authorizationConfirmed: true,
			}),
		).rejects.toThrow(AdminPropertyConflictError);

		expect(rpc).toHaveBeenCalledTimes(1);
		expect(rpc).toHaveBeenCalledWith("publish_property", {
			p_property_id: propertyId,
			p_expected_version: validUpdate.expectedVersion,
			p_authorization_confirmed: true,
		});
		expect(from).not.toHaveBeenCalled();
	});

	it("archives and timestamps a soft delete without accepting a client timestamp", async () => {
		const setup = updateHarness({ data: null, error: null });

		await expect(
			setup.repository.transition({
				propertyId,
				expectedVersion: validUpdate.expectedVersion,
				transition: "softDelete",
				authorizationConfirmed: false,
			}),
		).rejects.toBeInstanceOf(AdminPropertyConflictError);
		expect(setup.spies.update).toHaveBeenCalledOnce();
		const changes = setup.spies.update.mock.calls[0]?.[0] as {
			deleted_at: string;
			publication_status: string;
		};
		expect(changes.publication_status).toBe("archived");
		expect(Number.isNaN(Date.parse(changes.deleted_at))).toBe(false);
	});
});
