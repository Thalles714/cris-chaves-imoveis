export const publicationStatuses = ["draft", "published", "archived"] as const;
export const dealStatuses = ["available", "reserved", "sold"] as const;
export const publicDealStatuses = ["available", "reserved"] as const;
export const propertyPurposes = ["sale", "rent"] as const;
export const priceDisplays = ["show", "on_request"] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];
export type DealStatus = (typeof dealStatuses)[number];
export type PublicDealStatus = (typeof publicDealStatuses)[number];
export type PropertyPurpose = (typeof propertyPurposes)[number];
export type PriceDisplay = (typeof priceDisplays)[number];

/**
 * Deliberately excludes exact address, internal notes, ownership documents,
 * audit data, user identifiers and every other administrative field.
 */
export interface PublicPropertySummary {
	publicCode: string;
	slug: string;
	title: string;
	purpose: PropertyPurpose;
	city: string;
	neighborhood: string;
	dealStatus: PublicDealStatus;
	propertyType: string;
	priceDisplay: PriceDisplay;
	priceInCents: number | null;
	bedrooms: number | null;
	suites: number | null;
	bathrooms: number | null;
	parkingSpaces: number | null;
	privateAreaSquareMeters: number | null;
	coverImageUrl: string | null;
	coverImageAlt: string;
}

export interface PublicPropertyDetail extends PublicPropertySummary {
	description: string;
	lotAreaSquareMeters: number | null;
	isFeatured: boolean;
	publishedAt: string;
	media: readonly PublicPropertyMedia[];
}

export interface PublicPropertyMedia {
	kind: "image" | "video";
	altText: string;
	position: number;
	url: string;
}

export interface PublicCatalogPage {
	items: readonly PublicPropertySummary[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface PublicPropertySitemapEntry {
	slug: string;
	publishedAt: string;
}
