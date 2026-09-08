import { z } from "zod";

import {
	allowedImageMimeTypes,
	browserInputImageMimeTypes,
	ImageValidationError,
	inspectImageBytes,
	validateImageUpload,
	type AllowedImageMimeType,
	type BrowserInputImageMimeType,
	type ValidatedImage,
} from "./image-validation";
import { DEFAULT_IMAGE_POLICY, imagePolicySchema, type ImagePolicy } from "./policy";

const sourceFileNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(180)
	.refine((value) => !/[\\/\0\r\n]/.test(value), "Nome de arquivo inválido.")
	.refine((value) => {
		const [stem] = value.split(".");
		return value.split(".").length === 2 && Boolean(stem?.trim());
	}, "O arquivo deve ter somente uma extensão.");

export const browserImageProcessingOptionsSchema = z
	.object({
		outputMimeType: z.enum(allowedImageMimeTypes).optional(),
		quality: z.number().min(0.6).max(0.92).default(0.84),
		minimumQuality: z.number().min(0.5).max(0.84).default(0.6),
		qualityStep: z.number().min(0.02).max(0.2).default(0.08),
		maxOutputWidth: z.number().int().min(320).max(4_096).default(2_560),
		maxOutputHeight: z.number().int().min(240).max(4_096).default(2_560),
		maxEncodingAttempts: z.number().int().min(1).max(8).default(4),
		watermarkText: z.string().trim().min(1).max(120).optional(),
	})
	.strict()
	.superRefine((options, context) => {
		if (options.minimumQuality > options.quality) {
			context.addIssue({
				code: "custom",
				path: ["minimumQuality"],
				message: "A qualidade mínima não pode superar a qualidade inicial.",
			});
		}
	});

export type BrowserImageProcessingOptions = z.input<
	typeof browserImageProcessingOptionsSchema
>;

export interface BrowserImageSource {
	readonly name: string;
	readonly type: string;
	readonly size: number;
	arrayBuffer(): Promise<ArrayBuffer>;
}

export interface BrowserDecodedImage {
	readonly width: number;
	readonly height: number;
	close(): void;
}

export interface BrowserImageRuntime {
	decode(source: Blob): Promise<BrowserDecodedImage>;
	encode(
		image: BrowserDecodedImage,
		width: number,
		height: number,
		mimeType: AllowedImageMimeType,
		quality: number,
		watermarkText?: string,
	): Promise<Blob>;
	digestSha256(bytes: Uint8Array): Promise<string>;
}

export interface ProcessedBrowserImage {
	readonly blob: Blob;
	readonly bytes: Uint8Array;
	readonly checksumSha256: string;
	readonly opaqueFileName: string;
	readonly quality: number;
	readonly source: {
		readonly mimeType: BrowserInputImageMimeType;
		readonly byteLength: number;
		readonly width: number;
		readonly height: number;
		readonly hadMetadata: boolean;
	};
	readonly output: ValidatedImage;
}

export type BrowserImageProcessingErrorCode =
	| "INVALID_SOURCE_FILE"
	| "SOURCE_BYTE_LENGTH_MISMATCH"
	| "SOURCE_TOO_LARGE"
	| "SOURCE_TYPE_MISMATCH"
	| "SOURCE_DIMENSIONS_OUT_OF_RANGE"
	| "DECODE_FAILED"
	| "DECODED_DIMENSIONS_INVALID"
	| "ENCODE_FAILED"
	| "OUTPUT_TYPE_MISMATCH"
	| "OUTPUT_TOO_LARGE"
	| "CRYPTO_UNAVAILABLE";

export class BrowserImageProcessingError extends Error {
	constructor(
		readonly code: BrowserImageProcessingErrorCode,
		options?: ErrorOptions,
	) {
		super("Não foi possível preparar a imagem com segurança.", options);
		this.name = "BrowserImageProcessingError";
	}
}

export function centeredWatermarkLayout(width: number, height: number) {
	const fontSize = Math.max(22, Math.round(Math.min(width, height) * 0.065));
	const bandHeight = Math.round(fontSize * 2.4);
	return {
		fontSize,
		bandHeight,
		bandTop: (height - bandHeight) / 2,
		textX: width / 2,
		textY: height / 2,
	};
}

function extensionForMimeType(mimeType: AllowedImageMimeType) {
	return mimeType === "image/webp" ? "webp" : "jpg";
}

function mimeTypeForFileName(fileName: string): BrowserInputImageMimeType | null {
	const extension = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
	if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
	if (extension === "webp") return "image/webp";
	if (extension === "png") return "image/png";
	return null;
}

function assertDimensions(
	width: number,
	height: number,
	policy: ImagePolicy,
	errorCode: Extract<
		BrowserImageProcessingErrorCode,
		"SOURCE_DIMENSIONS_OUT_OF_RANGE" | "DECODED_DIMENSIONS_INVALID"
	>,
) {
	const pixels = width * height;
	if (
		!Number.isSafeInteger(width) ||
		!Number.isSafeInteger(height) ||
		width < policy.minWidth ||
		height < policy.minHeight ||
		width > policy.maxWidth ||
		height > policy.maxHeight ||
		!Number.isSafeInteger(pixels) ||
		pixels > policy.maxPixels
	) {
		throw new BrowserImageProcessingError(errorCode);
	}
}

export function fitImageDimensions(
	width: number,
	height: number,
	maxWidth: number,
	maxHeight: number,
) {
	const scale = Math.min(1, maxWidth / width, maxHeight / height);
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

export async function calculateSha256Hex(bytes: Uint8Array) {
	if (!globalThis.crypto?.subtle) {
		throw new BrowserImageProcessingError("CRYPTO_UNAVAILABLE");
	}
	const digestInput = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(digestInput).set(bytes);
	const digest = await globalThis.crypto.subtle.digest("SHA-256", digestInput);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function createDefaultBrowserRuntime(): BrowserImageRuntime {
	return {
		async decode(source) {
			if (typeof createImageBitmap !== "function") {
				throw new BrowserImageProcessingError("DECODE_FAILED");
			}
			return createImageBitmap(source, {
				imageOrientation: "from-image",
				premultiplyAlpha: "default",
				colorSpaceConversion: "default",
			});
		},
		async encode(image, width, height, mimeType, quality, watermarkText) {
			if (typeof document === "undefined") {
				throw new BrowserImageProcessingError("ENCODE_FAILED");
			}
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d", { alpha: mimeType === "image/webp" });
			if (!context) throw new BrowserImageProcessingError("ENCODE_FAILED");
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = "high";
			context.drawImage(image, 0, 0, width, height);
			if (watermarkText) {
				const layout = centeredWatermarkLayout(width, height);
				const { fontSize } = layout;
				context.font = `600 ${fontSize}px Geist, Arial, sans-serif`;
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.fillStyle = "rgb(0 0 0 / 38%)";
				context.fillRect(0, layout.bandTop, width, layout.bandHeight);
				context.fillStyle = "rgb(255 255 255 / 92%)";
				context.fillText(watermarkText, layout.textX, layout.textY);
			}
			return new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (blob) resolve(blob);
						else reject(new BrowserImageProcessingError("ENCODE_FAILED"));
					},
					mimeType,
					quality,
				);
			});
		},
		digestSha256: calculateSha256Hex,
	};
}

function asBlob(source: BrowserImageSource) {
	if (source instanceof Blob) return source;
	throw new BrowserImageProcessingError("INVALID_SOURCE_FILE");
}

/**
 * Browser-only image pipeline. It validates the encoded container before decode,
 * then redraws pixels into a fresh canvas. Canvas encoding deliberately drops
 * EXIF/GPS/XMP and the result is validated again before an upload can be planned.
 */
export async function processImageInBrowser(
	source: BrowserImageSource,
	options: BrowserImageProcessingOptions = {},
	policy: ImagePolicy = DEFAULT_IMAGE_POLICY,
	runtime: BrowserImageRuntime = createDefaultBrowserRuntime(),
): Promise<ProcessedBrowserImage> {
	const parsedName = sourceFileNameSchema.safeParse(source.name);
	const parsedMime = z.enum(browserInputImageMimeTypes).safeParse(source.type);
	if (
		!parsedName.success ||
		!parsedMime.success ||
		!Number.isSafeInteger(source.size) ||
		source.size <= 0
	) {
		throw new BrowserImageProcessingError("INVALID_SOURCE_FILE");
	}
	const limits = imagePolicySchema.parse(policy);
	const settings = browserImageProcessingOptionsSchema.parse(options);
	if (source.size > limits.maxBytesPerImage) {
		throw new BrowserImageProcessingError("SOURCE_TOO_LARGE");
	}

	const expectedMime = mimeTypeForFileName(parsedName.data);
	if (expectedMime !== parsedMime.data) {
		throw new BrowserImageProcessingError("SOURCE_TYPE_MISMATCH");
	}

	const sourceBlob = asBlob(source);
	let sourceBytes: Uint8Array;
	try {
		sourceBytes = new Uint8Array(await source.arrayBuffer());
	} catch (error) {
		throw new BrowserImageProcessingError("INVALID_SOURCE_FILE", { cause: error });
	}
	if (sourceBytes.byteLength !== source.size) {
		throw new BrowserImageProcessingError("SOURCE_BYTE_LENGTH_MISMATCH");
	}

	let inspected;
	try {
		inspected = inspectImageBytes(sourceBytes);
	} catch (error) {
		throw new BrowserImageProcessingError("SOURCE_TYPE_MISMATCH", { cause: error });
	}
	if (inspected.mimeType !== parsedMime.data || inspected.animated) {
		throw new BrowserImageProcessingError("SOURCE_TYPE_MISMATCH");
	}
	assertDimensions(
		inspected.width,
		inspected.height,
		limits,
		"SOURCE_DIMENSIONS_OUT_OF_RANGE",
	);

	let decoded: BrowserDecodedImage;
	try {
		decoded = await runtime.decode(sourceBlob);
	} catch (error) {
		if (error instanceof BrowserImageProcessingError) throw error;
		throw new BrowserImageProcessingError("DECODE_FAILED", { cause: error });
	}

	try {
		assertDimensions(decoded.width, decoded.height, limits, "DECODED_DIMENSIONS_INVALID");
		const fitted = fitImageDimensions(
			decoded.width,
			decoded.height,
			settings.maxOutputWidth,
			settings.maxOutputHeight,
		);
		if (fitted.width < limits.minWidth || fitted.height < limits.minHeight) {
			throw new BrowserImageProcessingError("DECODED_DIMENSIONS_INVALID");
		}

		const outputMimeType =
			settings.outputMimeType ??
			(inspected.mimeType === "image/png" ? "image/webp" : inspected.mimeType);
		let quality = settings.quality;
		let outputBlob: Blob | null = null;
		for (let attempt = 0; attempt < settings.maxEncodingAttempts; attempt += 1) {
			try {
				outputBlob = await runtime.encode(
					decoded,
					fitted.width,
					fitted.height,
					outputMimeType,
					quality,
					settings.watermarkText,
				);
			} catch (error) {
				if (error instanceof BrowserImageProcessingError) throw error;
				throw new BrowserImageProcessingError("ENCODE_FAILED", { cause: error });
			}
			if (outputBlob.type !== outputMimeType) {
				throw new BrowserImageProcessingError("OUTPUT_TYPE_MISMATCH");
			}
			if (outputBlob.size <= limits.maxBytesPerImage) break;
			outputBlob = null;
			quality = Math.max(settings.minimumQuality, quality - settings.qualityStep);
		}
		if (!outputBlob) throw new BrowserImageProcessingError("OUTPUT_TOO_LARGE");

		const outputBytes = new Uint8Array(await outputBlob.arrayBuffer());
		if (outputBytes.byteLength !== outputBlob.size) {
			throw new BrowserImageProcessingError("ENCODE_FAILED");
		}
		let validated: ValidatedImage;
		try {
			validated = validateImageUpload(
				{
					fileName: `processed.${extensionForMimeType(outputMimeType)}`,
					declaredMimeType: outputMimeType,
					declaredByteLength: outputBytes.byteLength,
					bytes: outputBytes,
					confirmedReencoded: true,
					confirmedMetadataStripped: true,
				},
				limits,
			);
		} catch (error) {
			if (error instanceof ImageValidationError) {
				throw new BrowserImageProcessingError("ENCODE_FAILED", { cause: error });
			}
			throw error;
		}
		if (validated.width !== fitted.width || validated.height !== fitted.height) {
			throw new BrowserImageProcessingError("ENCODE_FAILED");
		}

		let checksumSha256: string;
		try {
			checksumSha256 = await runtime.digestSha256(outputBytes);
		} catch (error) {
			if (error instanceof BrowserImageProcessingError) throw error;
			throw new BrowserImageProcessingError("CRYPTO_UNAVAILABLE", { cause: error });
		}
		if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
			throw new BrowserImageProcessingError("CRYPTO_UNAVAILABLE");
		}

		const opaqueId = globalThis.crypto?.randomUUID?.();
		if (!opaqueId) throw new BrowserImageProcessingError("CRYPTO_UNAVAILABLE");
		return {
			blob: outputBlob,
			bytes: outputBytes,
			checksumSha256,
			opaqueFileName: `${opaqueId}.${validated.extension}`,
			quality,
			source: {
				mimeType: inspected.mimeType,
				byteLength: sourceBytes.byteLength,
				width: inspected.width,
				height: inspected.height,
				hadMetadata: inspected.hasExif || inspected.hasXmp,
			},
			output: validated,
		};
	} finally {
		decoded.close();
	}
}
