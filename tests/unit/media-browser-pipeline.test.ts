import { describe, expect, it, vi } from "vitest";

import {
	BrowserImageProcessingError,
	centeredWatermarkLayout,
	calculateSha256Hex,
	fitImageDimensions,
	parseImageUploadPlan,
	processImageInBrowser,
	type BrowserDecodedImage,
	type BrowserImageRuntime,
} from "~/modules/media";

function asciiBytes(value: string) {
	return [...value].map((character) => character.charCodeAt(0));
}

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

function syntheticWebp(width = 320, height = 240, animated = false) {
	const widthMinusOne = width - 1;
	const heightMinusOne = height - 1;
	return new Uint8Array([
		...asciiBytes("RIFF"),
		22,
		0,
		0,
		0,
		...asciiBytes("WEBP"),
		...asciiBytes("VP8X"),
		10,
		0,
		0,
		0,
		animated ? 0x02 : 0,
		0,
		0,
		0,
		widthMinusOne & 0xff,
		(widthMinusOne >> 8) & 0xff,
		(widthMinusOne >> 16) & 0xff,
		heightMinusOne & 0xff,
		(heightMinusOne >> 8) & 0xff,
		(heightMinusOne >> 16) & 0xff,
	]);
}

function crc32(bytes: Uint8Array) {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: number[]) {
	const typeBytes = new Uint8Array(asciiBytes(type));
	const payload = new Uint8Array(data);
	const bytes = new Uint8Array(12 + payload.byteLength);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, payload.byteLength);
	bytes.set(typeBytes, 4);
	bytes.set(payload, 8);
	view.setUint32(
		8 + payload.byteLength,
		crc32(bytes.subarray(4, 8 + payload.byteLength)),
	);
	return [...bytes];
}

function syntheticPng(width = 962, height = 540, animated = false) {
	return new Uint8Array([
		0x89,
		...asciiBytes("PNG"),
		0x0d,
		0x0a,
		0x1a,
		0x0a,
		...pngChunk("IHDR", [
			(width >>> 24) & 0xff,
			(width >>> 16) & 0xff,
			(width >>> 8) & 0xff,
			width & 0xff,
			(height >>> 24) & 0xff,
			(height >>> 16) & 0xff,
			(height >>> 8) & 0xff,
			height & 0xff,
			8,
			2,
			0,
			0,
			0,
		]),
		...(animated ? pngChunk("acTL", [0, 0, 0, 1, 0, 0, 0, 0]) : []),
		...pngChunk("IDAT", [0]),
		...pngChunk("IEND", []),
	]);
}

function imageFile(bytes: Uint8Array, name = "fachada.jpg", type = "image/jpeg") {
	const contents = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(contents).set(bytes);
	return new File([contents], name, { type });
}

function runtimeFor(decodedWidth: number, decodedHeight: number) {
	const close = vi.fn();
	const decoded: BrowserDecodedImage = {
		width: decodedWidth,
		height: decodedHeight,
		close,
	};
	const encode = vi.fn(
		async (
			_image: BrowserDecodedImage,
			width: number,
			height: number,
			mimeType: "image/jpeg" | "image/webp",
		) =>
			new Blob(
				[
					mimeType === "image/webp"
						? syntheticWebp(width, height)
						: syntheticJpeg(width, height),
				],
				{ type: mimeType },
			),
	);
	const runtime: BrowserImageRuntime = {
		decode: vi.fn(async () => decoded),
		encode,
		digestSha256: vi.fn(async () => "a".repeat(64)),
	};
	return { runtime, encode, close };
}

describe("browser image pipeline", () => {
	it("reencodes, downsizes, strips metadata and hashes the fresh bytes", async () => {
		const sourceBytes = syntheticJpeg(6_000, 4_000, true);
		const { runtime, encode, close } = runtimeFor(6_000, 4_000);

		const processed = await processImageInBrowser(
			imageFile(sourceBytes),
			{},
			undefined,
			runtime,
		);

		expect(processed.source).toMatchObject({
			mimeType: "image/jpeg",
			width: 6_000,
			height: 4_000,
			hadMetadata: true,
		});
		expect(processed.output).toMatchObject({
			mimeType: "image/jpeg",
			width: 2_560,
			height: 1_707,
			metadata: { exif: false, gps: false, xmp: false },
		});
		expect(processed.checksumSha256).toBe("a".repeat(64));
		expect(processed.opaqueFileName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
		expect(encode).toHaveBeenCalledWith(
			expect.anything(),
			2_560,
			1_707,
			"image/jpeg",
			0.84,
			undefined,
		);
		expect(close).toHaveBeenCalledOnce();
	});

	it("closes the decoded bitmap when encoding fails", async () => {
		const { runtime, close } = runtimeFor(320, 240);
		runtime.encode = vi.fn(async () => {
			throw new Error("canvas failed");
		});

		await expect(
			processImageInBrowser(imageFile(syntheticJpeg()), {}, undefined, runtime),
		).rejects.toMatchObject({ code: "ENCODE_FAILED" });
		expect(close).toHaveBeenCalledOnce();
	});

	it("passes the approved centered watermark text to the fresh canvas encoding", async () => {
		const { runtime, encode } = runtimeFor(1_280, 720);

		await processImageInBrowser(
			imageFile(syntheticJpeg(1_280, 720)),
			{ watermarkText: "Cris Chaves" },
			undefined,
			runtime,
		);

		expect(encode).toHaveBeenCalledWith(
			expect.anything(),
			1_280,
			720,
			"image/jpeg",
			0.84,
			"Cris Chaves",
		);
	});

	it("positions the public watermark in the exact center of the image", () => {
		expect(centeredWatermarkLayout(1_280, 720)).toEqual({
			fontSize: 47,
			bandHeight: 113,
			bandTop: 303.5,
			textX: 640,
			textY: 360,
		});
	});

	it("rejects an encoder result with dimensions different from the canvas plan", async () => {
		const { runtime, close } = runtimeFor(1_280, 720);
		runtime.encode = vi.fn(
			async () => new Blob([syntheticJpeg(640, 480)], { type: "image/jpeg" }),
		);

		await expect(
			processImageInBrowser(imageFile(syntheticJpeg(1_280, 720)), {}, undefined, runtime),
		).rejects.toMatchObject({ code: "ENCODE_FAILED" });
		expect(close).toHaveBeenCalledOnce();
	});

	it("accepts and reencodes a static WebP without changing its media type", async () => {
		const { runtime } = runtimeFor(1_280, 720);
		const processed = await processImageInBrowser(
			imageFile(syntheticWebp(1_280, 720), "sala.webp", "image/webp"),
			{},
			undefined,
			runtime,
		);

		expect(processed.output).toMatchObject({
			mimeType: "image/webp",
			extension: "webp",
			width: 1_280,
			height: 720,
		});
		expect(processed.opaqueFileName).toMatch(/^[0-9a-f-]{36}\.webp$/);
	});

	it("accepts the client's static PNG as input and reencodes it to an allowed WebP", async () => {
		const { runtime, encode } = runtimeFor(962, 540);

		const processed = await processImageInBrowser(
			imageFile(
				syntheticPng(),
				"{A25B6185-A4E5-4F29-A91E-5E9856BC9306}.png",
				"image/png",
			),
			{},
			undefined,
			runtime,
		);

		expect(processed.source).toMatchObject({
			mimeType: "image/png",
			width: 962,
			height: 540,
		});
		expect(processed.output).toMatchObject({
			mimeType: "image/webp",
			extension: "webp",
		});
		expect(processed.opaqueFileName).toMatch(/^[0-9a-f-]{36}\.webp$/);
		expect(encode).toHaveBeenCalledWith(
			expect.anything(),
			962,
			540,
			"image/webp",
			0.84,
			undefined,
		);
	});

	it("rejects APNG before decoding pixels", async () => {
		const { runtime } = runtimeFor(962, 540);

		await expect(
			processImageInBrowser(
				imageFile(syntheticPng(962, 540, true), "fachada.png", "image/png"),
				{},
				undefined,
				runtime,
			),
		).rejects.toMatchObject({ code: "SOURCE_TYPE_MISMATCH" });
		expect(runtime.decode).not.toHaveBeenCalled();
	});

	it("rejects a PNG with a corrupted chunk before decoding pixels", async () => {
		const corruptPng = syntheticPng();
		corruptPng[32] ^= 0xff;
		const { runtime } = runtimeFor(962, 540);

		await expect(
			processImageInBrowser(
				imageFile(corruptPng, "fachada.png", "image/png"),
				{},
				undefined,
				runtime,
			),
		).rejects.toMatchObject({ code: "SOURCE_TYPE_MISMATCH" });
		expect(runtime.decode).not.toHaveBeenCalled();
	});

	it("does not allow PNG as an encoded output format", async () => {
		const { runtime } = runtimeFor(962, 540);

		await expect(
			processImageInBrowser(
				imageFile(syntheticPng(), "fachada.png", "image/png"),
				{ outputMimeType: "image/png" } as never,
				undefined,
				runtime,
			),
		).rejects.toThrow();
		expect(runtime.decode).not.toHaveBeenCalled();
	});

	it("rejects animated WebP before decoding pixels", async () => {
		const { runtime } = runtimeFor(320, 240);
		await expect(
			processImageInBrowser(
				imageFile(syntheticWebp(320, 240, true), "animacao.webp", "image/webp"),
				{},
				undefined,
				runtime,
			),
		).rejects.toMatchObject({ code: "SOURCE_TYPE_MISMATCH" });
		expect(runtime.decode).not.toHaveBeenCalled();
	});

	it.each([
		["double extension", "fachada.svg.jpg", "image/jpeg", syntheticJpeg()],
		["path characters", "../fachada.jpg", "image/jpeg", syntheticJpeg()],
		["MIME mismatch", "fachada.webp", "image/webp", syntheticJpeg()],
		["PNG extension with JPEG MIME", "fachada.png", "image/jpeg", syntheticPng()],
		["JPEG extension with PNG MIME", "fachada.jpg", "image/png", syntheticPng()],
		["PNG bytes declared as JPEG", "fachada.jpg", "image/jpeg", syntheticPng()],
		["arbitrary bytes", "fachada.jpg", "image/jpeg", new Uint8Array(32)],
	])("rejects an unsafe source: %s", async (_label, name, type, bytes) => {
		const { runtime } = runtimeFor(320, 240);
		await expect(
			processImageInBrowser(imageFile(bytes, name, type), {}, undefined, runtime),
		).rejects.toBeInstanceOf(BrowserImageProcessingError);
		expect(runtime.decode).not.toHaveBeenCalled();
	});

	it("retries at lower quality and rejects output that still exceeds the byte limit", async () => {
		const { runtime, close } = runtimeFor(320, 240);
		runtime.encode = vi.fn(
			async () => new Blob([new Uint8Array(21)], { type: "image/jpeg" }),
		);
		const restrictivePolicy = {
			maxBytesPerImage: 20,
			minWidth: 320,
			minHeight: 240,
			maxWidth: 8_192,
			maxHeight: 8_192,
			maxPixels: 24_000_000,
			maxImagesPerProperty: 30,
			maxTotalStorageBytes: 1_000_000_000,
		};

		await expect(
			processImageInBrowser(
				imageFile(syntheticJpeg()),
				{ maxEncodingAttempts: 2 },
				restrictivePolicy,
				runtime,
			),
		).rejects.toMatchObject({ code: "OUTPUT_TOO_LARGE" });
		expect(runtime.encode).toHaveBeenCalledTimes(2);
		expect(close).toHaveBeenCalledOnce();
	});

	it("fits dimensions without enlarging the image", () => {
		expect(fitImageDimensions(1_200, 800, 2_560, 2_560)).toEqual({
			width: 1_200,
			height: 800,
		});
		expect(fitImageDimensions(4_000, 3_000, 2_560, 2_560)).toEqual({
			width: 2_560,
			height: 1_920,
		});
	});

	it("creates a lowercase SHA-256 checksum with Web Crypto", async () => {
		await expect(calculateSha256Hex(new TextEncoder().encode("abc"))).resolves.toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});

describe("image upload plan DTO", () => {
	const propertyId = "40000000-0000-4000-8000-000000000004";
	const objectId = "50000000-0000-4000-8000-000000000005";
	const validPlan = {
		kind: "image",
		propertyId,
		bucket: "property-originals",
		objectPath: `properties/${propertyId}/originals/${objectId}.jpg`,
		mimeType: "image/jpeg",
		byteLength: 120_000,
		width: 1_920,
		height: 1_280,
		checksumSha256: "b".repeat(64),
		altText: "Fachada do imóvel ao entardecer",
		sortOrder: 0,
		isCover: true,
	} as const;

	it("accepts only a matching opaque original path and normalized metadata", () => {
		expect(parseImageUploadPlan(validPlan)).toEqual(validPlan);
	});

	it.each([
		["traversal", { objectPath: `properties/${propertyId}/originals/../foto.jpg` }],
		["original name", { objectPath: `properties/${propertyId}/originals/fachada.jpg` }],
		["wrong property", { propertyId: "60000000-0000-4000-8000-000000000006" }],
		["double extension", { objectPath: `${validPlan.objectPath}.html` }],
		["MIME mismatch", { mimeType: "image/webp" }],
		["empty alt", { altText: "   " }],
		["control character in alt", { altText: "Fachada\u0000externa" }],
		["negative order", { sortOrder: -1 }],
		["invalid checksum", { checksumSha256: "ABC" }],
	])("rejects %s", (_label, override) => {
		expect(() => parseImageUploadPlan({ ...validPlan, ...override })).toThrow();
	});
});
