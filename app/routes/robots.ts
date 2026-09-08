import { loadPublicSiteContext } from "~/lib/public-site/loader.server";

import type { Route } from "./+types/robots";

export function loader({ request, context }: Route.LoaderArgs) {
	const site = loadPublicSiteContext(request, context);
	const body = [
		"User-agent: *",
		"Allow: /",
		"Disallow: /admin",
		`Sitemap: ${new URL("/sitemap.xml", `${site.canonicalOrigin}/`).href}`,
		"",
	].join("\n");
	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
}
