import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import type { SupabaseServerClientAdapter } from "./contracts.server";

export type AppSupabaseClient = SupabaseClient<Database>;

const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Concrete SDK adapter. A fresh client is created for every Worker request. */
export const supabaseSsrAdapter: SupabaseServerClientAdapter<AppSupabaseClient> = {
	createServerClient(options) {
		const incomingRequestId = options.requestHeaders.get("x-request-id");
		const requestId =
			incomingRequestId && uuidPattern.test(incomingRequestId)
				? incomingRequestId
				: crypto.randomUUID();
		return createServerClient<Database>(options.url, options.publishableKey, {
			auth: {
				flowType: "pkce",
			},
			cookies: {
				getAll: () => options.cookies.getAll(),
				setAll: (cookies, headers) => options.cookies.setAll(cookies, headers),
			},
			global: {
				headers: { "x-request-id": requestId },
			},
		});
	},
};
