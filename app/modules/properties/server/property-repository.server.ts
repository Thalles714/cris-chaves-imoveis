import type {
	PropertyPurpose,
	PublicDealStatus,
	PublicCatalogPage,
	PublicPropertyDetail,
	PublicPropertySitemapEntry,
} from "../domain/property";

export interface PublicCatalogQuery {
	page: number;
	pageSize: number;
	searchText?: string;
	city?: string;
	neighborhood?: string;
	purpose?: PropertyPurpose;
	propertyType?: string;
	dealStatus?: PublicDealStatus;
	minimumPriceInCents?: number;
	maximumPriceInCents?: number;
	minimumBedrooms?: number;
	minimumParkingSpaces?: number;
	publicCode?: string;
}

/**
 * Server-side port. A later stage will provide the Supabase implementation;
 * browser modules must depend on public DTOs, never on database rows.
 */
export interface PropertyRepository {
	listPublished(query: PublicCatalogQuery): Promise<PublicCatalogPage>;
	findPublishedBySlug(slug: string): Promise<PublicPropertyDetail | null>;
	listPublishedSitemapEntries(): Promise<readonly PublicPropertySitemapEntry[]>;
}
