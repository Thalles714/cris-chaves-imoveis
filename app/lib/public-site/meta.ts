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

function titleFrom(descriptors: readonly MetaDescriptor[]) {
	const descriptor = descriptors.find(
		(item) => "title" in item && typeof item.title === "string",
	);
	return descriptor && "title" in descriptor ? descriptor.title : undefined;
}

function descriptionFrom(descriptors: readonly MetaDescriptor[]) {
	const descriptor = descriptors.find(
		(item) =>
			"name" in item &&
			item.name === "description" &&
			"content" in item &&
			typeof item.content === "string",
	);
	return descriptor && "content" in descriptor ? descriptor.content : undefined;
}

function hasProperty(descriptors: readonly MetaDescriptor[], property: string) {
	return descriptors.some((item) => "property" in item && item.property === property);
}

function hasName(descriptors: readonly MetaDescriptor[], name: string) {
	return descriptors.some((item) => "name" in item && item.name === name);
}

function propertyContent(descriptors: readonly MetaDescriptor[], property: string) {
	const descriptor = descriptors.find(
		(item) =>
			"property" in item &&
			item.property === property &&
			"content" in item &&
			typeof item.content === "string",
	);
	return descriptor && "content" in descriptor ? descriptor.content : undefined;
}

export function publicMeta(
	matches: readonly (PublicMetaMatch | undefined)[],
	descriptors: MetaDescriptor[],
): MetaDescriptor[] {
	const canonicalUrl = canonicalFrom(matches);
	const explicitSocialImage = propertyContent(descriptors, "og:image");
	const defaultSocialImage = explicitSocialImage
		? undefined
		: socialImageFrom(canonicalUrl);
	const socialImage = explicitSocialImage ?? defaultSocialImage;
	const title = titleFrom(descriptors);
	const description = descriptionFrom(descriptors);
	return [
		...descriptors,
		...(title && !hasProperty(descriptors, "og:title")
			? [{ property: "og:title", content: title }]
			: []),
		...(description && !hasProperty(descriptors, "og:description")
			? [{ property: "og:description", content: description }]
			: []),
		...(title && !hasName(descriptors, "twitter:title")
			? [{ name: "twitter:title", content: title }]
			: []),
		...(description && !hasName(descriptors, "twitter:description")
			? [{ name: "twitter:description", content: description }]
			: []),
		...(!hasProperty(descriptors, "og:site_name")
			? [{ property: "og:site_name", content: siteNameFrom(matches) }]
			: []),
		...(!hasProperty(descriptors, "og:locale")
			? [{ property: "og:locale", content: "pt_BR" }]
			: []),
		...(!hasProperty(descriptors, "og:type")
			? [{ property: "og:type", content: "website" }]
			: []),
		...(canonicalUrl
			? [
					{ tagName: "link" as const, rel: "canonical", href: canonicalUrl },
					{ property: "og:url", content: canonicalUrl },
				]
			: []),
		...(defaultSocialImage
			? [
					{ property: "og:image", content: socialImage },
					{ property: "og:image:width", content: "1200" },
					{ property: "og:image:height", content: "630" },
					{ property: "og:image:alt", content: "Cris Chaves Corretor de Imóveis" },
				]
			: []),
		...(socialImage && !hasName(descriptors, "twitter:card")
			? [{ name: "twitter:card", content: "summary_large_image" }]
			: []),
		...(socialImage && !hasName(descriptors, "twitter:image")
			? [{ name: "twitter:image", content: socialImage }]
			: []),
	];
}
