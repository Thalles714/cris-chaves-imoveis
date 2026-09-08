import { cloudflareContext } from "~/lib/cloudflare-context";
import type { CloudflareContext } from "~/lib/cloudflare-context";

import { readPublicSiteConfig } from "./config.server";

export function loadPublicSiteContext(
	request: Request,
	context: { get(key: typeof cloudflareContext): CloudflareContext },
) {
	return readPublicSiteConfig(request, context.get(cloudflareContext));
}
