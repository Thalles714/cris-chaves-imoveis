import { z } from "zod";

import { allowedImageMimeTypes } from "./image-validation";
import { DEFAULT_IMAGE_POLICY } from "./policy";

const uuidPattern =
	"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const originalObjectPathPattern = new RegExp(
	`^properties/(${uuidPattern})/originals/(${uuidPattern})\\.(jpg|webp)$`,
);
const publicObjectPathPattern = new RegExp(
	`^properties/(${uuidPattern})/public/(${uuidPattern})\\.(jpg|webp)$`,
);

export const mediaAltTextSchema = z
	.string()
	.trim()
	.min(1)
	.max(500)
	.refine(
		(value) =>
			[...value].every((character) => {
				const code = character.charCodeAt(0);
				return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
			}),
		{
			message: "O texto alternativo contém caracteres inválidos.",
		},
	);

export const mediaSortOrderSchema = z.number().int().min(0).max(1_000);
export const sha256ChecksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const opaqueOriginalObjectPathSchema = z
	.string()
	.max(180)
	.regex(originalObjectPathPattern);
export const opaquePublicObjectPathSchema = z
	.string()
	.max(180)
	.regex(publicObjectPathPattern);

export const imageUploadPlanSchema = z
	.object({
		kind: z.literal("image"),
		propertyId: z.uuid(),
		bucket: z.literal("property-originals"),
		objectPath: opaqueOriginalObjectPathSchema,
		mimeType: z.enum(allowedImageMimeTypes),
		byteLength: z.number().int().positive().max(DEFAULT_IMAGE_POLICY.maxBytesPerImage),
		width: z
			.number()
			.int()
			.min(DEFAULT_IMAGE_POLICY.minWidth)
			.max(DEFAULT_IMAGE_POLICY.maxWidth),
		height: z
			.number()
			.int()
			.min(DEFAULT_IMAGE_POLICY.minHeight)
			.max(DEFAULT_IMAGE_POLICY.maxHeight),
		checksumSha256: sha256ChecksumSchema,
		altText: mediaAltTextSchema,
		sortOrder: mediaSortOrderSchema,
		isCover: z.boolean(),
	})
	.strict()
	.superRefine((plan, context) => {
		const match = originalObjectPathPattern.exec(plan.objectPath);
		if (!match || match[1] !== plan.propertyId) {
			context.addIssue({
				code: "custom",
				path: ["objectPath"],
				message: "O caminho não pertence ao imóvel informado.",
			});
		}
		const extension = match?.[3];
		if (
			(plan.mimeType === "image/jpeg" && extension !== "jpg") ||
			(plan.mimeType === "image/webp" && extension !== "webp")
		) {
			context.addIssue({
				code: "custom",
				path: ["mimeType"],
				message: "O MIME não corresponde ao caminho planejado.",
			});
		}
		if (plan.width * plan.height > DEFAULT_IMAGE_POLICY.maxPixels) {
			context.addIssue({
				code: "custom",
				path: ["width"],
				message: "A imagem excede o limite de pixels.",
			});
		}
	});

export type ImageUploadPlan = z.infer<typeof imageUploadPlanSchema>;

export const publicImageUploadPlanSchema = z
	.object({
		kind: z.literal("image"),
		propertyId: z.uuid(),
		bucket: z.literal("property-public"),
		objectPath: opaquePublicObjectPathSchema,
		mimeType: z.enum(allowedImageMimeTypes),
		byteLength: z.number().int().positive().max(DEFAULT_IMAGE_POLICY.maxBytesPerImage),
		width: z
			.number()
			.int()
			.min(DEFAULT_IMAGE_POLICY.minWidth)
			.max(DEFAULT_IMAGE_POLICY.maxWidth),
		height: z
			.number()
			.int()
			.min(DEFAULT_IMAGE_POLICY.minHeight)
			.max(DEFAULT_IMAGE_POLICY.maxHeight),
		checksumSha256: sha256ChecksumSchema,
		altText: mediaAltTextSchema,
		sortOrder: mediaSortOrderSchema,
		isCover: z.boolean(),
	})
	.strict()
	.superRefine((plan, context) => {
		const match = publicObjectPathPattern.exec(plan.objectPath);
		if (!match || match[1] !== plan.propertyId) {
			context.addIssue({
				code: "custom",
				path: ["objectPath"],
				message: "O caminho público não pertence ao imóvel informado.",
			});
		}
		const extension = match?.[3];
		if (
			(plan.mimeType === "image/jpeg" && extension !== "jpg") ||
			(plan.mimeType === "image/webp" && extension !== "webp")
		) {
			context.addIssue({
				code: "custom",
				path: ["mimeType"],
				message: "O MIME não corresponde ao caminho público planejado.",
			});
		}
		if (plan.width * plan.height > DEFAULT_IMAGE_POLICY.maxPixels) {
			context.addIssue({
				code: "custom",
				path: ["width"],
				message: "A imagem excede o limite de pixels.",
			});
		}
	});

export type PublicImageUploadPlan = z.infer<typeof publicImageUploadPlanSchema>;

/** Treats a server-issued upload plan as untrusted at the browser boundary. */
export function parseImageUploadPlan(input: unknown): ImageUploadPlan {
	return imageUploadPlanSchema.parse(input);
}
