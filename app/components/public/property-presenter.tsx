import type { PublicPropertySummary } from "~/modules/properties";
import { PropertyCard } from "~/components/ui";

const purposeLabels = { sale: "Venda", rent: "Aluguel" } as const;
const statusLabels = {
	available: "Disponível",
	reserved: "Reservado",
} as const;

export function formatPropertyPrice(property: PublicPropertySummary) {
	if (property.priceDisplay === "on_request" || property.priceInCents === null) {
		return "Sob consulta";
	}
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: 0,
	}).format(property.priceInCents / 100);
}

export function PublicPropertyCard({ property }: { property: PublicPropertySummary }) {
	const facts: Array<{ label: string; value: string | number }> = [];
	if (property.bedrooms !== null) {
		facts.push({ label: "Dormitórios", value: property.bedrooms });
	}
	if (property.bathrooms !== null) {
		facts.push({ label: "Banheiros", value: property.bathrooms });
	}
	if (property.parkingSpaces !== null) {
		facts.push({ label: "Vagas", value: property.parkingSpaces });
	}
	if (property.privateAreaSquareMeters !== null) {
		facts.push({ label: "Área", value: `${property.privateAreaSquareMeters} m²` });
	}

	return (
		<PropertyCard
			title={property.title}
			href={`/imoveis/${property.slug}`}
			imageSrc={property.coverImageUrl ?? undefined}
			imageAlt={property.coverImageAlt}
			location={`${property.neighborhood}, ${property.city}`}
			purpose={purposeLabels[property.purpose]}
			price={formatPropertyPrice(property)}
			code={property.publicCode}
			status={statusLabels[property.dealStatus]}
			statusTone={property.dealStatus === "available" ? "success" : "neutral"}
			facts={facts}
		/>
	);
}
