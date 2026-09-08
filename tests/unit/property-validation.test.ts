import { describe, expect, it } from "vitest";

import {
	adminPropertyInputSchema,
	propertyIdSchema,
	propertySlugSchema,
	publicCatalogQuerySchema,
	publicPropertySummarySchema,
} from "~/modules/properties/validation/property-schema";
import { buildSimilarPropertiesUrl } from "~/modules/properties/domain/public-property-links";

const validProperty = {
	publicCode: "TEST-0001",
	slug: "imovel-sintetico",
	title: "Imóvel sintético",
	purpose: "sale",
	propertyType: "house",
	publicationStatus: "draft",
	dealStatus: "available",
	priceDisplay: "show",
	priceInCents: 100_000,
	city: "Cidade teste",
	neighborhood: "Bairro teste",
	description: "Conteúdo exclusivamente sintético.",
	privateAreaSquareMeters: 80,
	lotAreaSquareMeters: 200,
	bedrooms: 2,
	suites: 1,
	bathrooms: 2,
	parkingSpaces: 1,
	isFeatured: false,
	expectedVersion: 1,
} as const;

describe("property validation", () => {
	it("accepts a bounded synthetic property payload", () => {
		expect(adminPropertyInputSchema.parse(validProperty)).toEqual(validProperty);
	});

	it.each([
		["invalid enum", { ...validProperty, dealStatus: "hidden" }],
		["negative price", { ...validProperty, priceInCents: -1 }],
		["unknown field", { ...validProperty, createdBy: crypto.randomUUID() }],
		["missing visible price", { ...validProperty, priceInCents: null }],
		["inconsistent suites", { ...validProperty, suites: 3 }],
	])("rejects %s", (_label, payload) => {
		expect(adminPropertyInputSchema.safeParse(payload).success).toBe(false);
	});

	it("rejects malformed slugs and UUIDs", () => {
		expect(propertySlugSchema.safeParse("Com Espaços").success).toBe(false);
		expect(propertyIdSchema.safeParse("1 OR 1=1").success).toBe(false);
	});

	it("rejects inverted ranges and extra query fields", () => {
		expect(
			publicCatalogQuerySchema.safeParse({
				page: 1,
				pageSize: 12,
				minimumPriceInCents: 200,
				maximumPriceInCents: 100,
			}).success,
		).toBe(false);

		expect(
			publicCatalogQuerySchema.safeParse({ page: 1, pageSize: 12, private: true })
				.success,
		).toBe(false);
	});

	it("rejects any private field added to the public DTO", () => {
		expect(
			publicPropertySummarySchema.safeParse({
				publicCode: "TEST-0001",
				slug: "imovel-sintetico",
				title: "Imóvel sintético",
				purpose: "sale",
				propertyType: "house",
				dealStatus: "available",
				priceInCents: 100_000,
				priceDisplay: "show",
				city: "Cidade teste",
				neighborhood: "Bairro teste",
				privateAreaSquareMeters: 80,
				bedrooms: 2,
				suites: 1,
				bathrooms: 2,
				parkingSpaces: 1,
				coverImageUrl: null,
				coverImageAlt: "",
				exactAddress: "não pode sair no DTO",
			}).success,
		).toBe(false);
	});

	it("keeps sold properties outside the public DTO", () => {
		expect(
			publicPropertySummarySchema.safeParse({
				publicCode: "TEST-0001",
				slug: "imovel-sintetico",
				title: "Imóvel sintético",
				purpose: "sale",
				propertyType: "house",
				dealStatus: "sold",
				priceInCents: 100_000,
				priceDisplay: "show",
				city: "Cidade teste",
				neighborhood: "Bairro teste",
				privateAreaSquareMeters: 80,
				bedrooms: 2,
				suites: 1,
				bathrooms: 2,
				parkingSpaces: 1,
				coverImageUrl: null,
				coverImageAlt: "",
			}).success,
		).toBe(false);
	});

	it("builds the reserved-detail CTA for similar properties", () => {
		expect(
			buildSimilarPropertiesUrl({
				purpose: "sale",
				propertyType: "Casa de praia",
				city: "Tramandaí",
			}),
		).toBe("/?finalidade=venda&tipo=Casa+de+praia&cidade=Tramanda%C3%AD");
	});
});
