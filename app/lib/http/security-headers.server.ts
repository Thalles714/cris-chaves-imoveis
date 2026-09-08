import type { AppEnvironment } from "~/lib/env/server-env.server";

function assertValidNonce(nonce: string) {
	if (!/^[A-Za-z0-9_-]{22}$/u.test(nonce)) {
		throw new Error("Nonce CSP inválido.");
	}
}

export function createCspNonce() {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const binary = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function buildContentSecurityPolicy(nonce: string) {
	assertValidNonce(nonce);

	return [
		"default-src 'self'",
		"base-uri 'none'",
		"connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
		"font-src 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"frame-src https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com",
		"img-src 'self' data: blob:",
		"media-src 'self'",
		"object-src 'none'",
		`script-src 'self' 'nonce-${nonce}' https://challenges.cloudflare.com`,
		"script-src-attr 'none'",
		"style-src 'self'",
		"style-src-attr 'unsafe-inline'",
		"upgrade-insecure-requests",
	].join("; ");
}

export function applySecurityHeaders(
	request: Request,
	response: Response,
	cspNonce: string,
	appEnvironment: AppEnvironment = "production",
) {
	const secured = new Response(response.body, response);
	const pathname = new URL(request.url).pathname;
	const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
	const isPreview = appEnvironment === "preview";
	if (isAdmin || isPreview) {
		secured.headers.set("X-Robots-Tag", "noindex, nofollow");
	}
	if (isAdmin) {
		secured.headers.set("Cache-Control", "private, no-store");
	}
	secured.headers.set("Content-Security-Policy", buildContentSecurityPolicy(cspNonce));
	secured.headers.set("Cross-Origin-Opener-Policy", "same-origin");
	secured.headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
	secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	secured.headers.set("X-Content-Type-Options", "nosniff");
	secured.headers.set("X-Frame-Options", "DENY");
	if (new URL(request.url).protocol === "https:") {
		secured.headers.set(
			"Strict-Transport-Security",
			"max-age=31536000; includeSubDomains",
		);
	}
	return secured;
}
