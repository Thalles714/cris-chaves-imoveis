import type { Database } from "~/lib/supabase/database.types";
import type {
	AppSupabaseClient,
	SupabaseServerConfig,
} from "~/lib/supabase/index.server";

import {
	createPrivateImageObjectKey,
	createPublicImageObjectKey,
	imageUploadPlanSchema,
	normalizeVideoSubmission,
	publicImageUploadPlanSchema,
} from "../index";
import {
	adminImageConfirmationSchema,
	adminImagePlanInputSchema,
	adminImageUploadGrantSchema,
	AdminMediaError,
	adminMediaMetadataInputSchema,
	adminMediaArchiveInputSchema,
	adminVideoInputSchema,
	type AdminMediaItem,
} from "./admin-media";
import type { AdminMediaRepository } from "./admin-media-repository.server";
import { verifyStoredImageBytes } from "./verify-stored-image.server";

const mediaColumns =
	"id,public_id,property_id,media_kind,sort_order,alt_text,is_cover,processing_status,is_approved_for_publication,original_checksum_sha256,checksum_sha256,original_bucket_id,original_object_path,original_mime_type,original_byte_size,original_width,original_height,public_bucket_id,public_object_path,public_mime_type,public_byte_size,public_width,public_height,video_provider,video_id,version";

type MediaRow = Pick<
	Database["public"]["Tables"]["property_media"]["Row"],
	| "id"
	| "public_id"
	| "property_id"
	| "media_kind"
	| "sort_order"
	| "alt_text"
	| "is_cover"
	| "processing_status"
	| "is_approved_for_publication"
	| "original_checksum_sha256"
	| "checksum_sha256"
	| "original_bucket_id"
	| "original_object_path"
	| "original_mime_type"
	| "original_byte_size"
	| "original_width"
	| "original_height"
	| "public_bucket_id"
	| "public_object_path"
	| "public_mime_type"
	| "public_byte_size"
	| "public_width"
	| "public_height"
	| "video_provider"
	| "video_id"
	| "version"
>;

function videoUrl(row: MediaRow) {
	if (row.video_provider === "youtube" && row.video_id) {
		return `https://www.youtube.com/watch?v=${row.video_id}`;
	}
	if (row.video_provider === "vimeo" && row.video_id) {
		return `https://vimeo.com/${row.video_id}`;
	}
	return null;
}

function toItem(
	row: MediaRow,
	storage: { original: boolean; publicDerivative: boolean } = {
		original: false,
		publicDerivative: false,
	},
): AdminMediaItem {
	const validImageMime =
		row.original_mime_type === "image/jpeg" || row.original_mime_type === "image/webp"
			? row.original_mime_type
			: null;
	return {
		id: row.id,
		publicId: row.public_id,
		propertyId: row.property_id,
		kind: row.media_kind,
		altText: row.alt_text,
		sortOrder: row.sort_order,
		isCover: row.is_cover,
		processingStatus: row.processing_status,
		isApprovedForPublication: row.is_approved_for_publication,
		originalStored: storage.original,
		publicDerivativeStored: storage.publicDerivative,
		version: row.version,
		videoUrl: videoUrl(row),
		image:
			row.media_kind === "image" &&
			validImageMime &&
			row.original_byte_size !== null &&
			row.original_width !== null &&
			row.original_height !== null
				? {
						mimeType: validImageMime,
						byteLength: row.original_byte_size,
						width: row.original_width,
						height: row.original_height,
					}
				: null,
	};
}

export class SupabaseAdminMediaRepository implements AdminMediaRepository {
	constructor(
		private readonly client: AppSupabaseClient,
		private readonly trustedConfirmationClient?: AppSupabaseClient,
	) {}

	private async assertActiveProperty(propertyId: string) {
		const result = await this.client
			.from("properties")
			.select("id")
			.eq("id", propertyId)
			.is("deleted_at", null)
			.maybeSingle();
		if (result.error || !result.data) throw new AdminMediaError("NOT_FOUND");
	}

	private async findRow(propertyId: string, mediaId: string) {
		const parsed = adminImageConfirmationSchema
			.pick({ propertyId: true, mediaId: true })
			.parse({
				propertyId,
				mediaId,
			});
		const result = await this.client
			.from("property_media")
			.select(mediaColumns)
			.eq("id", parsed.mediaId)
			.eq("property_id", parsed.propertyId)
			.is("deleted_at", null)
			.maybeSingle();
		if (result.error || !result.data) throw new AdminMediaError("NOT_FOUND");
		return result.data;
	}

	private async objectMatches(
		bucket: string | null,
		path: string | null,
		expectedSize: number | null,
		expectedMime: string | null,
		expectedWidth: number | null,
		expectedHeight: number | null,
		expectedChecksum: string | null,
	) {
		if (
			!bucket ||
			!path ||
			expectedSize === null ||
			(expectedMime !== "image/jpeg" && expectedMime !== "image/webp") ||
			expectedWidth === null ||
			expectedHeight === null ||
			!expectedChecksum
		) {
			return false;
		}
		const result = await this.client.storage.from(bucket).download(path);
		if (result.error || !result.data) return false;
		return verifyStoredImageBytes(result.data, {
			fileName: path.slice(path.lastIndexOf("/") + 1),
			mimeType: expectedMime,
			byteLength: expectedSize,
			width: expectedWidth,
			height: expectedHeight,
			checksumSha256: expectedChecksum,
		});
	}

	private async storageState(row: MediaRow) {
		if (row.media_kind !== "image") return { original: false, publicDerivative: false };
		// Keep peak Worker memory bounded: each object can be up to 8 MiB, so verify
		// and release the private original before downloading the public derivative.
		const original = await this.objectMatches(
			row.original_bucket_id,
			row.original_object_path,
			row.original_byte_size,
			row.original_mime_type,
			row.original_width,
			row.original_height,
			row.original_checksum_sha256,
		);
		if (!original) return { original: false, publicDerivative: false };
		const publicDerivative = await this.objectMatches(
			row.public_bucket_id,
			row.public_object_path,
			row.public_byte_size,
			row.public_mime_type,
			row.public_width,
			row.public_height,
			row.checksum_sha256,
		);
		return { original, publicDerivative };
	}

	async list(rawPropertyId: string) {
		const propertyId = adminImageConfirmationSchema.shape.propertyId.parse(rawPropertyId);
		await this.assertActiveProperty(propertyId);
		const result = await this.client
			.from("property_media")
			.select(mediaColumns)
			.eq("property_id", propertyId)
			.is("deleted_at", null)
			.order("sort_order", { ascending: true })
			.order("id", { ascending: true });
		if (result.error) throw new AdminMediaError("STORAGE_UNAVAILABLE");
		return (result.data ?? []).map((row) =>
			toItem(row, {
				original: row.processing_status === "processed",
				publicDerivative: row.is_approved_for_publication,
			}),
		);
	}

	async planImage(
		rawInput: Parameters<AdminMediaRepository["planImage"]>[0],
		config: SupabaseServerConfig,
	) {
		const input = adminImagePlanInputSchema.parse(rawInput);
		await this.assertActiveProperty(input.propertyId);

		const count = await this.client
			.from("property_media")
			.select("id", { count: "exact", head: true })
			.eq("property_id", input.propertyId)
			.eq("media_kind", "image")
			.is("deleted_at", null);
		if (count.error) throw new AdminMediaError("STORAGE_UNAVAILABLE");
		if ((count.count ?? 0) >= 30) throw new AdminMediaError("IMAGE_LIMIT_REACHED");

		const originalPlan = imageUploadPlanSchema.parse({
			kind: "image",
			propertyId: input.propertyId,
			bucket: "property-originals",
			objectPath: createPrivateImageObjectKey(input.propertyId, {
				extension: input.original.mimeType === "image/webp" ? "webp" : "jpg",
			}),
			...input.original,
			altText: input.altText,
			sortOrder: input.sortOrder,
			isCover: input.isCover,
		});
		const publicPlan = publicImageUploadPlanSchema.parse({
			kind: "image",
			propertyId: input.propertyId,
			bucket: "property-public",
			objectPath: createPublicImageObjectKey(input.propertyId, {
				extension: input.publicDerivative.mimeType === "image/webp" ? "webp" : "jpg",
			}),
			...input.publicDerivative,
			altText: input.altText,
			sortOrder: input.sortOrder,
			isCover: input.isCover,
		});

		const created = await this.client
			.from("property_media")
			.insert({
				property_id: input.propertyId,
				media_kind: "image",
				sort_order: input.sortOrder,
				alt_text: input.altText,
				is_cover: false,
				processing_status: "planned",
				original_checksum_sha256: originalPlan.checksumSha256,
				checksum_sha256: publicPlan.checksumSha256,
				original_bucket_id: originalPlan.bucket,
				original_object_path: originalPlan.objectPath,
				original_mime_type: originalPlan.mimeType,
				original_byte_size: originalPlan.byteLength,
				original_width: originalPlan.width,
				original_height: originalPlan.height,
				public_bucket_id: publicPlan.bucket,
				public_object_path: publicPlan.objectPath,
				public_mime_type: publicPlan.mimeType,
				public_byte_size: publicPlan.byteLength,
				public_width: publicPlan.width,
				public_height: publicPlan.height,
				is_approved_for_publication: false,
			})
			.select("id,version")
			.single();
		if (created.error || !created.data) throw new AdminMediaError("CONFLICT");

		const [originalSigned, publicSigned] = await Promise.all([
			this.client.storage
				.from(originalPlan.bucket)
				.createSignedUploadUrl(originalPlan.objectPath, { upsert: false }),
			this.client.storage
				.from(publicPlan.bucket)
				.createSignedUploadUrl(publicPlan.objectPath, { upsert: false }),
		]);
		if (
			originalSigned.error ||
			!originalSigned.data ||
			publicSigned.error ||
			!publicSigned.data
		) {
			await this.client
				.from("property_media")
				.update({ deleted_at: new Date().toISOString() })
				.eq("id", created.data.id)
				.eq("version", created.data.version);
			throw new AdminMediaError("STORAGE_UNAVAILABLE");
		}

		return adminImageUploadGrantSchema.parse({
			mediaId: created.data.id,
			mediaVersion: created.data.version,
			original: { plan: originalPlan, uploadToken: originalSigned.data.token },
			publicDerivative: { plan: publicPlan, uploadToken: publicSigned.data.token },
			supabaseUrl: config.url,
			publishableKey: config.publishableKey,
		});
	}

	async confirmImage(
		rawPropertyId: string,
		rawMediaId: string,
		rawExpectedVersion: number,
		rawIsCover: boolean,
		rawActorId: string,
	) {
		const input = adminImageConfirmationSchema.parse({
			propertyId: rawPropertyId,
			mediaId: rawMediaId,
			expectedVersion: rawExpectedVersion,
			isCover: rawIsCover,
		});
		const row = await this.findRow(input.propertyId, input.mediaId);
		if (row.version !== input.expectedVersion) throw new AdminMediaError("CONFLICT");
		const storage = await this.storageState(row);
		if (row.media_kind !== "image" || !storage.original || !storage.publicDerivative) {
			throw new AdminMediaError("STORAGE_MISMATCH");
		}
		if (!this.trustedConfirmationClient) throw new AdminMediaError("STORAGE_UNAVAILABLE");
		const result = await this.trustedConfirmationClient.rpc("confirm_property_image", {
			p_property_id: input.propertyId,
			p_media_id: input.mediaId,
			p_expected_version: input.expectedVersion,
			p_is_cover: input.isCover,
			p_actor_id: adminImageConfirmationSchema.shape.propertyId.parse(rawActorId),
		});
		if (result.error || !result.data) throw new AdminMediaError("CONFLICT");
		return toItem(result.data, storage);
	}

	async addVideo(rawInput: Parameters<AdminMediaRepository["addVideo"]>[0]) {
		const input = adminVideoInputSchema.parse(rawInput);
		await this.assertActiveProperty(input.propertyId);
		const reference = normalizeVideoSubmission(input);
		const now = new Date().toISOString();
		const result = await this.client
			.from("property_media")
			.insert({
				property_id: input.propertyId,
				media_kind: "video",
				sort_order: input.sortOrder,
				alt_text: input.altText,
				is_cover: false,
				processing_status: "processed",
				processed_at: now,
				watermark_version: "external-confirmed-v1",
				video_provider: reference.provider,
				video_id: reference.videoId,
				video_treated_at: now,
				is_approved_for_publication: true,
				publication_authorized_at: now,
			})
			.select(mediaColumns)
			.single();
		if (result.error || !result.data) throw new AdminMediaError("CONFLICT");
		return toItem(result.data);
	}

	async updateMetadata(rawInput: Parameters<AdminMediaRepository["updateMetadata"]>[0]) {
		const input = adminMediaMetadataInputSchema.parse(rawInput);
		const current = await this.findRow(input.propertyId, input.mediaId);
		if (current.version !== input.expectedVersion) throw new AdminMediaError("CONFLICT");
		if (
			input.isCover &&
			(current.media_kind !== "image" || !current.is_approved_for_publication)
		) {
			throw new AdminMediaError(
				"PUBLIC_DERIVATIVE_REQUIRED",
				"A capa precisa ser uma imagem pública aprovada.",
			);
		}
		const result = await this.client.rpc("update_property_media_metadata", {
			p_property_id: input.propertyId,
			p_media_id: input.mediaId,
			p_expected_version: input.expectedVersion,
			p_alt_text: input.altText,
			p_sort_order: input.sortOrder,
			p_is_cover: input.isCover,
		});
		if (result.error || !result.data) throw new AdminMediaError("CONFLICT");
		return toItem(result.data, await this.storageState(result.data));
	}

	async archive(rawInput: Parameters<AdminMediaRepository["archive"]>[0]) {
		const input = adminMediaArchiveInputSchema.parse(rawInput);
		const current = await this.findRow(input.propertyId, input.mediaId);
		if (current.version !== input.expectedVersion) throw new AdminMediaError("CONFLICT");
		const result = await this.client
			.from("property_media")
			.update({ deleted_at: new Date().toISOString() })
			.eq("id", input.mediaId)
			.eq("property_id", input.propertyId)
			.eq("version", input.expectedVersion)
			.is("deleted_at", null)
			.select("id")
			.maybeSingle();
		if (result.error || !result.data) throw new AdminMediaError("CONFLICT");
	}

	async downloadPreview(rawPropertyId: string, rawMediaId: string) {
		const row = await this.findRow(rawPropertyId, rawMediaId);
		if (
			row.media_kind !== "image" ||
			(row.public_mime_type !== "image/jpeg" && row.public_mime_type !== "image/webp") ||
			!row.public_bucket_id ||
			!row.public_object_path
		) {
			throw new AdminMediaError("NOT_FOUND");
		}
		const mimeType: "image/jpeg" | "image/webp" = row.public_mime_type;
		const result = await this.client.storage
			.from(row.public_bucket_id)
			.download(row.public_object_path);
		if (result.error || !result.data) throw new AdminMediaError("STORAGE_UNAVAILABLE");
		return { body: result.data, mimeType };
	}
}
