import { describe, expect, it } from "vitest";

import { publicMeta } from "~/lib/public-site/meta";

const matches = [
	{
		id: "routes/public-layout",
		loaderData: {
			brandName: "Cris Chaves Corretor de Imóveis",
			canonicalUrl: "https://crischaves.com.br/imoveis/casa-segura",
		},
	},
];

describe("metadados públicos", () => {
	it("deriva metadados sociais completos do título e da descrição", () => {
		const descriptors = publicMeta(matches, [
			{ title: "Casa segura | Cris Chaves" },
			{ name: "description", content: "Imóvel publicado no litoral gaúcho." },
		]);

		expect(descriptors).toContainEqual({
			property: "og:title",
			content: "Casa segura | Cris Chaves",
		});
		expect(descriptors).toContainEqual({
			property: "og:description",
			content: "Imóvel publicado no litoral gaúcho.",
		});
		expect(descriptors).toContainEqual({
			name: "twitter:title",
			content: "Casa segura | Cris Chaves",
		});
		expect(descriptors).toContainEqual({
			tagName: "link",
			rel: "canonical",
			href: "https://crischaves.com.br/imoveis/casa-segura",
		});
	});

	it("preserva um título Open Graph específico sem duplicá-lo", () => {
		const descriptors = publicMeta(matches, [
			{ title: "Título do documento" },
			{ property: "og:title", content: "Título social específico" },
		]);
		expect(
			descriptors.filter((item) => "property" in item && item.property === "og:title"),
		).toEqual([{ property: "og:title", content: "Título social específico" }]);
	});

	it("preserva a imagem social específica e a reutiliza no cartão do Twitter", () => {
		const image = "https://imoveis.example/media/capa-aprovada";
		const result = publicMeta(matches, [
			{ title: "Imóvel publicado" },
			{ property: "og:image", content: image },
			{ property: "og:image:alt", content: "Fachada do imóvel" },
		]);

		expect(
			result.filter((item) => "property" in item && item.property === "og:image"),
		).toEqual([{ property: "og:image", content: image }]);
		expect(result).toContainEqual({ name: "twitter:image", content: image });
		expect(result).not.toContainEqual({ property: "og:image:width", content: "1200" });
	});
});
