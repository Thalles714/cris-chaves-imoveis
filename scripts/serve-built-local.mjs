import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicRoot = resolve(root, "build", "client");
const allowedVarsFiles = new Set([".dev.vars", ".dev.vars.local", ".dev.vars.test"]);
const requestedVarsFile = process.env.CC_LOCAL_VARS_FILE?.trim() ?? ".dev.vars";
const varsFile = allowedVarsFiles.has(requestedVarsFile)
	? requestedVarsFile
	: ".dev.vars";
const varsPath = resolve(root, varsFile);
const requestedPort = Number.parseInt(process.env.CC_LOCAL_PORT ?? "5173", 10);
const port =
	Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65_535
		? requestedPort
		: 5173;

function parseDevVars(source) {
	const values = {};
	for (const rawLine of source.split(/\r?\n/u)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const separator = line.indexOf("=");
		if (separator < 1) continue;
		const name = line.slice(0, separator).trim();
		let value = line.slice(separator + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		values[name] = value;
	}
	return values;
}

const variables = parseDevVars(await readFile(varsPath, "utf8"));
const allowRateLimit = { limit: async () => ({ success: true }) };
const env = {
	...variables,
	ADMIN_AUTH_RATE_LIMITER: allowRateLimit,
	ADMIN_MUTATION_RATE_LIMITER: allowRateLimit,
	CONTACT_RATE_LIMITER: allowRateLimit,
};
const worker = (await import("../build/server/index.js")).default;

const mimeTypes = new Map([
	[".css", "text/css; charset=utf-8"],
	[".ico", "image/x-icon"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".png", "image/png"],
	[".svg", "image/svg+xml"],
	[".webmanifest", "application/manifest+json"],
	[".woff2", "font/woff2"],
]);

async function staticResponse(pathname) {
	const decoded = decodeURIComponent(pathname);
	const filePath = resolve(publicRoot, `.${decoded}`);
	if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) return null;
	try {
		if (!(await stat(filePath)).isFile()) return null;
		return new Response(await readFile(filePath), {
			headers: {
				"Cache-Control": decoded.startsWith("/assets/")
					? "public, max-age=31536000, immutable"
					: "no-cache",
				"Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
			},
		});
	} catch {
		return null;
	}
}

async function readBody(request) {
	if (request.method === "GET" || request.method === "HEAD") return undefined;
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	return Buffer.concat(chunks);
}

const server = createServer(async (incoming, outgoing) => {
	try {
		const origin = `http://${incoming.headers.host ?? "localhost:5173"}`;
		const url = new URL(incoming.url ?? "/", origin);
		let response = await staticResponse(url.pathname);
		if (!response) {
			const body = await readBody(incoming);
			const request = new Request(url, {
				method: incoming.method,
				headers: incoming.headers,
				body,
			});
			response = await worker.fetch(request, env, {
				passThroughOnException() {},
				waitUntil() {},
			});
		}

		outgoing.statusCode = response.status;
		for (const [name, value] of response.headers) outgoing.setHeader(name, value);
		const cookies = response.headers.getSetCookie?.() ?? [];
		if (cookies.length > 0) outgoing.setHeader("set-cookie", cookies);
		if (incoming.method === "HEAD" || !response.body) {
			outgoing.end();
			return;
		}
		outgoing.end(Buffer.from(await response.arrayBuffer()));
	} catch {
		outgoing.statusCode = 500;
		outgoing.setHeader("content-type", "text/plain; charset=utf-8");
		outgoing.end("Falha temporária ao executar o site local.");
	}
});

server.listen(port, "127.0.0.1", () => {
	console.log(`Site local disponível em http://127.0.0.1:${port}`);
});
