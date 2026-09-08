import { z } from "zod";

import { DEFAULT_IMAGE_POLICY, imagePolicySchema, type ImagePolicy } from "./policy";

export const allowedImageMimeTypes = ["image/jpeg", "image/webp"] as const;
export type AllowedImageMimeType = (typeof allowedImageMimeTypes)[number];
export type AllowedImageExtension = "jpg" | "jpeg" | "webp";

export const browserInputImageMimeTypes = [
	...allowedImageMimeTypes,
	"image/png",
] as const;
export type BrowserInputImageMimeType = (typeof browserInputImageMimeTypes)[number];
export type BrowserInputImageExtension = AllowedImageExtension | "png";

const allowedImageMimeTypeSchema = z.enum(allowedImageMimeTypes);

export const imageUploadInputSchema = z
	.object({
		fileName: z
			.string()
			.trim()
			.min(1)
			.max(180)
			.refine((value) => !/[\\/\0\r\n]/.test(value), "Nome de arquivo inválido."),
		declaredMimeType: allowedImageMimeTypeSchema,
		declaredByteLength: z.number().int().positive(),
		bytes: z.instanceof(Uint8Array),
		confirmedReencoded: z.literal(true),
		confirmedMetadataStripped: z.literal(true),
	})
	.strict();

export type ImageUploadInput = z.infer<typeof imageUploadInputSchema>;

export interface ValidatedImage {
	mimeType: AllowedImageMimeType;
	extension: "jpg" | "webp";
	byteLength: number;
	width: number;
	height: number;
	pixels: number;
	animated: false;
	metadata: {
		exif: false;
		gps: false;
		xmp: false;
	};
}

export type ImageValidationErrorCode =
	| "INVALID_UPLOAD_DECLARATION"
	| "BYTE_LENGTH_MISMATCH"
	| "IMAGE_TOO_LARGE"
	| "UNSUPPORTED_EXTENSION"
	| "MIME_EXTENSION_MISMATCH"
	| "MAGIC_BYTES_MISMATCH"
	| "MALFORMED_IMAGE"
	| "METADATA_NOT_STRIPPED"
	| "ANIMATED_IMAGE_NOT_ALLOWED"
	| "DIMENSIONS_OUT_OF_RANGE";

export class ImageValidationError extends Error {
	constructor(readonly code: ImageValidationErrorCode) {
		super("A imagem não atende aos requisitos de segurança.");
		this.name = "ImageValidationError";
	}
}

export interface InspectedImage {
	mimeType: BrowserInputImageMimeType;
	extension: "jpg" | "webp" | "png";
	width: number;
	height: number;
	hasExif: boolean;
	hasXmp: boolean;
	animated: boolean;
}

function readUint16BigEndian(bytes: Uint8Array, offset: number) {
	return bytes[offset] * 256 + bytes[offset + 1];
}

function readUint16LittleEndian(bytes: Uint8Array, offset: number) {
	return bytes[offset] + bytes[offset + 1] * 256;
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
	return bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65_536;
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
	return (
		bytes[offset] +
		bytes[offset + 1] * 256 +
		bytes[offset + 2] * 65_536 +
		bytes[offset + 3] * 16_777_216
	);
}

function readUint32BigEndian(bytes: Uint8Array, offset: number) {
	return (
		bytes[offset] * 16_777_216 +
		bytes[offset + 1] * 65_536 +
		bytes[offset + 2] * 256 +
		bytes[offset + 3]
	);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
	return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function containsAscii(bytes: Uint8Array, value: string) {
	const target = new TextEncoder().encode(value);
	outer: for (let index = 0; index <= bytes.length - target.length; index += 1) {
		for (let cursor = 0; cursor < target.length; cursor += 1) {
			if (bytes[index + cursor] !== target[cursor]) continue outer;
		}
		return true;
	}
	return false;
}

const jpegStartOfFrameMarkers = new Set([
	0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function inspectJpeg(bytes: Uint8Array): InspectedImage {
	if (
		bytes.length < 12 ||
		bytes[0] !== 0xff ||
		bytes[1] !== 0xd8 ||
		bytes[bytes.length - 2] !== 0xff ||
		bytes[bytes.length - 1] !== 0xd9
	) {
		throw new ImageValidationError("MAGIC_BYTES_MISMATCH");
	}

	let offset = 2;
	let width = 0;
	let height = 0;
	let hasExif = false;
	let hasXmp = false;

	while (offset < bytes.length - 2) {
		while (bytes[offset] === 0xff) offset += 1;
		const marker = bytes[offset];
		offset += 1;
		if (marker === undefined) break;
		if (marker === 0xda || marker === 0xd9) break;
		if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
			continue;
		}
		if (offset + 2 > bytes.length) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		const segmentLength = readUint16BigEndian(bytes, offset);
		if (segmentLength < 2 || offset + segmentLength > bytes.length) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		const dataOffset = offset + 2;
		const dataLength = segmentLength - 2;
		if (marker === 0xe1) {
			const markerData = bytes.subarray(dataOffset, dataOffset + dataLength);
			hasExif ||= containsAscii(markerData, "Exif\0\0");
			hasXmp ||= containsAscii(markerData, "http://ns.adobe.com/xap/1.0/");
		}
		if (jpegStartOfFrameMarkers.has(marker)) {
			if (dataLength < 5) throw new ImageValidationError("MALFORMED_IMAGE");
			height = readUint16BigEndian(bytes, dataOffset + 1);
			width = readUint16BigEndian(bytes, dataOffset + 3);
		}
		offset += segmentLength;
	}

	if (!width || !height) throw new ImageValidationError("MALFORMED_IMAGE");
	return {
		mimeType: "image/jpeg",
		extension: "jpg",
		width,
		height,
		hasExif,
		hasXmp,
		animated: false,
	};
}

function inspectWebp(bytes: Uint8Array): InspectedImage {
	if (
		bytes.length < 20 ||
		ascii(bytes, 0, 4) !== "RIFF" ||
		ascii(bytes, 8, 4) !== "WEBP" ||
		readUint32LittleEndian(bytes, 4) !== bytes.length - 8
	) {
		throw new ImageValidationError("MAGIC_BYTES_MISMATCH");
	}

	let offset = 12;
	let width = 0;
	let height = 0;
	let hasExif = false;
	let hasXmp = false;
	let animated = false;

	while (offset < bytes.length) {
		if (offset + 8 > bytes.length) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		const chunkType = ascii(bytes, offset, 4);
		const chunkLength = readUint32LittleEndian(bytes, offset + 4);
		const dataOffset = offset + 8;
		const chunkEnd = dataOffset + chunkLength;
		if (chunkEnd > bytes.length) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}

		if (chunkType === "EXIF") hasExif = true;
		if (chunkType === "XMP ") hasXmp = true;
		if (chunkType === "ANIM" || chunkType === "ANMF") animated = true;

		if (chunkType === "VP8X" && chunkLength >= 10) {
			animated ||= Boolean(bytes[dataOffset] & 0x02);
			width = readUint24LittleEndian(bytes, dataOffset + 4) + 1;
			height = readUint24LittleEndian(bytes, dataOffset + 7) + 1;
		} else if (chunkType === "VP8 " && chunkLength >= 10) {
			if (
				bytes[dataOffset + 3] !== 0x9d ||
				bytes[dataOffset + 4] !== 0x01 ||
				bytes[dataOffset + 5] !== 0x2a
			) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			width = readUint16LittleEndian(bytes, dataOffset + 6) & 0x3fff;
			height = readUint16LittleEndian(bytes, dataOffset + 8) & 0x3fff;
		} else if (chunkType === "VP8L" && chunkLength >= 5) {
			if (bytes[dataOffset] !== 0x2f) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			const b1 = bytes[dataOffset + 1];
			const b2 = bytes[dataOffset + 2];
			const b3 = bytes[dataOffset + 3];
			const b4 = bytes[dataOffset + 4];
			width = 1 + b1 + ((b2 & 0x3f) << 8);
			height = 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10);
		}

		offset = chunkEnd + (chunkLength % 2);
	}

	if (offset !== bytes.length || !width || !height) {
		throw new ImageValidationError("MALFORMED_IMAGE");
	}
	return {
		mimeType: "image/webp",
		extension: "webp",
		width,
		height,
		hasExif,
		hasXmp,
		animated,
	};
}

const pngSignature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const pngCriticalChunkTypes = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);

function pngCrc32(bytes: Uint8Array, start: number, end: number) {
	let crc = 0xffffffff;
	for (let index = start; index < end; index += 1) {
		crc ^= bytes[index];
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function isPngChunkType(bytes: Uint8Array, offset: number) {
	for (let index = offset; index < offset + 4; index += 1) {
		const byte = bytes[index];
		if (!((byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a))) {
			return false;
		}
	}
	return (bytes[offset + 2] & 0x20) === 0;
}

function isValidPngBitDepth(bitDepth: number, colorType: number) {
	if (colorType === 0) return [1, 2, 4, 8, 16].includes(bitDepth);
	if (colorType === 2 || colorType === 4 || colorType === 6) {
		return bitDepth === 8 || bitDepth === 16;
	}
	if (colorType === 3) return [1, 2, 4, 8].includes(bitDepth);
	return false;
}

function inspectPng(bytes: Uint8Array): InspectedImage {
	if (bytes.length < 57 || pngSignature.some((byte, index) => bytes[index] !== byte)) {
		throw new ImageValidationError("MAGIC_BYTES_MISMATCH");
	}

	let offset = pngSignature.length;
	let width = 0;
	let height = 0;
	let colorType = -1;
	let hasExif = false;
	let hasXmp = false;
	let animated = false;
	let seenHeader = false;
	let seenPalette = false;
	let seenImageData = false;
	let imageDataClosed = false;
	let seenEnd = false;

	while (offset < bytes.length) {
		if (offset + 12 > bytes.length || !isPngChunkType(bytes, offset + 4)) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		const chunkLength = readUint32BigEndian(bytes, offset);
		const typeOffset = offset + 4;
		const dataOffset = offset + 8;
		const crcOffset = dataOffset + chunkLength;
		const chunkEnd = crcOffset + 4;
		if (!Number.isSafeInteger(chunkEnd) || chunkEnd > bytes.length) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}

		const chunkType = ascii(bytes, typeOffset, 4);
		if (
			readUint32BigEndian(bytes, crcOffset) !== pngCrc32(bytes, typeOffset, crcOffset)
		) {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		if (!seenHeader && chunkType !== "IHDR") {
			throw new ImageValidationError("MALFORMED_IMAGE");
		}
		if (seenImageData && chunkType !== "IDAT") imageDataClosed = true;

		if (chunkType === "IHDR") {
			if (seenHeader || chunkLength !== 13 || offset !== pngSignature.length) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			width = readUint32BigEndian(bytes, dataOffset);
			height = readUint32BigEndian(bytes, dataOffset + 4);
			const bitDepth = bytes[dataOffset + 8];
			colorType = bytes[dataOffset + 9];
			const compressionMethod = bytes[dataOffset + 10];
			const filterMethod = bytes[dataOffset + 11];
			const interlaceMethod = bytes[dataOffset + 12];
			if (
				width === 0 ||
				height === 0 ||
				!isValidPngBitDepth(bitDepth, colorType) ||
				compressionMethod !== 0 ||
				filterMethod !== 0 ||
				(interlaceMethod !== 0 && interlaceMethod !== 1)
			) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			seenHeader = true;
		} else if (chunkType === "PLTE") {
			if (
				seenPalette ||
				seenImageData ||
				chunkLength === 0 ||
				chunkLength > 768 ||
				chunkLength % 3 !== 0 ||
				colorType === 0 ||
				colorType === 4
			) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			seenPalette = true;
		} else if (chunkType === "IDAT") {
			if (imageDataClosed || (colorType === 3 && !seenPalette)) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			seenImageData = true;
		} else if (chunkType === "IEND") {
			if (!seenImageData || seenEnd || chunkLength !== 0 || chunkEnd !== bytes.length) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			seenEnd = true;
		} else {
			const isCritical = bytes[typeOffset] >= 0x41 && bytes[typeOffset] <= 0x5a;
			if (isCritical && !pngCriticalChunkTypes.has(chunkType)) {
				throw new ImageValidationError("MALFORMED_IMAGE");
			}
			if (chunkType === "acTL" || chunkType === "fcTL" || chunkType === "fdAT") {
				animated = true;
			}
			if (chunkType === "eXIf") hasExif = true;
			if (
				(chunkType === "iTXt" || chunkType === "tEXt" || chunkType === "zTXt") &&
				containsAscii(bytes.subarray(dataOffset, crcOffset), "XML:com.adobe.xmp")
			) {
				hasXmp = true;
			}
		}

		offset = chunkEnd;
		if (seenEnd) break;
	}

	if (!seenHeader || !seenImageData || !seenEnd || offset !== bytes.length) {
		throw new ImageValidationError("MALFORMED_IMAGE");
	}
	return {
		mimeType: "image/png",
		extension: "png",
		width,
		height,
		hasExif,
		hasXmp,
		animated,
	};
}

function fileExtension(fileName: string): string | null {
	const dot = fileName.lastIndexOf(".");
	return dot > -1 ? fileName.slice(dot + 1).toLowerCase() : null;
}

/**
 * Inspects the encoded container without decoding pixels. This is intentionally
 * strict and is safe to run before handing untrusted bytes to a browser decoder.
 */
export function inspectImageBytes(bytes: Uint8Array): InspectedImage {
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return inspectJpeg(bytes);
	if (ascii(bytes, 0, 4) === "RIFF") return inspectWebp(bytes);
	if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") return inspectPng(bytes);
	throw new ImageValidationError("MAGIC_BYTES_MISMATCH");
}

export function validateImageUpload(
	input: ImageUploadInput,
	policy: ImagePolicy = DEFAULT_IMAGE_POLICY,
): ValidatedImage {
	const parsed = imageUploadInputSchema.safeParse(input);
	if (!parsed.success) {
		throw new ImageValidationError("INVALID_UPLOAD_DECLARATION");
	}
	const limits = imagePolicySchema.parse(policy);
	const upload = parsed.data;
	if (upload.declaredByteLength !== upload.bytes.byteLength) {
		throw new ImageValidationError("BYTE_LENGTH_MISMATCH");
	}
	if (upload.bytes.byteLength > limits.maxBytesPerImage) {
		throw new ImageValidationError("IMAGE_TOO_LARGE");
	}

	const extension = fileExtension(upload.fileName);
	if (extension !== "jpg" && extension !== "jpeg" && extension !== "webp") {
		throw new ImageValidationError("UNSUPPORTED_EXTENSION");
	}
	const expectedMime = extension === "webp" ? "image/webp" : "image/jpeg";
	if (upload.declaredMimeType !== expectedMime) {
		throw new ImageValidationError("MIME_EXTENSION_MISMATCH");
	}

	const inspected = inspectImageBytes(upload.bytes);
	if (inspected.mimeType !== upload.declaredMimeType) {
		throw new ImageValidationError("MAGIC_BYTES_MISMATCH");
	}
	if (inspected.hasExif || inspected.hasXmp) {
		throw new ImageValidationError("METADATA_NOT_STRIPPED");
	}
	if (inspected.animated) {
		throw new ImageValidationError("ANIMATED_IMAGE_NOT_ALLOWED");
	}
	const pixels = inspected.width * inspected.height;
	if (
		inspected.width < limits.minWidth ||
		inspected.height < limits.minHeight ||
		inspected.width > limits.maxWidth ||
		inspected.height > limits.maxHeight ||
		pixels > limits.maxPixels
	) {
		throw new ImageValidationError("DIMENSIONS_OUT_OF_RANGE");
	}

	return {
		mimeType: upload.declaredMimeType,
		extension: upload.declaredMimeType === "image/webp" ? "webp" : "jpg",
		byteLength: upload.bytes.byteLength,
		width: inspected.width,
		height: inspected.height,
		pixels,
		animated: false,
		metadata: { exif: false, gps: false, xmp: false },
	};
}

const propertyIdSchema = z.uuid();

export function createPrivateImageObjectKey(
	propertyId: string,
	image: Pick<ValidatedImage, "extension">,
) {
	const safePropertyId = propertyIdSchema.parse(propertyId);
	return `properties/${safePropertyId}/originals/${crypto.randomUUID()}.${image.extension}`;
}

export function createPublicImageObjectKey(
	propertyId: string,
	image: Pick<ValidatedImage, "extension">,
) {
	const safePropertyId = propertyIdSchema.parse(propertyId);
	return `properties/${safePropertyId}/public/${crypto.randomUUID()}.${image.extension}`;
}
