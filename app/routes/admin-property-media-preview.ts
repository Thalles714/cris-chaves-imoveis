/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { SupabaseAdminMediaRepository } from "~/modules/media/admin/index.server";
import { propertyIdSchema } from "~/modules/properties/validation/property-schema";

import type { Route } from "./+types/admin-property-media-preview";
import { adminResponseHeaders, requireAdminRoute } from "./admin-route-helpers.server";

const mediaIdPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const propertyId = propertyIdSchema.safeParse(params.propertyId);
	if (!propertyId.success || !params.mediaId || !mediaIdPattern.test(params.mediaId)) {
		throw new Response("Mídia não encontrada.", {
			status: 404,
			headers: adminResponseHeaders(),
		});
	}
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	try {
		const preview = await new SupabaseAdminMediaRepository(client).downloadPreview(
			propertyId.data,
			params.mediaId,
		);
		const headers = adminResponseHeaders(responseHeaders);
		headers.set("Content-Type", preview.mimeType);
		headers.set("Content-Disposition", "inline");
		headers.set("X-Content-Type-Options", "nosniff");
		return new Response(preview.body, { headers });
	} catch {
		throw new Response("Mídia não encontrada.", {
			status: 404,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
}
