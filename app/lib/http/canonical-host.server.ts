import type { AppEnvironment } from "~/lib/env/server-env.server";

interface CanonicalHostOptions {
	appEnvironment: AppEnvironment;
	publicSiteUrl: unknown;
}

function readProductionOrigin(value: unknown) {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error("PUBLIC_SITE_URL é obrigatório em produção.");
	}

	const origin = new URL(value);
	if (origin.protocol !== "https:") {
		throw new Error("PUBLIC_SITE_URL deve usar HTTPS em produção.");
	}
	if (origin.origin !== value || origin.pathname !== "/") {
		throw new Error("PUBLIC_SITE_URL deve conter apenas a origem canônica.");
	}
	return origin;
}

export function redirectToCanonicalOrigin(
	request: Request,
	options: CanonicalHostOptions,
): Response | null {
	if (options.appEnvironment !== "production") return null;

	const canonicalOrigin = readProductionOrigin(options.publicSiteUrl);
	const requestUrl = new URL(request.url);
	const isCanonicalHost = requestUrl.hostname === canonicalOrigin.hostname;
	const isWwwHost = requestUrl.hostname === `www.${canonicalOrigin.hostname}`;
	if (!isCanonicalHost && !isWwwHost) return null;
	if (isCanonicalHost && requestUrl.protocol === "https:") return null;

	requestUrl.protocol = "https:";
	requestUrl.hostname = canonicalOrigin.hostname;
	requestUrl.port = "";
	return new Response(null, {
		status: 308,
		headers: {
			"Cache-Control": "public, max-age=3600",
			Location: requestUrl.href,
		},
	});
}
