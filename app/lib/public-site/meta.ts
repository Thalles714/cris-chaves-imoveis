import type { MetaDescriptor } from "react-router";

interface PublicMetaMatch {
	id: string;
	loaderData?: unknown;
}

function canonicalFrom(matches: readonly (PublicMetaMatch | undefined)[]) {
	const match = matches.find((item) => item?.id === "routes/public-layout");
	if (
		typeof match?.loaderData === "object" &&
		match.loaderData !== null &&
		"canonicalUrl" in match.loaderData &&
		typeof match.loaderData.canonicalUrl === "string"
	) {
		return match.loaderData.canonicalUrl;
	}
	return undefined;
}

function siteNameFrom(matches: readonly (PublicMetaMatch | undefined)[]) {
	const match = matches.find((item) => item?.id === "routes/public-layout");
	if (
		typeof match?.loaderData === "object" &&
		match.loaderData !== null &&
		"brandName" in match.loaderData &&
		typeof match.loaderData.brandName === "string"
	) {
		return match.loaderData.brandName;
	}
	return "Cris Chaves";
}

function socialImageFrom(canonicalUrl: string | undefined) {
	return canonicalUrl
		? new URL("/brand/og-cris-chaves.png", canonicalUrl).toString()
		: undefined;
}

export function publicMeta(
	matches: readonly (PublicMetaMatch | undefined)[],
	descriptors: MetaDescriptor[],
): MetaDescriptor[] {
	const canonicalUrl = canonicalFrom(matches);
	const socialImage = socialImageFrom(canonicalUrl);
	return [
		...descriptors,
		{ property: "og:site_name", content: siteNameFrom(matches) },
		{ property: "og:locale", content: "pt_BR" },
		{ property: "og:type", content: "website" },
		...(canonicalUrl
			? [
					{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
					{ property: "og:url", content: canonicalUrl },
				]
			: []),
		...(socialImage
			? [
					{ property: "og:image", content: socialImage },
					{ property: "og:image:width", content: "1200" },
					{ property: "og:image:height", content: "630" },
					{ property: "og:image:alt", content: "Cris Chaves Corretor de Imóveis" },
					{ name: "twitter:card", content: "summary_large_image" },
					{ name: "twitter:image", content: socialImage },
				]
			: []),
	];
}
