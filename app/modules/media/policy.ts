import { z } from "zod";

/** Supabase Free project-wide Storage budget reserved by the product plan. */
export const STORAGE_BUDGET_BYTES = 1_000_000_000;

export const imagePolicySchema = z
	.object({
		maxBytesPerImage: z.number().int().positive().max(STORAGE_BUDGET_BYTES),
		minWidth: z.number().int().positive().max(16_384),
		minHeight: z.number().int().positive().max(16_384),
		maxWidth: z.number().int().positive().max(16_384),
		maxHeight: z.number().int().positive().max(16_384),
		maxPixels: z.number().int().positive().max(100_000_000),
		maxImagesPerProperty: z.number().int().positive().max(100),
		maxTotalStorageBytes: z.number().int().positive().max(STORAGE_BUDGET_BYTES),
	})
	.strict()
	.superRefine((policy, context) => {
		if (policy.minWidth > policy.maxWidth) {
			context.addIssue({
				code: "custom",
				path: ["minWidth"],
				message: "A largura mínima não pode superar a máxima.",
			});
		}
		if (policy.minHeight > policy.maxHeight) {
			context.addIssue({
				code: "custom",
				path: ["minHeight"],
				message: "A altura mínima não pode superar a máxima.",
			});
		}
	});

export type ImagePolicy = z.infer<typeof imagePolicySchema>;

/**
 * Conservative development profile. These product limits remain configurable
 * because their final operational approval is still recorded as pending.
 */
export const DEFAULT_IMAGE_POLICY: ImagePolicy = Object.freeze({
	maxBytesPerImage: 8 * 1024 * 1024,
	minWidth: 320,
	minHeight: 240,
	maxWidth: 8_192,
	maxHeight: 8_192,
	maxPixels: 24_000_000,
	maxImagesPerProperty: 30,
	maxTotalStorageBytes: STORAGE_BUDGET_BYTES,
});

export const mediaCapacitySchema = z
	.object({
		currentPropertyImageCount: z.number().int().nonnegative(),
		currentStoredBytes: z.number().int().nonnegative(),
		incomingBytes: z.number().int().positive(),
	})
	.strict();

export type MediaCapacity = z.infer<typeof mediaCapacitySchema>;

export class MediaCapacityError extends Error {
	constructor(readonly code: "PROPERTY_IMAGE_LIMIT_REACHED" | "STORAGE_BUDGET_EXCEEDED") {
		super("O limite de mídia não permite este envio.");
		this.name = "MediaCapacityError";
	}
}

export function assertMediaCapacity(
	input: MediaCapacity,
	policy: ImagePolicy = DEFAULT_IMAGE_POLICY,
) {
	const capacity = mediaCapacitySchema.parse(input);
	const limits = imagePolicySchema.parse(policy);
	if (capacity.currentPropertyImageCount >= limits.maxImagesPerProperty) {
		throw new MediaCapacityError("PROPERTY_IMAGE_LIMIT_REACHED");
	}
	if (
		capacity.currentStoredBytes + capacity.incomingBytes >
		limits.maxTotalStorageBytes
	) {
		throw new MediaCapacityError("STORAGE_BUDGET_EXCEEDED");
	}
	return {
		nextPropertyImageCount: capacity.currentPropertyImageCount + 1,
		nextStoredBytes: capacity.currentStoredBytes + capacity.incomingBytes,
	};
}
