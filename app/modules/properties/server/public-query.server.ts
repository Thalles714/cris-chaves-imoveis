import { z } from "zod";

import type { PublicCatalogQuery } from "./property-repository.server";

const allowedKeys = new Set([
	"pagina",
	"busca",
	"finalidade",
	"tipo",
	"cidade",
	"bairro",
	"preco_min",
	"preco_max",
	"dormitorios",
	"vagas",
	"codigo",
]);

const querySchema = z
	.object({
		pagina: z.coerce.number().int().min(1).max(10_000).default(1),
		busca: z.string().trim().min(2).max(160).optional(),
		finalidade: z.enum(["venda", "aluguel"]).optional(),
		tipo: z.string().trim().min(2).max(80).optional(),
		cidade: z.string().trim().min(2).max(100).optional(),
		bairro: z.string().trim().min(1).max(120).optional(),
		preco_min: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
		preco_max: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
		dormitorios: z.coerce.number().int().min(0).max(100).optional(),
		vagas: z.coerce.number().int().min(0).max(100).optional(),
		codigo: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/u)
			.optional(),
	})
	.strict()
	.superRefine((value, context) => {
		if (
			value.preco_min !== undefined &&
			value.preco_max !== undefined &&
			value.preco_min > value.preco_max
		) {
			context.addIssue({
				code: "custom",
				path: ["preco_max"],
				message: "A faixa de preço está invertida.",
			});
		}
	});

export class InvalidCatalogQueryError extends Error {
	constructor() {
		super("Filtros públicos inválidos.");
		this.name = "InvalidCatalogQueryError";
	}
}

export function parsePublicCatalogSearch(url: URL): PublicCatalogQuery {
	const raw: Record<string, string> = {};
	for (const [key, value] of url.searchParams) {
		if (!allowedKeys.has(key) || raw[key] !== undefined || value.length > 160) {
			throw new InvalidCatalogQueryError();
		}
		if (value.trim()) raw[key] = value;
	}

	const parsed = querySchema.safeParse(raw);
	if (!parsed.success) throw new InvalidCatalogQueryError();
	const value = parsed.data;
	return {
		page: value.pagina,
		pageSize: 12,
		searchText: value.busca,
		purpose:
			value.finalidade === "venda"
				? "sale"
				: value.finalidade === "aluguel"
					? "rent"
					: undefined,
		propertyType: value.tipo,
		city: value.cidade,
		neighborhood: value.bairro,
		minimumPriceInCents:
			value.preco_min === undefined ? undefined : value.preco_min * 100,
		maximumPriceInCents:
			value.preco_max === undefined ? undefined : value.preco_max * 100,
		minimumBedrooms: value.dormitorios,
		minimumParkingSpaces: value.vagas,
		publicCode: value.codigo,
	};
}
