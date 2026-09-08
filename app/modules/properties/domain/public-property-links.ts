import type { PublicPropertySummary } from "./property";

export function buildSimilarPropertiesUrl(
	property: Pick<PublicPropertySummary, "purpose" | "propertyType" | "city">,
) {
	const params = new URLSearchParams({
		finalidade: property.purpose === "sale" ? "venda" : "aluguel",
		tipo: property.propertyType,
		cidade: property.city,
	});
	return `/?${params.toString()}`;
}
