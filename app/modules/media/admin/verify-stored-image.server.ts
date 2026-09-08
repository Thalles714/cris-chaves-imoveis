import {
	calculateSha256Hex,
	validateImageUpload,
	type AllowedImageMimeType,
} from "../index";

export interface StoredImageExpectation {
	fileName: string;
	mimeType: AllowedImageMimeType;
	byteLength: number;
	width: number;
	height: number;
	checksumSha256: string;
}

/**
 * Treats Storage metadata and the browser upload plan as untrusted. The bytes
 * downloaded by the Worker are inspected and hashed before a media row can be
 * marked processed/public.
 */
export async function verifyStoredImageBytes(
	blob: Blob,
	expected: StoredImageExpectation,
) {
	if (
		blob.size !== expected.byteLength ||
		(blob.type !== "" && blob.type !== expected.mimeType)
	) {
		return false;
	}

	try {
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const validated = validateImageUpload({
			fileName: expected.fileName,
			declaredMimeType: expected.mimeType,
			declaredByteLength: expected.byteLength,
			bytes,
			confirmedReencoded: true,
			confirmedMetadataStripped: true,
		});
		if (validated.width !== expected.width || validated.height !== expected.height) {
			return false;
		}
		return (await calculateSha256Hex(bytes)) === expected.checksumSha256;
	} catch {
		return false;
	}
}
