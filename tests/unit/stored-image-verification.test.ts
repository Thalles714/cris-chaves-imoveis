import { describe, expect, it } from "vitest";

import { calculateSha256Hex } from "~/modules/media";
import { verifyStoredImageBytes } from "~/modules/media/admin/verify-stored-image.server";

function syntheticJpeg(width = 320, height = 240, withExif = false) {
	const exif = withExif
		? [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
		: [];
	return new Uint8Array([
		0xff,
		0xd8,
		...exif,
		0xff,
		0xc0,
		0x00,
		0x07,
		0x08,
		(height >> 8) & 0xff,
		height & 0xff,
		(width >> 8) & 0xff,
		width & 0xff,
		0xff,
		0xd9,
	]);
}

function asBlob(bytes: Uint8Array, type = "image/jpeg") {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return new Blob([buffer], { type });
}

async function expectation(bytes: Uint8Array) {
	return {
		fileName: "stored.jpg",
		mimeType: "image/jpeg" as const,
		byteLength: bytes.byteLength,
		width: 320,
		height: 240,
		checksumSha256: await calculateSha256Hex(bytes),
	};
}

describe("server-side stored image verification", () => {
	it("accepts only downloaded bytes matching the issued plan", async () => {
		const bytes = syntheticJpeg();
		expect(await verifyStoredImageBytes(asBlob(bytes), await expectation(bytes))).toBe(
			true,
		);
	});

	it("rejects altered bytes even when size and MIME still match", async () => {
		const bytes = syntheticJpeg();
		const altered = syntheticJpeg(321, 240);
		expect(await verifyStoredImageBytes(asBlob(altered), await expectation(bytes))).toBe(
			false,
		);
	});

	it("rejects a false Storage MIME and embedded EXIF metadata", async () => {
		const clean = syntheticJpeg();
		expect(
			await verifyStoredImageBytes(asBlob(clean, "image/webp"), await expectation(clean)),
		).toBe(false);

		const withExif = syntheticJpeg(320, 240, true);
		expect(
			await verifyStoredImageBytes(asBlob(withExif), await expectation(withExif)),
		).toBe(false);
	});
});
