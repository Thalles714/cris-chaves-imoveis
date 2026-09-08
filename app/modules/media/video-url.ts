import { z } from "zod";

export const videoSubmissionSchema = z
	.object({
		url: z.string().trim().min(1).max(2048),
		confirmedWatermarked: z.literal(true),
		confirmedPublicationAuthorized: z.literal(true),
	})
	.strict();

export type VideoSubmission = z.infer<typeof videoSubmissionSchema>;

export interface NormalizedVideoReference {
	provider: "youtube" | "vimeo";
	videoId: string;
	canonicalUrl: string;
	embedUrl: string;
	treatment: {
		watermarked: true;
		publicationAuthorized: true;
	};
}

export class VideoUrlValidationError extends Error {
	constructor() {
		super("A URL de vídeo não é permitida.");
		this.name = "VideoUrlValidationError";
	}
}

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const vimeoIdPattern = /^[1-9][0-9]{5,11}$/;

function hasOnlyParams(url: URL, allowed: readonly string[]) {
	const allowedSet = new Set(allowed);
	return [...url.searchParams.keys()].every((key) => allowedSet.has(key));
}

function parseYoutube(url: URL): string | null {
	if (url.hostname === "youtu.be") {
		if (url.search || url.pathname.split("/").filter(Boolean).length !== 1) return null;
		const id = url.pathname.slice(1);
		return youtubeIdPattern.test(id) ? id : null;
	}
	if (url.hostname !== "youtube.com" && url.hostname !== "www.youtube.com") {
		return null;
	}
	if (url.pathname === "/watch") {
		if (!hasOnlyParams(url, ["v"]) || url.searchParams.getAll("v").length !== 1) {
			return null;
		}
		const id = url.searchParams.get("v") ?? "";
		return youtubeIdPattern.test(id) ? id : null;
	}
	if (url.search) return null;
	const segments = url.pathname.split("/").filter(Boolean);
	if (
		segments.length === 2 &&
		(segments[0] === "shorts" || segments[0] === "embed") &&
		segments[1] &&
		youtubeIdPattern.test(segments[1])
	) {
		return segments[1];
	}
	return null;
}

function parseVimeo(url: URL): string | null {
	if (url.search) return null;
	const segments = url.pathname.split("/").filter(Boolean);
	if (
		(url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") &&
		segments.length === 1 &&
		segments[0] &&
		vimeoIdPattern.test(segments[0])
	) {
		return segments[0];
	}
	if (
		url.hostname === "player.vimeo.com" &&
		segments.length === 2 &&
		segments[0] === "video" &&
		segments[1] &&
		vimeoIdPattern.test(segments[1])
	) {
		return segments[1];
	}
	return null;
}

/** Pure parsing only: this function deliberately performs no network request. */
export function normalizeVideoSubmission(
	input: VideoSubmission,
): NormalizedVideoReference {
	const parsed = videoSubmissionSchema.safeParse(input);
	if (!parsed.success) throw new VideoUrlValidationError();

	const authority = /^https:\/\/([^/?#]+)/i.exec(parsed.data.url)?.[1];
	// URL normalizes an explicit default port away, so inspect the raw authority.
	if (!authority || authority.includes(":")) throw new VideoUrlValidationError();

	let url: URL;
	try {
		url = new URL(parsed.data.url);
	} catch {
		throw new VideoUrlValidationError();
	}
	if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) {
		throw new VideoUrlValidationError();
	}

	const youtubeId = parseYoutube(url);
	if (youtubeId) {
		return {
			provider: "youtube",
			videoId: youtubeId,
			canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
			embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
			treatment: { watermarked: true, publicationAuthorized: true },
		};
	}

	const vimeoId = parseVimeo(url);
	if (vimeoId) {
		return {
			provider: "vimeo",
			videoId: vimeoId,
			canonicalUrl: `https://vimeo.com/${vimeoId}`,
			embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
			treatment: { watermarked: true, publicationAuthorized: true },
		};
	}

	throw new VideoUrlValidationError();
}
