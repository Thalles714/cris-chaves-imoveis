import {
	createRequestScopedSupabaseClient,
	readSupabaseServerConfig,
	supabaseSsrAdapter,
} from "~/lib/supabase/index.server";

import { SupabaseAdminAuthFlow } from "./admin-auth-flow.server";
import { SupabaseAdminSessionReader } from "./admin-session.server";
import { SupabaseAdminMemberReader } from "./supabase-admin-member-reader.server";

const recoveryPath = "/admin/auth/callback?next=%2Fadmin%2Fredefinir-senha";

function resolveCanonicalAuthOrigin(
	request: Request,
	bindings: Readonly<Record<string, unknown>>,
	environment: string,
) {
	const configured = bindings.PUBLIC_SITE_URL;
	if (typeof configured === "string" && configured.trim()) {
		const url = new URL(configured);
		if (url.username || url.password || url.hash || url.search || url.pathname !== "/") {
			throw new Error("PUBLIC_SITE_URL must contain only the canonical origin.");
		}
		if (environment === "production" && url.protocol !== "https:") {
			throw new Error("PUBLIC_SITE_URL must use HTTPS in production.");
		}
		return url.origin;
	}
	if (environment === "production") {
		throw new Error("PUBLIC_SITE_URL is required in production.");
	}
	return new URL(request.url).origin;
}

/**
 * Composition root for administrative authentication. Configuration parsing is
 * intentionally fail-closed and the returned headers carry SSR cookie updates.
 */
export function createRequestScopedAdminAuth(
	request: Request,
	bindings: Readonly<Record<string, unknown>>,
) {
	const config = readSupabaseServerConfig(bindings);
	const scoped = createRequestScopedSupabaseClient({
		request,
		config,
		adapter: supabaseSsrAdapter,
	});
	const sessions = new SupabaseAdminSessionReader(
		scoped.client,
		new SupabaseAdminMemberReader(scoped.client),
	);
	const canonicalOrigin = resolveCanonicalAuthOrigin(
		request,
		bindings,
		config.appEnvironment,
	);
	const recoveryRedirectUrl = new URL(recoveryPath, `${canonicalOrigin}/`).toString();

	return {
		auth: new SupabaseAdminAuthFlow(
			request,
			scoped.client,
			sessions,
			recoveryRedirectUrl,
		),
		responseHeaders: scoped.responseHeaders,
		client: scoped.client,
		sessions,
	};
}
