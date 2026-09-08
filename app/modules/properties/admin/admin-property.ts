import { z } from "zod";

import {
	dealStatuses,
	priceDisplays,
	propertyPurposes,
	publicationStatuses,
	type DealStatus,
	type PriceDisplay,
	type PropertyPurpose,
	type PublicationStatus,
} from "../domain/property";
import {
	propertyIdSchema,
	propertySlugSchema,
	publicCodeSchema,
} from "../validation/property-schema";

const nullableCount = z.number().int().min(0).max(100).nullable();
const nullableArea = z.number().finite().min(0).max(1_000_000).nullable();

export const adminPropertyQuerySchema = z
	.object({
		page: z.number().int().min(1).max(10_000),
		pageSize: z.number().int().min(1).max(50),
		search: z
			.string()
			.trim()
			.max(100)
			.regex(/^[\p{L}\p{N}\s-]+$/u, "A busca contém caracteres inválidos.")
			.optional(),
		publicationStatus: z.enum(publicationStatuses).optional(),
		dealStatus: z.enum(dealStatuses).optional(),
		showDeleted: z.boolean(),
	})
	.strict();

const adminPropertyDraftFields = {
	publicCode: publicCodeSchema,
	slug: propertySlugSchema,
	title: z.string().trim().min(3).max(140),
	purpose: z.enum(propertyPurposes),
	propertyType: z
		.string()
		.trim()
		.min(2, "Informe o tipo do imóvel.")
		.max(80, "O tipo do imóvel deve ter no máximo 80 caracteres."),
	priceDisplay: z.enum(priceDisplays),
	priceInCents: z.number().int().safe().min(0).nullable(),
	city: z
		.string()
		.trim()
		.min(2, "Informe a cidade.")
		.max(100, "A cidade deve ter no máximo 100 caracteres."),
	neighborhood: z
		.string()
		.trim()
		.min(1, "Informe o bairro.")
		.max(120, "O bairro deve ter no máximo 120 caracteres."),
	description: z
		.string()
		.trim()
		.max(10_000, "A descrição deve ter no máximo 10.000 caracteres."),
	totalAreaSquareMeters: nullableArea,
	privateAreaSquareMeters: nullableArea,
	lotAreaSquareMeters: nullableArea,
	bedrooms: nullableCount,
	suites: nullableCount,
	bathrooms: nullableCount,
	parkingSpaces: nullableCount,
	features: z
		.array(
			z
				.string()
				.trim()
				.min(1)
				.max(100, "Cada diferencial deve ter no máximo 100 caracteres."),
		)
		.max(64, "Informe no máximo 64 diferenciais."),
	isFeatured: z.boolean(),
} as const;

function validateDraftConsistency(
	value: {
		priceDisplay: PriceDisplay;
		priceInCents: number | null;
		bedrooms: number | null;
		suites: number | null;
	},
	context: z.RefinementCtx,
) {
	if (value.priceDisplay === "show" && value.priceInCents === null) {
		context.addIssue({
			code: "custom",
			message: "Informe o preço ou selecione Sob consulta.",
			path: ["priceInCents"],
		});
	}
	if (value.priceDisplay === "on_request" && value.priceInCents !== null) {
		context.addIssue({
			code: "custom",
			message: "Remova o preço quando a exibição estiver sob consulta.",
			path: ["priceInCents"],
		});
	}
	if (value.suites !== null && value.bedrooms !== null && value.suites > value.bedrooms) {
		context.addIssue({
			code: "custom",
			message: "Suítes não podem exceder o total de dormitórios.",
			path: ["suites"],
		});
	}
}

export const adminPropertyDraftInputSchema = z
	.object(adminPropertyDraftFields)
	.strict()
	.superRefine(validateDraftConsistency);

export const adminPropertyUpdateInputSchema = z
	.object({
		...adminPropertyDraftFields,
		expectedVersion: z.number().int().min(1),
	})
	.strict()
	.superRefine(validateDraftConsistency);

const optionalPrivateText = (maximum: number) =>
	z
		.string()
		.trim()
		.max(maximum)
		.nullable()
		.transform((value) => value || null);

export const adminPropertyPrivateInputSchema = z
	.object({
		addressLine: optionalPrivateText(240),
		addressNumber: optionalPrivateText(40),
		addressComplement: optionalPrivateText(160),
		postalCode: optionalPrivateText(20),
		ownerName: optionalPrivateText(200),
		ownerContact: optionalPrivateText(500),
		internalNotes: optionalPrivateText(10_000),
		expectedVersion: z.number().int().min(0),
	})
	.strict();

export const adminPropertyTransitionSchema = z
	.object({
		propertyId: propertyIdSchema,
		expectedVersion: z.number().int().min(1),
		authorizationConfirmed: z.boolean().default(false),
		transition: z.enum([
			"publish",
			"archive",
			"restore",
			"reserve",
			"releaseReservation",
			"markSold",
			"softDelete",
		]),
	})
	.strict()
	.superRefine((input, context) => {
		if (input.transition === "publish" && !input.authorizationConfirmed) {
			context.addIssue({
				code: "custom",
				path: ["authorizationConfirmed"],
				message: "Confirme que o imóvel possui autorização escrita para anunciar.",
			});
		}
	});

export interface AdminPropertyListItem {
	id: string;
	publicCode: string;
	title: string;
	purpose: PropertyPurpose;
	propertyType: string;
	publicationStatus: PublicationStatus;
	dealStatus: DealStatus;
	priceDisplay: PriceDisplay;
	priceInCents: number | null;
	city: string;
	neighborhood: string;
	isFeatured: boolean;
	updatedAt: string;
	version: number;
	isDeleted: boolean;
}

export interface AdminPropertyEditRecord extends AdminPropertyListItem {
	slug: string;
	description: string;
	totalAreaSquareMeters: number | null;
	privateAreaSquareMeters: number | null;
	lotAreaSquareMeters: number | null;
	bedrooms: number | null;
	suites: number | null;
	bathrooms: number | null;
	parkingSpaces: number | null;
	features: string[];
	privateDetails: {
		addressLine: string | null;
		addressNumber: string | null;
		addressComplement: string | null;
		postalCode: string | null;
		ownerName: string | null;
		ownerContact: string | null;
		internalNotes: string | null;
		version: number;
	};
}

export interface AdminPropertyPage {
	items: readonly AdminPropertyListItem[];
	page: number;
	pageSize: number;
	totalItems: number;
}

export interface AdminPropertySummary {
	total: number;
	drafts: number;
	published: number;
	archived: number;
	deleted: number;
}

export type AdminPropertyQuery = z.infer<typeof adminPropertyQuerySchema>;
export type AdminPropertyDraftInput = z.infer<typeof adminPropertyDraftInputSchema>;
export type AdminPropertyUpdateInput = z.infer<typeof adminPropertyUpdateInputSchema>;
export type AdminPropertyTransition = z.infer<typeof adminPropertyTransitionSchema>;
export type AdminPropertyPrivateInput = z.infer<typeof adminPropertyPrivateInputSchema>;

export function parseAdminPropertyQuery(url: URL): AdminPropertyQuery {
	const page = Number(url.searchParams.get("pagina") ?? "1");
	const rawStatus = url.searchParams.get("status") ?? undefined;
	const rawDeal = url.searchParams.get("negociacao") ?? undefined;
	return adminPropertyQuerySchema.parse({
		page,
		pageSize: 20,
		search: url.searchParams.get("busca")?.trim() || undefined,
		publicationStatus: publicationStatuses.includes(rawStatus as PublicationStatus)
			? rawStatus
			: undefined,
		dealStatus: dealStatuses.includes(rawDeal as DealStatus) ? rawDeal : undefined,
		showDeleted: url.searchParams.get("excluidos") === "1",
	});
}
