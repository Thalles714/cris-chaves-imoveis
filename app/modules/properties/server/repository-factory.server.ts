import type { CloudflareContext } from "~/lib/cloudflare-context";
import { readServerEnvironment } from "~/lib/env/server-env.server";
import {
	createRequestScopedSupabaseClient,
	readSupabaseServerConfig,
	supabaseSsrAdapter,
} from "~/lib/supabase/index.server";

import type { PropertyRepository } from "./property-repository.server";
import { EmptyPropertyRepository } from "./empty-property-repository.server";
import { SupabasePropertyRepository } from "./supabase-property-repository.server";

function bindingsFrom(env: Env): Readonly<Record<string, unknown>> {
	return env as unknown as Readonly<Record<string, unknown>>;
}

export function createPublicPropertyRepository(
	request: Request,
	cloudflare: CloudflareContext,
): { repository: PropertyRepository; responseHeaders: Headers } {
	const bindings = bindingsFrom(cloudflare.env);
	const { appEnvironment } = readServerEnvironment(bindings);
	if (appEnvironment === "test") {
		return { repository: new EmptyPropertyRepository(), responseHeaders: new Headers() };
	}

	try {
		const config = readSupabaseServerConfig(bindings);
		const scoped = createRequestScopedSupabaseClient({
			request,
			config,
			adapter: supabaseSsrAdapter,
		});
		return {
			repository: new SupabasePropertyRepository(scoped.client),
			responseHeaders: scoped.responseHeaders,
		};
	} catch (error) {
		if (appEnvironment === "production") throw error;
		return { repository: new EmptyPropertyRepository(), responseHeaders: new Headers() };
	}
}
