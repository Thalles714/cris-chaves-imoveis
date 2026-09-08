import { describe, expect, it } from "vitest";

import {
	assertMediaCapacity,
	createPrivateImageObjectKey,
	createPublicImageObjectKey,
	ImageValidationError,
	normalizeVideoSubmission,
	validateImageUpload,
} from "~/modules/media";

function syntheticJpeg(width = 320, height = 240) {
	return new Uint8Array([
		0xff,
		0xd8,
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

describe("safe media foundation", () => {
	it("validates JPEG bytes and generates an opaque object key", () => {
		const bytes = syntheticJpeg();
		const image = validateImageUpload({
			fileName: "synthetic.jpg",
			declaredMimeType: "image/jpeg",
			declaredByteLength: bytes.byteLength,
			bytes,
			confirmedReencoded: true,
			confirmedMetadataStripped: true,
		});
		const key = createPrivateImageObjectKey(
			"40000000-0000-4000-8000-000000000004",
			image,
		);
		expect(image).toMatchObject({ width: 320, height: 240, mimeType: "image/jpeg" });
		expect(key).toMatch(
			/^properties\/40000000-0000-4000-8000-000000000004\/originals\/[0-9a-f-]+\.jpg$/,
		);
		expect(
			createPublicImageObjectKey("40000000-0000-4000-8000-000000000004", image),
		).toMatch(
			/^properties\/40000000-0000-4000-8000-000000000004\/public\/[0-9a-f-]+\.jpg$/,
		);
	});

	it.each([
		["SVG", "synthetic.svg", "image/jpeg", syntheticJpeg()],
		["MIME mismatch", "synthetic.webp", "image/webp", syntheticJpeg()],
		["polyglot or arbitrary bytes", "synthetic.jpg", "image/jpeg", new Uint8Array(320)],
	])("rejects %s", (_label, fileName, declaredMimeType, bytes) => {
		expect(() =>
			validateImageUpload({
				fileName,
				declaredMimeType: declaredMimeType as "image/jpeg",
				declaredByteLength: bytes.byteLength,
				bytes,
				confirmedReencoded: true,
				confirmedMetadataStripped: true,
			}),
		).toThrow(ImageValidationError);
	});

	it("enforces per-property and total capacity", () => {
		expect(() =>
			assertMediaCapacity({
				currentPropertyImageCount: 30,
				currentStoredBytes: 0,
				incomingBytes: 1,
			}),
		).toThrowError(/limite de mídia/u);
		expect(() =>
			assertMediaCapacity({
				currentPropertyImageCount: 0,
				currentStoredBytes: 999_999_999,
				incomingBytes: 2,
			}),
		).toThrowError(/limite de mídia/u);
	});

	it("normalizes allowlisted video URLs without fetching them", () => {
		const reference = normalizeVideoSubmission({
			url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			confirmedWatermarked: true,
			confirmedPublicationAuthorized: true,
		});
		expect(reference).toMatchObject({
			provider: "youtube",
			videoId: "dQw4w9WgXcQ",
		});
	});

	it.each([
		"http://www.youtube.com/watch?v=dQw4w9WgXcQ",
		"https://youtube.example/watch?v=dQw4w9WgXcQ",
		"https://www.youtube.com:443/watch?v=dQw4w9WgXcQ",
		"https://www.youtube.com/watch?v=dQw4w9WgXcQ&redirect=example",
		"javascript:alert(1)",
	])("rejects unsafe video URL %s", (url) => {
		expect(() =>
			normalizeVideoSubmission({
				url,
				confirmedWatermarked: true,
				confirmedPublicationAuthorized: true,
			}),
		).toThrow(/não é permitida/u);
	});
});
