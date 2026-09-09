import { describe, expect, it } from "vitest";

import { buildPropertyStructuredData } from "~/lib/public-site/property-structured-data";
import type { PublicPropertyDetail } from "~/modules/properties";

const property: PublicPropertyDetail = {
	publicCode: "CC-TESTE",
	slug: "casa-teste",
	title: "Casa de teste",
	purpose: "sale",
	city: "Cidreira",
	neighborhood: "Centro",
	dealStatus: "available",
	propertyType: "Casa",
	priceDisplay: "show",
	priceInCents: 450_000_00,
	bedrooms: 3,
	suites: 1,
	bathrooms: 2,
	parkingSpaces: 2,
	privateAreaSquareMeters: 120,
	coverImageUrl: "/media/capa",
	coverImageAlt: "Fachada da casa",
	description: "Casa publicada sem endereço exato.",
	lotAreaSquareMeters: 300,
	isFeatured: false,
	publishedAt: "2026-09-08T12:00:00.000Z",
	media: [{ kind: "image", altText: "Fachada", position: 0, url: "/media/capa" }],
};

describe("dados estruturados do imóvel", () => {
	it("descreve anúncio, oferta e breadcrumb sem endereço privado", () => {
		const result = buildPropertyStructuredData(
			property,
			"https://crischaves.com.br/imoveis/casa-teste",
			"Cris Chaves Corretor de Imóveis",
		);
		const serialized = JSON.stringify(result);

		expect(result["@graph"][0]).toMatchObject({ "@type": "BreadcrumbList" });
		expect(result["@graph"][1]).toMatchObject({
			"@type": "RealEstateListing",
			identifier: "CC-TESTE",
			offers: { price: "450000.00", priceCurrency: "BRL" },
		});
		expect(serialized).toContain("Cidreira");
		expect(serialized).toContain("Centro");
		expect(serialized).not.toContain("address_line");
		expect(serialized).not.toContain("postalCode");
	});

	it("não inventa preço quando o valor está sob consulta", () => {
		const result = buildPropertyStructuredData(
			{ ...property, priceDisplay: "on_request", priceInCents: null },
			"https://crischaves.com.br/imoveis/casa-teste",
			"Cris Chaves Corretor de Imóveis",
		);
		const listing = result["@graph"].find(
			(item) => item["@type"] === "RealEstateListing",
		);

		expect(listing).toBeDefined();
		expect(listing).toHaveProperty("offers");
		if (!listing || !("offers" in listing))
			throw new Error("Anúncio estruturado ausente.");
		expect(listing.offers).not.toHaveProperty("price");
	});
});
