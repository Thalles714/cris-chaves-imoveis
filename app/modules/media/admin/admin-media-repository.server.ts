import type { SupabaseServerConfig } from "~/lib/supabase/index.server";

import type {
	AdminImagePlanInput,
	AdminImageUploadGrant,
	AdminMediaItem,
	AdminMediaMetadataInput,
	AdminMediaArchiveInput,
	AdminVideoInput,
} from "./admin-media";

export interface AdminMediaRepository {
	list(propertyId: string): Promise<readonly AdminMediaItem[]>;
	planImage(
		input: AdminImagePlanInput,
		config: SupabaseServerConfig,
	): Promise<AdminImageUploadGrant>;
	confirmImage(
		propertyId: string,
		mediaId: string,
		expectedVersion: number,
		isCover: boolean,
	): Promise<AdminMediaItem>;
	addVideo(input: AdminVideoInput): Promise<AdminMediaItem>;
	updateMetadata(input: AdminMediaMetadataInput): Promise<AdminMediaItem>;
	archive(input: AdminMediaArchiveInput): Promise<void>;
	downloadPreview(
		propertyId: string,
		mediaId: string,
	): Promise<{ body: Blob; mimeType: "image/jpeg" | "image/webp" }>;
}
