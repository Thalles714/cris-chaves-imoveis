import { parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";

import type {
	RequestScopedSupabaseClient,
	SupabaseCookie,
	SupabaseCookieOptions,
	SupabaseCookieToSet,
	SupabaseServerClientAdapter,
} from "./contracts.server";
import { supabaseServerConfigSchema, type SupabaseServerConfig } from "./config.server";

function readRequestCookies(header: string | null): SupabaseCookie[] {
	if (!header) return [];
	return parseCookieHeader(header);
}

function serializeCookie(request: Request, cookie: SupabaseCookieToSet): string {
	const options: SupabaseCookieOptions = cookie.options ?? {};
	const url = new URL(request.url);
	return serializeCookieHeader(cookie.name, cookie.value, {
		...options,
		httpOnly: true,
		path: options.path ?? "/",
		sameSite: options.sameSite ?? "lax",
		secure: url.protocol === "https:" || options.secure,
	});
}

export interface CreateRequestScopedSupabaseOptions<Client> {
	request: Request;
	config: SupabaseServerConfig;
	adapter: SupabaseServerClientAdapter<Client>;
	responseHeaders?: Headers;
}

/**
 * Creates one user-scoped Supabase client for one Request. No client, cookie or
 * session is cached globally, which keeps concurrent Worker requests isolated.
 */
export function createRequestScopedSupabaseClient<Client>({
	request,
	config,
	adapter,
	responseHeaders = new Headers(),
}: CreateRequestScopedSupabaseOptions<Client>): RequestScopedSupabaseClient<Client> {
	const safeConfig = supabaseServerConfigSchema.parse(config);
	const client = adapter.createServerClient({
		url: safeConfig.url,
		publishableKey: safeConfig.publishableKey,
		requestHeaders: new Headers(request.headers),
		cookies: {
			getAll: () => readRequestCookies(request.headers.get("Cookie")),
			setAll: (cookies, headers = {}) => {
				for (const cookie of cookies) {
					responseHeaders.append("Set-Cookie", serializeCookie(request, cookie));
				}
				for (const [name, value] of Object.entries(headers)) {
					responseHeaders.set(name, value);
				}
				responseHeaders.set("Cache-Control", "private, no-store");
			},
		},
	});

	return { client, responseHeaders };
}
