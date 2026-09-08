import { describe, expect, it } from "vitest";

import {
	adminMediaArchiveInputSchema,
	adminImagePlanInputSchema,
	adminImageUploadGrantSchema,
} from "~/modules/media/admin/admin-media";

const propertyId = "40000000-0000-4000-8000-000000000004";
const originalId = "50000000-0000-4000-8000-000000000005";
const publicId = "60000000-0000-4000-8000-000000000006";
const descriptor = {
	mimeType: "image/jpeg",
	byteLength: 120_000,
	width: 1_920,
	height: 1_280,
	checksumSha256: "a".repeat(64),
} as const;

describe("admin media contracts", () => {
	it("requires a versioned property-scoped request to hide media", () => {
		expect(
			adminMediaArchiveInputSchema.parse({
				propertyId,
				mediaId: originalId,
				expectedVersion: 2,
			}),
		).toEqual({ propertyId, mediaId: originalId, expectedVersion: 2 });
		expect(() =>
			adminMediaArchiveInputSchema.parse({
				propertyId,
				mediaId: originalId,
				expectedVersion: 0,
			}),
		).toThrow();
	});
	it("requires separate original and public derivative descriptions", () => {
		expect(
			adminImagePlanInputSchema.parse({
				propertyId,
				original: descriptor,
				publicDerivative: { ...descriptor, checksumSha256: "b".repeat(64) },
				altText: "Fachada principal",
				sortOrder: 0,
				isCover: true,
				privacyReviewed: true,
			}),
		).toMatchObject({ propertyId, isCover: true });
	});

	it("rejects a plan without the public derivative", () => {
		expect(() =>
			adminImagePlanInputSchema.parse({
				propertyId,
				original: descriptor,
				altText: "Fachada principal",
				sortOrder: 0,
				isCover: false,
				privacyReviewed: true,
			}),
		).toThrow();
	});

	it("rejects an unchanged public copy without watermark evidence", () => {
		expect(() =>
			adminImagePlanInputSchema.parse({
				propertyId,
				original: descriptor,
				publicDerivative: descriptor,
				altText: "Fachada principal",
				sortOrder: 0,
				isCover: false,
				privacyReviewed: true,
			}),
		).toThrow(/diferente/u);
	});

	it("requires an explicit privacy review before planning an image", () => {
		expect(() =>
			adminImagePlanInputSchema.parse({
				propertyId,
				original: descriptor,
				publicDerivative: { ...descriptor, checksumSha256: "b".repeat(64) },
				altText: "Fachada principal",
				sortOrder: 0,
				isCover: true,
				privacyReviewed: false,
			}),
		).toThrow(/privacidade/u);
	});

	it("does not allow the private bucket in the public derivative grant", () => {
		const planBase = {
			kind: "image",
			propertyId,
			mimeType: "image/jpeg",
			byteLength: 120_000,
			width: 1_920,
			height: 1_280,
			checksumSha256: "a".repeat(64),
			altText: "Fachada principal",
			sortOrder: 0,
			isCover: false,
		} as const;
		expect(() =>
			adminImageUploadGrantSchema.parse({
				mediaId: "70000000-0000-4000-8000-000000000007",
				mediaVersion: 1,
				original: {
					plan: {
						...planBase,
						bucket: "property-originals",
						objectPath: `properties/${propertyId}/originals/${originalId}.jpg`,
					},
					uploadToken: "x".repeat(32),
				},
				publicDerivative: {
					plan: {
						...planBase,
						bucket: "property-originals",
						objectPath: `properties/${propertyId}/originals/${publicId}.jpg`,
					},
					uploadToken: "y".repeat(32),
				},
				supabaseUrl: "https://example.supabase.co",
				publishableKey: "public-key-placeholder-value",
			}),
		).toThrow();
	});
});
