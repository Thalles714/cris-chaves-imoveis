import { describe, expect, it } from "vitest";

import {
	InvalidCatalogQueryError,
	parsePublicCatalogSearch,
} from "~/modules/properties/server/public-query.server";
import { EmptyPropertyRepository } from "~/modules/properties/server/empty-property-repository.server";

describe("consulta pública do catálogo", () => {
	it("converte filtros públicos para o contrato interno", () => {
		const query = parsePublicCatalogSearch(
			new URL(
				"https://example.com/imoveis?busca=casa+na+beira+da+praia&finalidade=venda&cidade=Tramanda%C3%AD&preco_min=250000&preco_max=800000&dormitorios=2&vagas=1&codigo=imv-007&pagina=3",
			),
		);

		expect(query).toEqual({
			page: 3,
			pageSize: 12,
			searchText: "casa na beira da praia",
			purpose: "sale",
			propertyType: undefined,
			city: "Tramandaí",
			neighborhood: undefined,
			minimumPriceInCents: 25_000_000,
			maximumPriceInCents: 80_000_000,
			minimumBedrooms: 2,
			minimumParkingSpaces: 1,
			publicCode: "IMV-007",
		});
	});

	it.each([
		"?desconhecido=1",
		"?cidade=Cidreira&cidade=Tramandai",
		"?preco_min=900000&preco_max=100000",
		"?pagina=0",
		"?busca=a",
		`?busca=${"a".repeat(161)}`,
		"?codigo=%3Cscript%3E",
	])("rejeita parâmetros ambíguos ou inválidos: %s", (search) => {
		expect(() =>
			parsePublicCatalogSearch(new URL(`https://example.com/imoveis${search}`)),
		).toThrow(InvalidCatalogQueryError);
	});

	it("mantém o catálogo de desenvolvimento realmente vazio", async () => {
		const repository = new EmptyPropertyRepository();
		await expect(repository.listPublished({ page: 2, pageSize: 12 })).resolves.toEqual({
			items: [],
			page: 2,
			pageSize: 12,
			totalItems: 0,
		});
		await expect(
			repository.findPublishedBySlug("imovel-inexistente"),
		).resolves.toBeNull();
		await expect(repository.listPublishedSitemapEntries()).resolves.toEqual([]);
	});
});
