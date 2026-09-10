import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

/** @typedef {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} FetchLike */

const canonicalOrigin = "https://crischaves.com.br";
const forbiddenPublicText =
	/localhost|127\.0\.0\.1|workers\.dev|observações internas|nome do proprietário|contato do proprietário|logradouro|\bcep\b/iu;

/** @param {string} value */
export function assertProductionBaseUrl(value) {
	const url = new URL(value);
	assert.equal(
		url.href,
		`${canonicalOrigin}/`,
		"Use somente a origem de produção autorizada, sem caminho, query ou porta.",
	);
	return url;
}

/** @param {Response} response */
function assertCoreHeaders(response) {
	assert.match(
		response.headers.get("strict-transport-security") ?? "",
		/max-age=31536000/iu,
	);
	assert.equal(response.headers.get("x-content-type-options"), "nosniff");
	assert.equal(response.headers.get("x-frame-options"), "DENY");
	assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
	assert.equal(
		response.headers.get("permissions-policy"),
		"camera=(), geolocation=(), microphone=()",
	);
}

/** @param {Response} response */
function assertDynamicHeaders(response) {
	assertCoreHeaders(response);
	assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
	const csp = response.headers.get("content-security-policy") ?? "";
	assert.match(csp, /default-src 'self'/u);
	assert.match(csp, /base-uri 'none'/u);
	assert.match(csp, /frame-ancestors 'none'/u);
	assert.match(csp, /object-src 'none'/u);
	assert.match(csp, /script-src[^;]*'nonce-[A-Za-z0-9_-]+'/u);
	assert.doesNotMatch(csp.match(/script-src[^;]*/u)?.[0] ?? "", /'unsafe-inline'/u);
	assert.equal(response.headers.get("content-security-policy-report-only"), null);
}

/**
 * @param {string} html
 * @param {string} expectedUrl
 */
function assertCanonicalDocument(html, expectedUrl) {
	const escaped = expectedUrl.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	assert.match(
		html,
		new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']${escaped}["']`, "iu"),
	);
	assert.match(
		html,
		new RegExp(`<meta[^>]+property=["']og:url["'][^>]+content=["']${escaped}["']`, "iu"),
	);
	assert.doesNotMatch(html, forbiddenPublicText);
	assert.doesNotMatch(
		html,
		/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/iu,
	);
}

/**
 * @param {FetchLike} fetchImpl
 * @param {string | URL} url
 * @param {RequestInit} [init]
 */
async function checkedFetch(fetchImpl, url, init = {}) {
	const method = init.method ?? "GET";
	assert.ok(
		method === "GET" || method === "HEAD",
		"O smoke test de produção é somente leitura.",
	);
	return fetchImpl(url, {
		redirect: "manual",
		...init,
		headers: {
			"User-Agent": "cris-chaves-production-security-check/1.0",
			...init.headers,
		},
	});
}

/**
 * @param {{ baseUrl?: string, fetchImpl?: FetchLike }} [options]
 */
export async function runProductionHttpSecurityChecks({
	baseUrl = process.env.PRODUCTION_BASE_URL ?? canonicalOrigin,
	fetchImpl = fetch,
} = {}) {
	const base = assertProductionBaseUrl(baseUrl);
	const results = [];
	/**
	 * @param {string} path
	 * @param {RequestInit} [init]
	 */
	const request = (path, init) => checkedFetch(fetchImpl, new URL(path, base), init);

	/** @type {Array<[string, string, number]>} */
	const redirectChecks = [
		["HTTP para HTTPS", "http://crischaves.com.br/home?verificacao=canonico", 301],
		["www para raiz", "https://www.crischaves.com.br/home?verificacao=canonico", 308],
	];
	for (const [name, url, expectedStatus] of redirectChecks) {
		const response = await checkedFetch(fetchImpl, url, { method: "HEAD" });
		assert.equal(response.status, expectedStatus);
		assert.equal(
			response.headers.get("location"),
			`${canonicalOrigin}/home?verificacao=canonico`,
		);
		results.push(name);
	}

	for (const path of ["/", "/home"]) {
		const response = await request(path);
		assert.equal(response.status, 200);
		assertDynamicHeaders(response);
		assert.doesNotMatch(response.headers.get("x-robots-tag") ?? "", /\bnoindex\b/iu);
		assertCanonicalDocument(await response.text(), `${canonicalOrigin}${path}`);
		results.push(`documento público ${path}`);
	}
	for (const path of ["/regioes", "/sobre-cris", "/anuncie-seu-imovel", "/contato"]) {
		const response = await request(path);
		assert.equal(response.status, 200);
		assertDynamicHeaders(response);
		assertCanonicalDocument(await response.text(), `${canonicalOrigin}${path}`);
		results.push(`rota pública ${path}`);
	}

	const sitemapResponse = await request("/sitemap.xml");
	assert.equal(sitemapResponse.status, 200);
	assertDynamicHeaders(sitemapResponse);
	assert.match(sitemapResponse.headers.get("content-type") ?? "", /^application\/xml/iu);
	const sitemap = await sitemapResponse.text();
	assert.match(sitemap, /<loc>https:\/\/crischaves\.com\.br\//u);
	assert.doesNotMatch(sitemap, forbiddenPublicText);
	assert.doesNotMatch(sitemap, /\/admin/iu);
	const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(
		(match) => match[1],
	);
	assert.ok(sitemapUrls.length > 0, "O sitemap deve conter URLs públicas.");
	for (const value of sitemapUrls) {
		const url = new URL(value);
		assert.equal(url.origin, canonicalOrigin);
		const response = await request(`${url.pathname}${url.search}`);
		assert.equal(response.status, 200, `URL inválida no sitemap: ${url.pathname}`);
	}
	results.push("sitemap canônico");

	const propertyPath = sitemap.match(
		/<loc>https:\/\/crischaves\.com\.br(\/imoveis\/[^<]+)<\/loc>/u,
	)?.[1];
	assert.ok(propertyPath, "O sitemap deve conter ao menos um imóvel publicado.");
	const propertyResponse = await request(propertyPath);
	assert.equal(propertyResponse.status, 200);
	assertDynamicHeaders(propertyResponse);
	const propertyHtml = await propertyResponse.text();
	assertCanonicalDocument(propertyHtml, `${canonicalOrigin}${propertyPath}`);
	assert.match(propertyHtml, /preservo o endereço exato/iu);
	results.push("detalhe público sem endereço privado");

	const mediaPath = propertyHtml.match(
		/(?:src|href)=["'](\/media\/[0-9a-f-]{36})["']/iu,
	)?.[1];
	assert.ok(mediaPath, "O imóvel deve usar uma URL de mídia pública opaca.");
	const mediaResponse = await request(mediaPath);
	assert.equal(mediaResponse.status, 200);
	assertCoreHeaders(mediaResponse);
	assert.match(
		mediaResponse.headers.get("content-type") ?? "",
		/^image\/(?:jpeg|webp)/iu,
	);
	assert.equal(mediaResponse.headers.get("cache-control"), "private, no-store");
	results.push("mídia pública opaca");

	const robotsResponse = await request("/robots.txt");
	assert.equal(robotsResponse.status, 200);
	assertCoreHeaders(robotsResponse);
	const robots = await robotsResponse.text();
	assert.match(robots, /Disallow: \/admin/u);
	assert.match(robots, /Sitemap: https:\/\/crischaves\.com\.br\/sitemap\.xml/u);
	results.push("robots de produção");

	const adminResponse = await request("/admin/entrar");
	assert.equal(adminResponse.status, 200);
	assertDynamicHeaders(adminResponse);
	assert.equal(adminResponse.headers.get("cache-control"), "private, no-store");
	assert.match(adminResponse.headers.get("x-robots-tag") ?? "", /\bnoindex\b/iu);
	results.push("login administrativo protegido");

	for (const path of ["/privacidade", "/termos"]) {
		const response = await request(path);
		assert.equal(response.status, 200);
		assertDynamicHeaders(response);
		const html = await response.text();
		assertCanonicalDocument(html, `${canonicalOrigin}${path}`);
		assert.doesNotMatch(html, /minuta|texto preliminar/iu);
		results.push(`página legal ${path}`);
	}

	return { checks: results.length, propertyPath, mediaPath, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await runProductionHttpSecurityChecks();
	for (const item of result.results) console.log(`✓ ${item}`);
	console.log(
		`${result.checks} controles HTTP de produção aprovados, somente com GET/HEAD.`,
	);
}
