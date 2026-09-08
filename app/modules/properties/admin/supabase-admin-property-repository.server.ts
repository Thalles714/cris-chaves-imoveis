import type { Database } from "~/lib/supabase/database.types";
import type { AppSupabaseClient } from "~/lib/supabase/index.server";

import {
	adminPropertyDraftInputSchema,
	adminPropertyPrivateInputSchema,
	adminPropertyQuerySchema,
	adminPropertyTransitionSchema,
	adminPropertyUpdateInputSchema,
	type AdminPropertyEditRecord,
	type AdminPropertyListItem,
} from "./admin-property";
import {
	AdminPropertyConflictError,
	type AdminPropertyRepository,
} from "./admin-property-repository.server";
import { propertyIdSchema } from "../validation/property-schema";

const columns =
	"id,public_code,title,purpose,property_type,publication_status,deal_status,price_display,price_in_cents,city,neighborhood,featured,updated_at,version,deleted_at";
const editColumns = `${columns},slug,description,total_area_sqm,private_area_sqm,land_area_sqm,bedrooms,suites,bathrooms,parking_spaces,features`;
const privateColumns =
	"address_line,address_number,address_complement,postal_code,owner_name,owner_contact,internal_notes,version";

type PropertyRow = Pick<
	Database["public"]["Tables"]["properties"]["Row"],
	| "id"
	| "public_code"
	| "title"
	| "purpose"
	| "property_type"
	| "publication_status"
	| "deal_status"
	| "price_display"
	| "price_in_cents"
	| "city"
	| "neighborhood"
	| "featured"
	| "updated_at"
	| "version"
	| "deleted_at"
>;

type PropertyEditRow = PropertyRow &
	Pick<
		Database["public"]["Tables"]["properties"]["Row"],
		| "slug"
		| "description"
		| "total_area_sqm"
		| "private_area_sqm"
		| "land_area_sqm"
		| "bedrooms"
		| "suites"
		| "bathrooms"
		| "parking_spaces"
		| "features"
	>;

type PrivateRow = Pick<
	Database["public"]["Tables"]["property_private_details"]["Row"],
	| "address_line"
	| "address_number"
	| "address_complement"
	| "postal_code"
	| "owner_name"
	| "owner_contact"
	| "internal_notes"
	| "version"
>;

type RpcErrorLike = {
	code?: string;
};

function isMissingCurrentPublishFunction(error: RpcErrorLike | null) {
	return error?.code === "PGRST202" || error?.code === "PGRST203";
}

const emptyPrivateDetails: AdminPropertyEditRecord["privateDetails"] = {
	addressLine: null,
	addressNumber: null,
	addressComplement: null,
	postalCode: null,
	ownerName: null,
	ownerContact: null,
	internalNotes: null,
	version: 0,
};

function toPrivateDetails(
	row: PrivateRow | null,
): AdminPropertyEditRecord["privateDetails"] {
	if (!row) return emptyPrivateDetails;
	return {
		addressLine: row.address_line,
		addressNumber: row.address_number,
		addressComplement: row.address_complement,
		postalCode: row.postal_code,
		ownerName: row.owner_name,
		ownerContact: row.owner_contact,
		internalNotes: row.internal_notes,
		version: row.version,
	};
}

function toListItem(row: PropertyRow): AdminPropertyListItem {
	return {
		id: row.id,
		publicCode: row.public_code,
		title: row.title,
		purpose: row.purpose,
		propertyType: row.property_type,
		publicationStatus: row.publication_status,
		dealStatus: row.deal_status,
		priceDisplay: row.price_display,
		priceInCents: row.price_in_cents,
		city: row.city,
		neighborhood: row.neighborhood,
		isFeatured: row.featured,
		updatedAt: row.updated_at,
		version: row.version,
		isDeleted: row.deleted_at !== null,
	};
}

function writePayload(input: ReturnType<typeof adminPropertyDraftInputSchema.parse>) {
	return {
		public_code: input.publicCode,
		slug: input.slug,
		title: input.title,
		purpose: input.purpose,
		property_type: input.propertyType,
		price_display: input.priceDisplay,
		price_in_cents: input.priceInCents,
		city: input.city,
		neighborhood: input.neighborhood,
		description: input.description,
		total_area_sqm: input.totalAreaSquareMeters,
		private_area_sqm: input.privateAreaSquareMeters,
		land_area_sqm: input.lotAreaSquareMeters,
		bedrooms: input.bedrooms,
		suites: input.suites,
		bathrooms: input.bathrooms,
		parking_spaces: input.parkingSpaces,
		features: input.features,
		featured: input.isFeatured,
	};
}

export class SupabaseAdminPropertyRepository implements AdminPropertyRepository {
	constructor(private readonly client: AppSupabaseClient) {}

	async summary() {
		const activeCount = (status?: "draft" | "published" | "archived") => {
			let request = this.client
				.from("properties")
				.select("id", { count: "exact", head: true })
				.is("deleted_at", null);
			if (status) request = request.eq("publication_status", status);
			return request;
		};
		const [total, drafts, published, archived, deleted] = await Promise.all([
			activeCount(),
			activeCount("draft"),
			activeCount("published"),
			activeCount("archived"),
			this.client
				.from("properties")
				.select("id", { count: "exact", head: true })
				.not("deleted_at", "is", null),
		]);
		if ([total, drafts, published, archived, deleted].some((item) => item.error)) {
			throw new Error("Não foi possível consultar o resumo dos imóveis.");
		}
		return {
			total: total.count ?? 0,
			drafts: drafts.count ?? 0,
			published: published.count ?? 0,
			archived: archived.count ?? 0,
			deleted: deleted.count ?? 0,
		};
	}

	async list(rawQuery: Parameters<AdminPropertyRepository["list"]>[0]) {
		const query = adminPropertyQuerySchema.parse(rawQuery);
		const from = (query.page - 1) * query.pageSize;
		const to = from + query.pageSize - 1;
		let request = this.client
			.from("properties")
			.select(columns, { count: "exact" })
			.order("updated_at", { ascending: false })
			.range(from, to);

		request = query.showDeleted
			? request.not("deleted_at", "is", null)
			: request.is("deleted_at", null);
		if (query.search) {
			request = request.or(
				`title.ilike.%${query.search}%,public_code.ilike.%${query.search}%`,
			);
		}
		if (query.publicationStatus) {
			request = request.eq("publication_status", query.publicationStatus);
		}
		if (query.dealStatus) request = request.eq("deal_status", query.dealStatus);

		const result = await request;
		if (result.error) throw new Error("Não foi possível consultar os imóveis.");
		return {
			items: (result.data ?? []).map((row) => toListItem(row)),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: result.count ?? 0,
		};
	}

	async findById(rawPropertyId: string) {
		const propertyId = propertyIdSchema.parse(rawPropertyId);
		const [result, privateResult] = await Promise.all([
			this.client
				.from("properties")
				.select(editColumns)
				.eq("id", propertyId)
				.maybeSingle(),
			this.client
				.from("property_private_details")
				.select(privateColumns)
				.eq("property_id", propertyId)
				.is("deleted_at", null)
				.maybeSingle(),
		]);
		if (result.error || privateResult.error) {
			throw new Error("Não foi possível consultar o imóvel.");
		}
		if (!result.data) return null;
		const row = result.data as PropertyEditRow;
		return {
			...toListItem(row),
			slug: row.slug,
			description: row.description,
			totalAreaSquareMeters: row.total_area_sqm,
			privateAreaSquareMeters: row.private_area_sqm,
			lotAreaSquareMeters: row.land_area_sqm,
			bedrooms: row.bedrooms,
			suites: row.suites,
			bathrooms: row.bathrooms,
			parkingSpaces: row.parking_spaces,
			features: row.features,
			privateDetails: toPrivateDetails(privateResult.data),
		};
	}

	async createDraft(rawInput: Parameters<AdminPropertyRepository["createDraft"]>[0]) {
		const input = adminPropertyDraftInputSchema.parse(rawInput);
		const result = await this.client
			.from("properties")
			.insert({
				...writePayload(input),
				publication_status: "draft",
				deal_status: "available",
			})
			.select(columns)
			.single();
		if (result.error || !result.data) {
			throw new Error("Não foi possível criar o imóvel.");
		}
		return toListItem(result.data);
	}

	async update(
		rawPropertyId: string,
		rawInput: Parameters<AdminPropertyRepository["update"]>[1],
	) {
		const propertyId = propertyIdSchema.parse(rawPropertyId);
		const input = adminPropertyUpdateInputSchema.parse(rawInput);
		const result = await this.client
			.from("properties")
			.update(writePayload(input))
			.eq("id", propertyId)
			.eq("version", input.expectedVersion)
			.select(columns)
			.maybeSingle();
		if (result.error || !result.data) throw new AdminPropertyConflictError();
		return toListItem(result.data);
	}

	async updatePrivate(
		rawPropertyId: string,
		rawInput: Parameters<AdminPropertyRepository["updatePrivate"]>[1],
	) {
		const propertyId = propertyIdSchema.parse(rawPropertyId);
		const input = adminPropertyPrivateInputSchema.parse(rawInput);
		const values = {
			address_line: input.addressLine,
			address_number: input.addressNumber,
			address_complement: input.addressComplement,
			postal_code: input.postalCode,
			owner_name: input.ownerName,
			owner_contact: input.ownerContact,
			internal_notes: input.internalNotes,
		};
		const request =
			input.expectedVersion === 0
				? this.client
						.from("property_private_details")
						.insert({ property_id: propertyId, ...values })
						.select(privateColumns)
						.maybeSingle()
				: this.client
						.from("property_private_details")
						.update(values)
						.eq("property_id", propertyId)
						.eq("version", input.expectedVersion)
						.select(privateColumns)
						.maybeSingle();
		const result = await request;
		if (result.error || !result.data) throw new AdminPropertyConflictError();
		return toPrivateDetails(result.data);
	}

	async transition(rawInput: Parameters<AdminPropertyRepository["transition"]>[0]) {
		const input = adminPropertyTransitionSchema.parse(rawInput);
		if (input.transition === "publish") {
			const result = await this.client.rpc("publish_property", {
				p_property_id: input.propertyId,
				p_expected_version: input.expectedVersion,
				p_authorization_confirmed: input.authorizationConfirmed,
			});

			// Compatibilidade temporária com o banco remoto anterior à migration que
			// simplifica a autorização. O operador não precisa preencher uma etapa:
			// a confirmação final é registrada e a função versionada antiga é chamada.
			if (isMissingCurrentPublishFunction(result.error)) {
				const legacyConfirmation = await this.client
					.from("property_private_details")
					.upsert(
						{
							property_id: input.propertyId,
							authorization_reference: "Confirmação realizada no ato da publicação.",
							authorization_confirmed_at: new Date().toISOString(),
						},
						{ onConflict: "property_id" },
					);
				if (legacyConfirmation.error) throw new AdminPropertyConflictError();

				const legacyClient = this.client as unknown as {
					rpc(
						name: "publish_property",
						args: { p_property_id: string; p_expected_version: number },
					): Promise<{ data: PropertyRow | null; error: RpcErrorLike | null }>;
				};
				const legacyResult = await legacyClient.rpc("publish_property", {
					p_property_id: input.propertyId,
					p_expected_version: input.expectedVersion,
				});
				if (legacyResult.error || !legacyResult.data) {
					throw new AdminPropertyConflictError();
				}
				return toListItem(legacyResult.data);
			}
			if (result.error || !result.data) throw new AdminPropertyConflictError();
			return toListItem(result.data);
		}
		const now = new Date().toISOString();
		const changes: Database["public"]["Tables"]["properties"]["Update"] =
			input.transition === "archive"
				? { publication_status: "archived" }
				: input.transition === "restore"
					? { publication_status: "draft", deleted_at: null }
					: input.transition === "reserve"
						? { deal_status: "reserved" }
						: input.transition === "releaseReservation"
							? { deal_status: "available" }
							: input.transition === "markSold"
								? { deal_status: "sold" }
								: { publication_status: "archived", deleted_at: now };
		const result = await this.client
			.from("properties")
			.update(changes)
			.eq("id", input.propertyId)
			.eq("version", input.expectedVersion)
			.select(columns)
			.maybeSingle();
		if (result.error || !result.data) throw new AdminPropertyConflictError();
		return toListItem(result.data);
	}
}
