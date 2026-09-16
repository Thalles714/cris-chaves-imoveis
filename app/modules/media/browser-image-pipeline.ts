import { z } from "zod";

import {
	allowedImageMimeTypes,
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
		const extensionSeparator = value.lastIndexOf(".");
		return extensionSeparator > 0 && extensionSeparator < value.length - 1;
	}, "O arquivo deve ter um nome e uma extensão.");

export const browserImageProcessingOptionsSchema = z
	.object({
		outputMimeType: z.enum(allowedImageMimeTypes).optional(),
		quality: z.number().min(0.6).max(0.92).default(0.84),
		minimumQuality: z.number().min(0.5).max(0.84).default(0.6),
		qualityStep: z.number().min(0.02).max(0.2).default(0.08),
		maxOutputWidth: z.number().int().min(320).max(4_096).default(2_048),
		maxOutputHeight: z.number().int().min(240).max(4_096).default(2_048),
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
	readonly drawable?: CanvasImageSource;
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
	if (extension === "jpg" || extension === "jpeg" || extension === "jfif") {
		return "image/jpeg";
	}
	if (extension === "webp") return "image/webp";
	if (extension === "png") return "image/png";
	return null;
}

function normalizedDeclaredMimeType(mimeType: string): BrowserInputImageMimeType | null {
	const normalized = mimeType.trim().toLowerCase();
	if (
		normalized === "image/jpeg" ||
		normalized === "image/jpg" ||
		normalized === "image/pjpeg"
	) {
		return "image/jpeg";
	}
	if (normalized === "image/webp") return "image/webp";
	if (normalized === "image/png" || normalized === "image/x-png") return "image/png";
	return null;
}

export function isSupportedBrowserImageSourceDeclaration(
	fileName: string,
	mimeType: string,
) {
	const parsedName = sourceFileNameSchema.safeParse(fileName);
	if (!parsedName.success) return false;
	const expectedMime = mimeTypeForFileName(parsedName.data);
	if (!expectedMime) return false;
	const normalizedMime = mimeType.trim().toLowerCase();
	if (normalizedMime === "" || normalizedMime === "application/octet-stream") return true;
	return normalizedDeclaredMimeType(normalizedMime) === expectedMime;
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

export function createOpaqueImageId(
	cryptoApi: Pick<Crypto, "getRandomValues"> &
		Partial<Pick<Crypto, "randomUUID">> = globalThis.crypto,
) {
	if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
	if (typeof cryptoApi?.getRandomValues !== "function") {
		throw new BrowserImageProcessingError("CRYPTO_UNAVAILABLE");
	}
	const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
	return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function prefersHtmlImageDecoder(
	userAgent = globalThis.navigator?.userAgent ?? "",
	platform = globalThis.navigator?.platform ?? "",
	maxTouchPoints = globalThis.navigator?.maxTouchPoints ?? 0,
) {
	return (
		/iP(?:hone|ad|od)/u.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1)
	);
}

function createDefaultBrowserRuntime(): BrowserImageRuntime {
	return {
		async decode(source) {
			if (!prefersHtmlImageDecoder() && typeof createImageBitmap === "function") {
				try {
					return await createImageBitmap(source, {
						imageOrientation: "from-image",
						premultiplyAlpha: "default",
						colorSpaceConversion: "default",
					});
				} catch {
					// WebKit can expose ImageBitmap while rejecting particular camera JPEGs.
					// The image-element path below uses the browser's regular image decoder.
				}
			}
			if (
				typeof document === "undefined" ||
				typeof URL === "undefined" ||
				typeof URL.createObjectURL !== "function" ||
				typeof URL.revokeObjectURL !== "function"
			) {
				throw new BrowserImageProcessingError("DECODE_FAILED");
			}

			const objectUrl = URL.createObjectURL(source);
			const image = document.createElement("img");
			try {
				await new Promise<void>((resolve, reject) => {
					const loaded = () => {
						cleanup();
						resolve();
					};
					const failed = () => {
						cleanup();
						reject(new BrowserImageProcessingError("DECODE_FAILED"));
					};
					const cleanup = () => {
						image.removeEventListener("load", loaded);
						image.removeEventListener("error", failed);
					};
					image.addEventListener("load", loaded, { once: true });
					image.addEventListener("error", failed, { once: true });
					image.src = objectUrl;
				});
			} catch (error) {
				URL.revokeObjectURL(objectUrl);
				throw error;
			}

			return {
				width: image.naturalWidth,
				height: image.naturalHeight,
				drawable: image,
				close() {
					image.removeAttribute("src");
					URL.revokeObjectURL(objectUrl);
				},
			};
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
			context.drawImage(image.drawable ?? image, 0, 0, width, height);
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
			try {
				return await new Promise<Blob>((resolve, reject) => {
					canvas.toBlob(
						(blob) => {
							if (blob) resolve(blob);
							else reject(new BrowserImageProcessingError("ENCODE_FAILED"));
						},
						mimeType,
						quality,
					);
				});
			} finally {
				// WebKit retains canvas backing stores aggressively unless they are reset.
				canvas.width = 1;
				canvas.height = 1;
			}
		},
		digestSha256: calculateSha256Hex,
	};
}

function asBlob(source: BrowserImageSource) {
	if (source instanceof Blob) return source;
	throw new BrowserImageProcessingError("INVALID_SOURCE_FILE");
}

async function finalizeEncodedImage(
	outputBlob: Blob,
	outputMimeType: AllowedImageMimeType,
	width: number,
	height: number,
	limits: ImagePolicy,
	runtime: BrowserImageRuntime,
) {
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
	if (validated.width !== width || validated.height !== height) {
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

	const opaqueId = createOpaqueImageId();
	return {
		blob: outputBlob,
		bytes: outputBytes,
		checksumSha256,
		opaqueFileName: `${opaqueId}.${validated.extension}`,
		output: validated,
	};
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
	if (!parsedName.success || !Number.isSafeInteger(source.size) || source.size <= 0) {
		throw new BrowserImageProcessingError("INVALID_SOURCE_FILE");
	}
	const limits = imagePolicySchema.parse(policy);
	const settings = browserImageProcessingOptionsSchema.parse(options);
	if (source.size > limits.maxBytesPerImage) {
		throw new BrowserImageProcessingError("SOURCE_TOO_LARGE");
	}

	const expectedMime = mimeTypeForFileName(parsedName.data);
	if (
		!expectedMime ||
		!isSupportedBrowserImageSourceDeclaration(parsedName.data, source.type)
	) {
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
	if (inspected.mimeType !== expectedMime || inspected.animated) {
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
			(inspected.mimeType === "image/png" ? "image/jpeg" : inspected.mimeType);
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

		const finalized = await finalizeEncodedImage(
			outputBlob,
			outputMimeType,
			fitted.width,
			fitted.height,
			limits,
			runtime,
		);
		return {
			...finalized,
			quality,
			source: {
				mimeType: inspected.mimeType,
				byteLength: sourceBytes.byteLength,
				width: inspected.width,
				height: inspected.height,
				hadMetadata: inspected.hasExif || inspected.hasXmp,
			},
		};
	} finally {
		decoded.close();
	}
}

export interface ProcessedBrowserImagePair {
	readonly original: ProcessedBrowserImage;
	readonly publicDerivative: ProcessedBrowserImage;
}

/** Produces both upload variants while keeping only one decoded camera bitmap alive. */
export async function processImagePairInBrowser(
	source: BrowserImageSource,
	options: BrowserImageProcessingOptions & { watermarkText: string },
	policy: ImagePolicy = DEFAULT_IMAGE_POLICY,
	runtime: BrowserImageRuntime = createDefaultBrowserRuntime(),
): Promise<ProcessedBrowserImagePair> {
	const settings = browserImageProcessingOptionsSchema.parse(options);
	const limits = imagePolicySchema.parse(policy);
	let derivative:
		| {
				blob: Blob;
				mimeType: AllowedImageMimeType;
				quality: number;
				width: number;
				height: number;
		  }
		| undefined;

	const pairedRuntime: BrowserImageRuntime = {
		decode: (blob) => runtime.decode(blob),
		async encode(image, width, height, mimeType, quality) {
			const originalBlob = await runtime.encode(image, width, height, mimeType, quality);
			const publicSize = fitImageDimensions(image.width, image.height, 1_280, 1_280);
			let derivativeQuality = quality;
			let derivativeBlob: Blob | null = null;
			for (let attempt = 0; attempt < settings.maxEncodingAttempts; attempt += 1) {
				derivativeBlob = await runtime.encode(
					image,
					publicSize.width,
					publicSize.height,
					mimeType,
					derivativeQuality,
					settings.watermarkText,
				);
				if (derivativeBlob.type !== mimeType) {
					throw new BrowserImageProcessingError("OUTPUT_TYPE_MISMATCH");
				}
				if (derivativeBlob.size <= limits.maxBytesPerImage) break;
				derivativeBlob = null;
				derivativeQuality = Math.max(
					settings.minimumQuality,
					derivativeQuality - settings.qualityStep,
				);
			}
			if (!derivativeBlob) {
				throw new BrowserImageProcessingError("OUTPUT_TOO_LARGE");
			}
			derivative = {
				blob: derivativeBlob,
				mimeType,
				quality: derivativeQuality,
				width: publicSize.width,
				height: publicSize.height,
			};
			return originalBlob;
		},
		digestSha256: (bytes) => runtime.digestSha256(bytes),
	};

	const originalOptions = { ...settings, watermarkText: undefined };
	const original = await processImageInBrowser(
		source,
		originalOptions,
		limits,
		pairedRuntime,
	);
	if (!derivative) throw new BrowserImageProcessingError("ENCODE_FAILED");
	const finalizedDerivative = await finalizeEncodedImage(
		derivative.blob,
		derivative.mimeType,
		derivative.width,
		derivative.height,
		limits,
		runtime,
	);

	return {
		original,
		publicDerivative: {
			...finalizedDerivative,
			quality: derivative.quality,
			source: {
				mimeType: original.output.mimeType,
				byteLength: original.output.byteLength,
				width: original.output.width,
				height: original.output.height,
				hadMetadata: false,
			},
		},
	};
}
