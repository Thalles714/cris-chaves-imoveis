import type { AppSupabaseClient } from "~/lib/supabase/index.server";

import type {
	PublicPropertyDetail,
	PublicPropertyMedia,
	PublicPropertySummary,
	PublicDealStatus,
} from "../domain/property";
import {
	publicCatalogQuerySchema,
	publicPropertyMediaSchema,
	propertySlugSchema,
} from "../validation/property-schema";
import type {
	PropertyRepository,
	PublicCatalogQuery,
} from "./property-repository.server";

const catalogColumns =
	"public_code,slug,title,purpose,property_type,deal_status,price_in_cents,price_display,city,neighborhood,description,private_area_sqm,land_area_sqm,bedrooms,suites,bathrooms,parking_spaces,featured,published_at";

const mediaColumns =
	"property_code,media_code,media_kind,sort_order,alt_text,is_cover,video_provider,video_id,public_object_path";

function mediaRoute(mediaCode: string) {
	return `/media/${encodeURIComponent(mediaCode)}`;
}

function toPublicMedia(row: {
	media_code: string;
	media_kind: "image" | "video";
	sort_order: number;
	alt_text: string;
	video_provider: "youtube" | "vimeo" | null;
	video_id: string | null;
}): PublicPropertyMedia {
	const url =
		row.media_kind === "image"
			? mediaRoute(row.media_code)
			: row.video_provider === "youtube"
				? `https://www.youtube.com/watch?v=${row.video_id ?? ""}`
				: `https://vimeo.com/${row.video_id ?? ""}`;
	return publicPropertyMediaSchema.parse({
		kind: row.media_kind,
		altText: row.alt_text,
		position: row.sort_order,
		url,
	});
}

function toSummary(
	row: {
		public_code: string;
		slug: string;
		title: string;
		purpose: "sale" | "rent";
		property_type: string;
		deal_status: "available" | "reserved" | "sold";
		price_in_cents: number | null;
		price_display: "show" | "on_request";
		city: string;
		neighborhood: string;
		private_area_sqm: number | null;
		bedrooms: number | null;
		suites: number | null;
		bathrooms: number | null;
		parking_spaces: number | null;
	},
	cover?: { media_code: string; alt_text: string },
): PublicPropertySummary {
	const publicDealStatus: PublicDealStatus =
		row.deal_status === "sold"
			? (() => {
					throw new Error("O catálogo retornou um imóvel indisponível para publicação.");
				})()
			: row.deal_status;
	return {
		publicCode: row.public_code,
		slug: row.slug,
		title: row.title,
		purpose: row.purpose,
		propertyType: row.property_type,
		dealStatus: publicDealStatus,
		priceInCents: row.price_in_cents,
		priceDisplay: row.price_display,
		city: row.city,
		neighborhood: row.neighborhood,
		privateAreaSquareMeters: row.private_area_sqm,
		bedrooms: row.bedrooms,
		suites: row.suites,
		bathrooms: row.bathrooms,
		parkingSpaces: row.parking_spaces,
		coverImageUrl: cover ? mediaRoute(cover.media_code) : null,
		coverImageAlt: cover?.alt_text ?? "",
	};
}

async function loadCoverImages(client: AppSupabaseClient, codes: readonly string[]) {
	const covers = new Map<string, { media_code: string; alt_text: string }>();
	if (codes.length === 0) return covers;

	const mediaResult = await client
		.from("public_property_media")
		.select("property_code,media_code,alt_text")
		.in("property_code", [...codes])
		.eq("media_kind", "image")
		.eq("is_cover", true);
	if (mediaResult.error) throw new Error("Não foi possível consultar as mídias.");
	for (const cover of mediaResult.data ?? []) {
		covers.set(cover.property_code, cover);
	}
	return covers;
}

/** Reads only the allowlisted public projections; private tables are never queried. */
export class SupabasePropertyRepository implements PropertyRepository {
	constructor(private readonly client: AppSupabaseClient) {}

	async listPublished(rawQuery: PublicCatalogQuery) {
		const query = publicCatalogQuerySchema.parse(rawQuery);

		if (query.searchText) {
			const result = await this.client.rpc("search_public_properties", {
				p_search_query: query.searchText,
				p_page: query.page,
				p_page_size: query.pageSize,
				p_city: query.city ?? null,
				p_neighborhood: query.neighborhood ?? null,
				p_purpose: query.purpose ?? null,
				p_property_type: query.propertyType ?? null,
				p_deal_status: query.dealStatus ?? null,
				p_minimum_price_in_cents: query.minimumPriceInCents ?? null,
				p_maximum_price_in_cents: query.maximumPriceInCents ?? null,
				p_minimum_bedrooms: query.minimumBedrooms ?? null,
				p_minimum_parking_spaces: query.minimumParkingSpaces ?? null,
				p_public_code: query.publicCode ?? null,
			});
			if (result.error) throw new Error("Não foi possível pesquisar os imóveis.");
			const rows = result.data ?? [];
			const covers = await loadCoverImages(
				this.client,
				rows.map((row) => row.public_code),
			);
			return {
				items: rows.map((row) => toSummary(row, covers.get(row.public_code))),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: Number(rows[0]?.total_count ?? 0),
			};
		}

		const from = (query.page - 1) * query.pageSize;
		const to = from + query.pageSize - 1;
		let request = this.client
			.from("public_property_catalog")
			.select(catalogColumns, { count: "exact" })
			.order("featured", { ascending: false })
			.order("published_at", { ascending: false })
			.range(from, to);

		if (query.city) request = request.eq("city", query.city);
		if (query.neighborhood) request = request.eq("neighborhood", query.neighborhood);
		if (query.purpose) request = request.eq("purpose", query.purpose);
		if (query.propertyType) request = request.eq("property_type", query.propertyType);
		if (query.dealStatus) request = request.eq("deal_status", query.dealStatus);
		if (query.minimumPriceInCents !== undefined) {
			request = request.gte("price_in_cents", query.minimumPriceInCents);
		}
		if (query.maximumPriceInCents !== undefined) {
			request = request.lte("price_in_cents", query.maximumPriceInCents);
		}
		if (query.minimumBedrooms !== undefined) {
			request = request.gte("bedrooms", query.minimumBedrooms);
		}
		if (query.minimumParkingSpaces !== undefined) {
			request = request.gte("parking_spaces", query.minimumParkingSpaces);
		}
		if (query.publicCode) request = request.eq("public_code", query.publicCode);

		const result = await request;
		if (result.error) throw new Error("Não foi possível consultar o catálogo.");
		const rows = result.data ?? [];
		const codes = rows.map((row) => row.public_code);
		const covers = await loadCoverImages(this.client, codes);

		return {
			items: rows.map((row) => toSummary(row, covers.get(row.public_code))),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: result.count ?? 0,
		};
	}

	async findPublishedBySlug(rawSlug: string): Promise<PublicPropertyDetail | null> {
		const slug = propertySlugSchema.parse(rawSlug);
		const propertyResult = await this.client
			.from("public_property_catalog")
			.select(catalogColumns)
			.eq("slug", slug)
			.maybeSingle();
		if (propertyResult.error) throw new Error("Não foi possível consultar o imóvel.");
		if (!propertyResult.data) return null;

		const mediaResult = await this.client
			.from("public_property_media")
			.select(mediaColumns)
			.eq("property_code", propertyResult.data.public_code)
			.order("sort_order", { ascending: true });
		if (mediaResult.error) throw new Error("Não foi possível consultar as mídias.");
		const mediaRows = mediaResult.data ?? [];
		const cover = mediaRows.find((row) => row.media_kind === "image" && row.is_cover);

		return {
			...toSummary(propertyResult.data, cover),
			description: propertyResult.data.description,
			lotAreaSquareMeters: propertyResult.data.land_area_sqm,
			isFeatured: propertyResult.data.featured,
			publishedAt: propertyResult.data.published_at,
			media: mediaRows.map(toPublicMedia),
		};
	}

	async listPublishedSitemapEntries() {
		const result = await this.client
			.from("public_property_catalog")
			.select("slug,published_at")
			.order("published_at", { ascending: false })
			.limit(1_000);
		if (result.error) throw new Error("Não foi possível gerar o mapa do catálogo.");
		return (result.data ?? []).map((row) => ({
			slug: row.slug,
			publishedAt: row.published_at,
		}));
	}
}
