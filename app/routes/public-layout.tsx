import { Outlet } from "react-router";

import type { Route } from "./+types/public-layout";
import { SiteShell } from "~/components/public";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";

export function loader({ request, context }: Route.LoaderArgs) {
	return loadPublicSiteContext(request, context);
}

export function meta({ loaderData }: Route.MetaArgs) {
	const socialImage = loaderData?.canonicalUrl
		? new URL("/brand/og-cris-chaves.png", loaderData.canonicalUrl).toString()
		: undefined;
	return [
		{ title: "Cris Chaves Corretor de Imóveis" },
		{
			name: "description",
			content:
				"Atendimento pessoal de Cris Chaves para encontrar, comprar, alugar ou anunciar imóveis no Litoral Norte Gaúcho.",
		},
		{ tagName: "link", rel: "canonical", href: loaderData?.canonicalUrl },
		{ property: "og:site_name", content: "Cris Chaves Corretor de Imóveis" },
		{ property: "og:locale", content: "pt_BR" },
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: loaderData?.canonicalUrl },
		{ property: "og:image", content: socialImage },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:image:alt", content: "Cris Chaves Corretor de Imóveis" },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:image", content: socialImage },
	];
}

export function headers() {
	return {
		"Cache-Control": "private, no-store",
	};
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
	return (
		<div id="topo">
			<SiteShell site={loaderData}>
				<Outlet />
			</SiteShell>
		</div>
	);
}
