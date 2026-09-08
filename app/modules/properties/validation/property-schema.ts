import { z } from "zod";

import {
	dealStatuses,
	priceDisplays,
	propertyPurposes,
	publicDealStatuses,
	publicationStatuses,
} from "../domain/property";

const nullableCount = z.number().int().min(0).max(100).nullable();
const nullableArea = z.number().finite().min(0).max(1_000_000).nullable();

export const propertyIdSchema = z.string().uuid();
export const publicCodeSchema = z
	.string()
	.trim()
	.regex(/^[A-Z0-9][A-Z0-9-]{2,31}$/u, "Código público inválido.");
export const propertySlugSchema = z
	.string()
	.trim()
	.min(3)
	.max(120)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Slug inválido.");

export const adminPropertyInputSchema = z
	.object({
		publicCode: publicCodeSchema,
		slug: propertySlugSchema,
		title: z.string().trim().min(3).max(140),
		purpose: z.enum(propertyPurposes),
		propertyType: z.string().trim().min(2).max(80),
		publicationStatus: z.enum(publicationStatuses),
		dealStatus: z.enum(dealStatuses),
		priceDisplay: z.enum(priceDisplays),
		priceInCents: z.number().int().safe().min(0).nullable(),
		city: z.string().trim().min(2).max(100),
		neighborhood: z.string().trim().min(1).max(120),
		description: z.string().trim().max(10_000),
		privateAreaSquareMeters: nullableArea,
		lotAreaSquareMeters: nullableArea,
		bedrooms: nullableCount,
		suites: nullableCount,
		bathrooms: nullableCount,
		parkingSpaces: nullableCount,
		isFeatured: z.boolean(),
		expectedVersion: z.number().int().min(1),
	})
	.strict()
	.superRefine((value, context) => {
		if (value.priceDisplay === "show" && value.priceInCents === null) {
			context.addIssue({
				code: "custom",
				message: "Preço é obrigatório quando a exibição está habilitada.",
				path: ["priceInCents"],
			});
		}
		if (value.priceDisplay === "on_request" && value.priceInCents !== null) {
			context.addIssue({
				code: "custom",
				message: "Preço deve ser omitido quando estiver sob consulta.",
				path: ["priceInCents"],
			});
		}

		if (
			value.suites !== null &&
			value.bedrooms !== null &&
			value.suites > value.bedrooms
		) {
			context.addIssue({
				code: "custom",
				message: "Suítes não podem exceder o total de dormitórios.",
				path: ["suites"],
			});
		}
	});

export const propertyPrivateDetailsInputSchema = z
	.object({
		exactAddress: z.string().trim().min(3).max(500),
		exactLatitude: z.number().finite().min(-90).max(90).nullable(),
		exactLongitude: z.number().finite().min(-180).max(180).nullable(),
		ownerName: z.string().trim().max(160).nullable(),
		ownerContact: z.string().trim().max(300).nullable(),
		internalNotes: z.string().trim().max(10_000),
		listingAuthorizationReference: z.string().trim().max(300).nullable(),
		expectedVersion: z.number().int().min(1),
	})
	.strict()
	.superRefine((value, context) => {
		const hasLatitude = value.exactLatitude !== null;
		const hasLongitude = value.exactLongitude !== null;

		if (hasLatitude !== hasLongitude) {
			context.addIssue({
				code: "custom",
				message: "Latitude e longitude exatas devem ser informadas juntas.",
				path: [hasLatitude ? "exactLongitude" : "exactLatitude"],
			});
		}
	});

export const publicCatalogQuerySchema = z
	.object({
		page: z.number().int().min(1).max(10_000),
		pageSize: z.number().int().min(1).max(48),
		searchText: z.string().trim().min(2).max(160).optional(),
		city: z.string().trim().min(2).max(100).optional(),
		neighborhood: z.string().trim().min(1).max(120).optional(),
		purpose: z.enum(propertyPurposes).optional(),
		propertyType: z.string().trim().min(2).max(80).optional(),
		dealStatus: z.enum(publicDealStatuses).optional(),
		minimumPriceInCents: z.number().int().safe().min(0).optional(),
		maximumPriceInCents: z.number().int().safe().min(0).optional(),
		minimumBedrooms: z.number().int().min(0).max(100).optional(),
		minimumParkingSpaces: z.number().int().min(0).max(100).optional(),
		publicCode: publicCodeSchema.optional(),
	})
	.strict()
	.superRefine((value, context) => {
		if (
			value.minimumPriceInCents !== undefined &&
			value.maximumPriceInCents !== undefined &&
			value.minimumPriceInCents > value.maximumPriceInCents
		) {
			context.addIssue({
				code: "custom",
				message: "A faixa de preço está invertida.",
				path: ["maximumPriceInCents"],
			});
		}
	});

export const publicPropertySummarySchema = z
	.object({
		publicCode: publicCodeSchema,
		slug: propertySlugSchema,
		title: z.string().trim().min(3).max(140),
		purpose: z.enum(propertyPurposes),
		propertyType: z.string().trim().min(2).max(80),
		dealStatus: z.enum(publicDealStatuses),
		priceInCents: z.number().int().safe().min(0).nullable(),
		priceDisplay: z.enum(priceDisplays),
		city: z.string().trim().min(2).max(100),
		neighborhood: z.string().trim().min(1).max(120),
		privateAreaSquareMeters: nullableArea,
		bedrooms: nullableCount,
		suites: nullableCount,
		bathrooms: nullableCount,
		parkingSpaces: nullableCount,
		coverImageUrl: z.string().startsWith("/media/").nullable(),
		coverImageAlt: z.string().max(500),
	})
	.strict();

export const publicPropertyMediaSchema = z
	.object({
		kind: z.enum(["image", "video"]),
		altText: z.string().trim().min(1).max(500),
		position: z.number().int().min(0).max(29),
		url: z.union([
			z.string().startsWith("/media/"),
			z.url().refine(
				(value) => {
					const url = new URL(value);
					return (
						url.protocol === "https:" &&
						(url.hostname === "www.youtube.com" || url.hostname === "vimeo.com")
					);
				},
				{ message: "Provedor de vídeo público não permitido." },
			),
		]),
	})
	.strict();

export type AdminPropertyInput = z.infer<typeof adminPropertyInputSchema>;
export type PropertyPrivateDetailsInput = z.infer<
	typeof propertyPrivateDetailsInputSchema
>;
