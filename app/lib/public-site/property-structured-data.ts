import type { PublicPropertyDetail } from "~/modules/properties";

function absolutePublicUrl(path: string, canonicalUrl: string) {
	return new URL(path, canonicalUrl).toString();
}

export function buildPropertyStructuredData(
	property: PublicPropertyDetail,
	canonicalUrl: string,
	brandName: string,
) {
	const images = property.media
		.filter((media) => media.kind === "image")
		.map((media) => absolutePublicUrl(media.url, canonicalUrl));
	const visiblePrice =
		property.priceDisplay === "show" && property.priceInCents !== null
			? (property.priceInCents / 100).toFixed(2)
			: undefined;
	const catalogUrl = absolutePublicUrl("/", canonicalUrl);

	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "Imóveis",
						item: catalogUrl,
					},
					{
						"@type": "ListItem",
						position: 2,
						name: property.title,
						item: canonicalUrl,
					},
				],
			},
			{
				"@type": "RealEstateListing",
				name: property.title,
				description: property.description,
				identifier: property.publicCode,
				url: canonicalUrl,
				datePosted: property.publishedAt,
				...(images.length > 0 ? { image: images } : {}),
				publisher: {
					"@type": "RealEstateAgent",
					name: brandName,
					url: absolutePublicUrl("/home", canonicalUrl),
				},
				mainEntity: {
					"@type": "Place",
					name: property.title,
					additionalType: property.propertyType,
					containedInPlace: {
						"@type": "Place",
						name: property.neighborhood,
					},
					address: {
						"@type": "PostalAddress",
						addressLocality: property.city,
						addressRegion: "RS",
						addressCountry: "BR",
					},
					...(property.privateAreaSquareMeters !== null
						? {
								floorSize: {
									"@type": "QuantitativeValue",
									value: property.privateAreaSquareMeters,
									unitCode: "MTK",
								},
							}
						: {}),
				},
				offers: {
					"@type": "Offer",
					url: canonicalUrl,
					priceCurrency: "BRL",
					...(visiblePrice ? { price: visiblePrice } : {}),
					availability:
						property.dealStatus === "available"
							? "https://schema.org/InStock"
							: "https://schema.org/Reserved",
					businessFunction:
						property.purpose === "sale"
							? "https://purl.org/goodrelations/v1#Sell"
							: "https://purl.org/goodrelations/v1#LeaseOut",
				},
			},
		],
	};
}
