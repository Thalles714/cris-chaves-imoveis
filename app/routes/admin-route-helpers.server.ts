/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import type { CloudflareContext } from "~/lib/cloudflare-context";
import { cloudflareContext } from "~/lib/cloudflare-context";
import {
	AdminAccessError,
	adminPrivateResponseHeaders,
	createRequestScopedAdminAuth,
	requireAdminOperation,
	type AdminOperation,
} from "~/modules/auth/index.server";
import { redirect } from "react-router";

type RouteContext = {
	get(key: typeof cloudflareContext): CloudflareContext;
};

type AdminRateLimitScope = "auth" | "mutation";

type MultiCookieHeaders = Headers & {
	getAll?: (name: string) => string[];
	getSetCookie?: () => string[];
};

function readSetCookies(headers: Headers | undefined): string[] {
	if (!headers) return [];

	const extended: MultiCookieHeaders = headers;
	if (typeof extended.getAll === "function") return extended.getAll("Set-Cookie");
	if (typeof extended.getSetCookie === "function") return extended.getSetCookie();

	const cookie = headers.get("Set-Cookie");
	return cookie ? [cookie] : [];
}

export function adminBindings(context: RouteContext): Readonly<Record<string, unknown>> {
	return context.get(cloudflareContext).env as unknown as Readonly<
		Record<string, unknown>
	>;
}

export function adminResponseHeaders(extra?: Headers): Headers {
	const headers = adminPrivateResponseHeaders();
	const setCookies = readSetCookies(extra);
	extra?.forEach((value, name) => {
		const normalizedName = name.toLowerCase();
		if (normalizedName === "set-cookie") return;
		if (normalizedName === "cache-control" || normalizedName === "x-robots-tag") {
			return;
		} else headers.set(name, value);
	});
	for (const cookie of setCookies) headers.append("Set-Cookie", cookie);
	return headers;
}

async function adminRateLimitKey(
	request: Request,
	scope: AdminRateLimitScope,
	dimension: "ip" | "identity" | "combined",
	identity: string,
): Promise<string> {
	const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
	const value =
		dimension === "ip"
			? `${scope}\u0000ip\u0000${ip}`
			: dimension === "identity"
				? `${scope}\u0000identity\u0000${identity}`
				: `${scope}\u0000combined\u0000${ip}\u0000${identity}`;
	const input = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", input);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 32);
}

export async function enforceAdminRateLimit(
	context: RouteContext,
	request: Request,
	scope: AdminRateLimitScope,
	identity = "anonymous",
): Promise<void> {
	const bindings = adminBindings(context);
	const bindingName =
		scope === "auth" ? "ADMIN_AUTH_RATE_LIMITER" : "ADMIN_MUTATION_RATE_LIMITER";
	const binding = bindings[bindingName];
	if (
		typeof binding !== "object" ||
		binding === null ||
		!("limit" in binding) ||
		typeof binding.limit !== "function"
	) {
		throw new Response("Área administrativa temporariamente indisponível.", {
			status: 503,
			headers: adminResponseHeaders(),
		});
	}

	const genericIdentities = new Set([
		"anonymous",
		"invalid-email",
		"invite-acceptance",
		"logout",
		"mfa",
		"password-reset",
	]);
	const dimensions: Array<"ip" | "identity" | "combined"> = genericIdentities.has(
		identity,
	)
		? ["ip", "combined"]
		: ["ip", "identity", "combined"];
	const outcomes = await Promise.all(
		dimensions.map(async (dimension) =>
			(binding as RateLimit).limit({
				key: await adminRateLimitKey(request, scope, dimension, identity),
			}),
		),
	);
	if (outcomes.some((outcome) => !outcome.success)) {
		const headers = adminResponseHeaders();
		headers.set("Retry-After", "60");
		throw new Response("Muitas tentativas. Aguarde um minuto e tente novamente.", {
			status: 429,
			headers,
		});
	}
}

export async function assertAdminFormRequest(request: Request): Promise<void> {
	const headers = adminResponseHeaders();
	if (request.method !== "POST") {
		throw new Response("Método não permitido.", { status: 405, headers });
	}

	const rawContentType = request.headers.get("content-type") ?? "";
	const contentType = rawContentType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
	if (
		contentType !== "application/x-www-form-urlencoded" &&
		contentType !== "multipart/form-data"
	) {
		throw new Response("Requisição inválida.", { status: 415, headers });
	}
	if (
		contentType === "multipart/form-data" &&
		!/^multipart\/form-data\s*;(?=[\s\S]*\bboundary=(?:"[^"]+"|[^;\s]+))(?:[\s\S]*)$/iu.test(
			rawContentType,
		)
	) {
		throw new Response("Requisição inválida.", { status: 415, headers });
	}

	const contentLengthHeader = request.headers.get("content-length");
	const contentLength = Number(contentLengthHeader);
	if (
		contentLengthHeader &&
		(!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > 32_768)
	) {
		throw new Response("Requisição inválida.", { status: 413, headers });
	}

	const reader = request.clone().body?.getReader();
	let received = 0;
	if (reader) {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			received += chunk.value.byteLength;
			if (received > 32_768) {
				void reader.cancel();
				throw new Response("Requisição inválida.", { status: 413, headers });
			}
		}
	}

	const origin = request.headers.get("origin");
	if (!origin || origin !== new URL(request.url).origin) {
		throw new Response("Requisição inválida.", { status: 403, headers });
	}
}

export async function readAdminFormData(request: Request): Promise<FormData> {
	try {
		return await request.formData();
	} catch {
		throw new Response("Formulário inválido.", {
			status: 400,
			headers: adminResponseHeaders(),
		});
	}
}

export async function requireAdminRoute(
	request: Request,
	context: RouteContext,
	operation: AdminOperation,
) {
	let scoped: ReturnType<typeof createRequestScopedAdminAuth>;
	try {
		scoped = createRequestScopedAdminAuth(request, adminBindings(context));
	} catch {
		throw new Response("Área administrativa temporariamente indisponível.", {
			status: 503,
			headers: adminResponseHeaders(),
		});
	}

	let session;
	try {
		session = await requireAdminOperation(request, operation, scoped.sessions);
	} catch (error) {
		if (error instanceof AdminAccessError) {
			if (error.code === "AUTHENTICATION_REQUIRED") {
				throw redirect("/admin/entrar", {
					headers: adminResponseHeaders(scoped.responseHeaders),
				});
			}
			if (error.code === "AAL2_REQUIRED") {
				throw redirect("/admin/mfa", {
					headers: adminResponseHeaders(scoped.responseHeaders),
				});
			}
		}
		throw new Response("Acesso não autorizado.", {
			status: 403,
			headers: adminResponseHeaders(scoped.responseHeaders),
		});
	}
	if (request.method === "POST") {
		await enforceAdminRateLimit(context, request, "mutation", session.userId);
	}
	return { ...scoped, session };
}
