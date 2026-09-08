import assert from "node:assert/strict";

const baseUrl = new URL(
	process.env.STAGING_BASE_URL ??
		"https://cris-chaves-imoveis-staging.thallestleal.workers.dev",
);
assert.equal(baseUrl.protocol, "https:", "staging deve usar HTTPS");
assert.match(
	baseUrl.hostname,
	/^cris-chaves-imoveis-staging\.[a-z0-9-]+\.workers\.dev$/u,
	"o teste aceita somente o Worker autorizado de staging",
);
assert.equal(baseUrl.pathname, "/", "a origem de staging não pode conter caminho");
assert.equal(baseUrl.search, "", "a origem de staging não pode conter query string");

const propertyId = "00000000-0000-4000-8000-000000000999";
const commonHeaders = { "User-Agent": "cris-chaves-stage5-security-check/1.0" };
const results = [];

async function request(path, init = {}) {
	return fetch(new URL(path, baseUrl), {
		redirect: "manual",
		...init,
		headers: { ...commonHeaders, ...init.headers },
	});
}

function record(name, response) {
	results.push(`${name}: ${response.status}`);
}

function assertPreviewHeaders(response) {
	assert.match(response.headers.get("x-robots-tag") ?? "", /\bnoindex\b/iu);
	assert.match(response.headers.get("x-robots-tag") ?? "", /\bnofollow\b/iu);
	assert.match(
		response.headers.get("strict-transport-security") ?? "",
		/max-age=31536000/iu,
	);
	assert.equal(response.headers.get("x-content-type-options"), "nosniff");
	assert.equal(response.headers.get("x-frame-options"), "DENY");
	assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
	assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
	assert.equal(
		response.headers.get("permissions-policy"),
		"camera=(), geolocation=(), microphone=()",
	);
}

function assertStaticAssetHeaders(response) {
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
	assert.match(response.headers.get("x-robots-tag") ?? "", /\bnoindex\b/iu);
}

const home = await request("/");
assert.equal(home.status, 200);
assertPreviewHeaders(home);
const csp = home.headers.get("content-security-policy") ?? "";
assert.match(csp, /default-src 'self'/u);
assert.match(csp, /base-uri 'none'/u);
assert.match(csp, /frame-ancestors 'none'/u);
assert.match(csp, /object-src 'none'/u);
assert.match(csp, /script-src[^;]*'nonce-[A-Za-z0-9_-]+'/u);
assert.doesNotMatch(csp.match(/script-src[^;]*/u)?.[0] ?? "", /'unsafe-inline'/u);
assert.equal(home.headers.get("content-security-policy-report-only"), null);
const homeHtml = await home.text();
assert.match(homeHtml, /Sob consulta/u);
assert.match(homeHtml, /Dormitórios/u);
assert.match(homeHtml, /Banheiros/u);
record("home, headers e catálogo", home);

const staticAssetPaths = [
	"/favicon.ico",
	"/site.webmanifest",
	homeHtml.match(/(?:src|href)=["'](\/assets\/[^"']+\.js)["']/u)?.[1],
].filter(Boolean);
assert.equal(staticAssetPaths.length, 3, "a home deve referenciar um asset JavaScript");
for (const path of staticAssetPaths) {
	const asset = await request(path);
	assert.equal(asset.status, 200);
	assertStaticAssetHeaders(asset);
}
results.push("assets estáticos com headers completos: 3");

const admin = await request("/admin");
assert.equal(admin.status, 302);
assert.equal(admin.headers.get("location"), "/admin/entrar");
assert.equal(admin.headers.get("cache-control"), "private, no-store");
assertPreviewHeaders(admin);
record("admin sem sessão", admin);

const idor = await request(`/admin/imoveis/${propertyId}`);
assert.equal(idor.status, 302);
assert.equal(idor.headers.get("location"), "/admin/entrar");
assert.doesNotMatch(await idor.text(), /proprietário|logradouro|observações internas/iu);
record("IDOR sem sessão", idor);

const noOrigin = await request(`/admin/imoveis/${propertyId}`, {
	method: "POST",
	headers: { "Content-Type": "application/x-www-form-urlencoded" },
	body: "intent=update",
});
assert.equal(noOrigin.status, 403);
record("POST sem Origin", noOrigin);

const hostileOrigin = await request(`/admin/imoveis/${propertyId}`, {
	method: "POST",
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Origin: "https://attacker.invalid",
	},
	body: "intent=update",
});
assert.ok([400, 403].includes(hostileOrigin.status));
assert.doesNotMatch(
	await hostileOrigin.text(),
	/proprietário|logradouro|observações internas/iu,
);
record("POST com Origin hostil", hostileOrigin);

const sameOriginUnauthenticated = await request(`/admin/imoveis/${propertyId}`, {
	method: "POST",
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Origin: baseUrl.origin,
	},
	body: "intent=update",
});
assert.equal(sameOriginUnauthenticated.status, 302);
assert.equal(sameOriginUnauthenticated.headers.get("location"), "/admin/entrar");
record("POST same-origin sem sessão", sameOriginUnauthenticated);

const hostileUpload = await request(`/admin/imoveis/${propertyId}/midia/upload`, {
	method: "POST",
	headers: {
		"Content-Type": "application/x-www-form-urlencoded",
		Origin: "https://attacker.invalid",
	},
	body: "intent=plan-image",
});
assert.equal(hostileUpload.status, 403);
record("upload com Origin hostil", hostileUpload);

const jsonUpload = await request(`/admin/imoveis/${propertyId}/midia/upload`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: "{}",
});
assert.equal(jsonUpload.status, 415);
record("upload com mídia não permitida", jsonUpload);

const xssMarker = "stage5-xss-marker";
const xss = await request(
	`/?q=${encodeURIComponent(`<script id=${xssMarker}>alert(1)</script>`)}`,
);
assert.ok([200, 400].includes(xss.status));
const xssHtml = await xss.text();
assert.doesNotMatch(xssHtml, new RegExp(`<script[^>]+${xssMarker}`, "iu"));
assert.doesNotMatch(xssHtml, new RegExp(xssMarker, "u"));
record("marcador XSS", xss);

const mediaPath = homeHtml.match(/(?:src|href)=["'](\/media\/[0-9a-f-]{36})["']/iu)?.[1];
assert.ok(mediaPath, "a home deve expor ao menos uma URL de mídia pública opaca");
const media = await request(mediaPath);
assert.equal(media.status, 200);
assert.match(media.headers.get("content-type") ?? "", /^image\/(?:jpeg|webp)$/u);
record("mídia pública opaca", media);

const property = await request(
	"/imoveis/imovel-demonstrativo-casa-litoranea-contemporanea",
);
assert.equal(property.status, 200);
const propertyHtml = await property.text();
assert.match(propertyHtml, /Bairro demonstrativo, Cidreira/u);
assert.match(propertyHtml, /preservo o endereço exato/iu);
assert.doesNotMatch(
	propertyHtml,
	/Logradouro|CEP|Nome do proprietário|Contato do proprietário|Observações internas/u,
);
record("projeção pública do imóvel", property);

const robots = await request("/robots.txt");
assert.equal(robots.status, 200);
assertPreviewHeaders(robots);
assert.match(await robots.text(), /Disallow: \/admin/u);
record("robots de preview", robots);

const sitemap = await request("/sitemap.xml");
assert.equal(sitemap.status, 200);
assertPreviewHeaders(sitemap);
const sitemapXml = await sitemap.text();
assert.match(sitemapXml, new RegExp(`<loc>${baseUrl.origin.replaceAll(".", "\\.")}/`));
assert.doesNotMatch(sitemapXml, /\/admin|logradouro|proprietário/iu);
record("sitemap público", sitemap);

for (const result of results) console.log(`✓ ${result}`);
console.log(
	`${results.length} controles HTTP de staging aprovados sem mutação persistente.`,
);
