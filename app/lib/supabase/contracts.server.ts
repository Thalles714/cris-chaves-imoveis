import type { CookieOptions } from "@supabase/ssr";

export interface SupabaseCookie {
	name: string;
	value: string;
}

export type SupabaseCookieOptions = CookieOptions;

export interface SupabaseCookieToSet extends SupabaseCookie {
	options?: SupabaseCookieOptions;
}

/** Shape consumed by an `@supabase/ssr` server client adapter. */
export interface SupabaseSsrCookieStore {
	getAll(): SupabaseCookie[];
	setAll(cookies: SupabaseCookieToSet[], headers?: Record<string, string>): void;
}

export interface SupabaseServerClientAdapterOptions {
	url: string;
	publishableKey: string;
	cookies: SupabaseSsrCookieStore;
	requestHeaders: Headers;
}

/**
 * Keeps the application independent from the concrete SDK. The composition
 * root can wrap `createServerClient` from `@supabase/ssr` without exposing it to
 * browser modules.
 */
export interface SupabaseServerClientAdapter<Client> {
	createServerClient(options: SupabaseServerClientAdapterOptions): Client;
}

export type SupabaseServerClientFactory<Client> = (
	options: SupabaseServerClientAdapterOptions,
) => Client;

export function defineSupabaseServerClientAdapter<Client>(
	factory: SupabaseServerClientFactory<Client>,
): SupabaseServerClientAdapter<Client> {
	return { createServerClient: factory };
}

export interface RequestScopedSupabaseClient<Client> {
	client: Client;
	responseHeaders: Headers;
}
