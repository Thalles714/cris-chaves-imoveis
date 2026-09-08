import { z } from "zod";

import {
	DEFAULT_IMAGE_POLICY,
	imageUploadPlanSchema,
	mediaAltTextSchema,
	mediaSortOrderSchema,
	publicImageUploadPlanSchema,
	sha256ChecksumSchema,
	videoSubmissionSchema,
} from "../index";

export const adminMediaIdSchema = z.uuid();

const adminImageAssetInputSchema = z
	.object({
		mimeType: z.enum(["image/jpeg", "image/webp"]),
		byteLength: z.number().int().positive().max(DEFAULT_IMAGE_POLICY.maxBytesPerImage),
		width: z.number().int().min(DEFAULT_IMAGE_POLICY.minWidth).max(4_096),
		height: z.number().int().min(DEFAULT_IMAGE_POLICY.minHeight).max(4_096),
		checksumSha256: sha256ChecksumSchema,
	})
	.strict()
	.superRefine((image, context) => {
		if (image.width * image.height > DEFAULT_IMAGE_POLICY.maxPixels) {
			context.addIssue({
				code: "custom",
				path: ["width"],
				message: "A imagem excede o limite de pixels.",
			});
		}
	});

export const adminImagePlanInputSchema = z
	.object({
		propertyId: z.uuid(),
		original: adminImageAssetInputSchema,
		publicDerivative: adminImageAssetInputSchema,
		altText: mediaAltTextSchema,
		sortOrder: mediaSortOrderSchema,
		isCover: z.boolean(),
		privacyReviewed: z.literal(true, {
			error: "Confirme a revisão de privacidade da foto.",
		}),
	})
	.strict()
	.superRefine((input, context) => {
		if (input.original.checksumSha256 === input.publicDerivative.checksumSha256) {
			context.addIssue({
				code: "custom",
				path: ["publicDerivative", "checksumSha256"],
				message: "A versão pública tratada deve ser diferente do original privado.",
			});
		}
	});

export const adminImageConfirmationSchema = z
	.object({
		propertyId: z.uuid(),
		mediaId: adminMediaIdSchema,
		expectedVersion: z.number().int().min(1),
		isCover: z.boolean(),
	})
	.strict();

export const adminVideoInputSchema = videoSubmissionSchema
	.extend({
		propertyId: z.uuid(),
		altText: mediaAltTextSchema,
		sortOrder: mediaSortOrderSchema,
	})
	.strict();

export const adminMediaMetadataInputSchema = z
	.object({
		propertyId: z.uuid(),
		mediaId: adminMediaIdSchema,
		altText: mediaAltTextSchema,
		sortOrder: mediaSortOrderSchema,
		isCover: z.boolean(),
		expectedVersion: z.number().int().min(1),
	})
	.strict();

export const adminMediaArchiveInputSchema = z
	.object({
		propertyId: z.uuid(),
		mediaId: adminMediaIdSchema,
		expectedVersion: z.number().int().min(1),
	})
	.strict();

const signedUploadSchema = z
	.object({
		uploadToken: z.string().min(20).max(8_192),
	})
	.strict();

export const adminImageUploadGrantSchema = z
	.object({
		mediaId: adminMediaIdSchema,
		mediaVersion: z.number().int().min(1),
		original: signedUploadSchema.extend({ plan: imageUploadPlanSchema }),
		publicDerivative: signedUploadSchema.extend({ plan: publicImageUploadPlanSchema }),
		supabaseUrl: z.string().url().max(2_048),
		publishableKey: z.string().min(20).max(4_096),
	})
	.strict();

export type AdminImagePlanInput = z.infer<typeof adminImagePlanInputSchema>;
export type AdminImageConfirmation = z.infer<typeof adminImageConfirmationSchema>;
export type AdminVideoInput = z.infer<typeof adminVideoInputSchema>;
export type AdminMediaMetadataInput = z.infer<typeof adminMediaMetadataInputSchema>;
export type AdminMediaArchiveInput = z.infer<typeof adminMediaArchiveInputSchema>;
export type AdminImageUploadGrant = z.infer<typeof adminImageUploadGrantSchema>;

export interface AdminMediaItem {
	id: string;
	publicId: string;
	propertyId: string;
	kind: "image" | "video";
	altText: string;
	sortOrder: number;
	isCover: boolean;
	processingStatus: "planned" | "processed" | "rejected";
	isApprovedForPublication: boolean;
	originalStored: boolean;
	publicDerivativeStored: boolean;
	version: number;
	videoUrl: string | null;
	image: {
		mimeType: "image/jpeg" | "image/webp";
		byteLength: number;
		width: number;
		height: number;
	} | null;
}

export class AdminMediaError extends Error {
	constructor(
		readonly code:
			| "NOT_FOUND"
			| "CONFLICT"
			| "STORAGE_MISMATCH"
			| "STORAGE_UNAVAILABLE"
			| "PUBLIC_DERIVATIVE_REQUIRED"
			| "IMAGE_LIMIT_REACHED",
		message = "Não foi possível concluir a operação de mídia.",
	) {
		super(message);
		this.name = "AdminMediaError";
	}
}

export const ADMIN_IMAGE_LIMITS = Object.freeze({
	maxBytes: DEFAULT_IMAGE_POLICY.maxBytesPerImage,
	maxImagesPerProperty: DEFAULT_IMAGE_POLICY.maxImagesPerProperty,
});
