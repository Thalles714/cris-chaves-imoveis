import type { AppSupabaseClient } from "~/lib/supabase/index.server";
import { z } from "zod";

const mediaCodeSchema = z.uuid();

export interface PublicImageObject {
	bucket: "property-public";
	objectPath: string;
	mimeType: "image/jpeg" | "image/webp";
}

/** Resolves only rows present in the safe, published-media projection. */
export class PublicMediaRepository {
	constructor(private readonly client: AppSupabaseClient) {}

	async findPublishedImage(rawMediaCode: string): Promise<PublicImageObject | null> {
		const mediaCode = mediaCodeSchema.parse(rawMediaCode);
		const result = await this.client
			.from("public_property_media")
			.select("media_kind,public_object_path")
			.eq("media_code", mediaCode)
			.eq("media_kind", "image")
			.maybeSingle();

		if (result.error) throw new Error("Não foi possível consultar a mídia.");
		if (!result.data?.public_object_path) return null;
		const extension = result.data.public_object_path.split(".").pop()?.toLowerCase();
		if (extension !== "jpg" && extension !== "jpeg" && extension !== "webp") {
			return null;
		}
		return {
			bucket: "property-public",
			objectPath: result.data.public_object_path,
			mimeType: extension === "webp" ? "image/webp" : "image/jpeg",
		};
	}
}
