import { cloudflareContext } from "~/lib/cloudflare-context";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { createPublicPropertyRepository } from "~/modules/properties/server/repository-factory.server";

import type { Route } from "./+types/sitemap";

const staticPaths = [
	"/",
	"/home",
	"/regioes",
	"/sobre-cris",
	"/anuncie-seu-imovel",
	"/contato",
	"/privacidade",
	"/termos",
] as const;

function escapeXml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const site = loadPublicSiteContext(request, context);
	const { repository } = createPublicPropertyRepository(
		request,
		context.get(cloudflareContext),
	);
	const properties = await repository.listPublishedSitemapEntries();
	const urls = [
		...staticPaths.map((path) => ({
			location: new URL(path, `${site.canonicalOrigin}/`).href,
			lastModified: null,
		})),
		...properties.map((property) => ({
			location: new URL(`/imoveis/${property.slug}`, `${site.canonicalOrigin}/`).href,
			lastModified: property.publishedAt.slice(0, 10),
		})),
	];
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls.map(
			(entry) =>
				`<url><loc>${escapeXml(entry.location)}</loc>${entry.lastModified ? `<lastmod>${escapeXml(entry.lastModified)}</lastmod>` : ""}</url>`,
		),
		"</urlset>",
	].join("");
	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// Publication and archival must be reflected on the next crawler request.
			"Cache-Control": "private, no-store",
		},
	});
}
