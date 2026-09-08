import { cloudflareContext } from "~/lib/cloudflare-context";
import { readServerEnvironment } from "~/lib/env/server-env.server";
import {
	createRequestScopedSupabaseClient,
	readSupabaseServerConfig,
	supabaseSsrAdapter,
} from "~/lib/supabase/index.server";
import { PublicMediaRepository } from "~/modules/media/server/public-media-repository.server";

import type { Route } from "./+types/media";

function notFound() {
	return new Response("Mídia não encontrada.", {
		status: 404,
		headers: { "Cache-Control": "private, no-store" },
	});
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	try {
		if (!params.mediaCode) return notFound();
		const cloudflare = context.get(cloudflareContext);
		const bindings = cloudflare.env as unknown as Readonly<Record<string, unknown>>;
		const { appEnvironment } = readServerEnvironment(bindings);
		if (appEnvironment === "test") return notFound();
		const scoped = createRequestScopedSupabaseClient({
			request,
			config: readSupabaseServerConfig(bindings),
			adapter: supabaseSsrAdapter,
		});
		const media = await new PublicMediaRepository(scoped.client).findPublishedImage(
			params.mediaCode,
		);
		if (!media) return notFound();
		const result = await scoped.client.storage
			.from(media.bucket)
			.download(media.objectPath);
		if (result.error || !result.data) return notFound();
		return new Response(result.data, {
			headers: {
				"Content-Type": media.mimeType,
				// The media code is stable while publication state is not. Revalidate every
				// request so archiving a property revokes its images immediately.
				"Cache-Control": "private, no-store",
				"Content-Disposition": "inline",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch {
		return notFound();
	}
}
