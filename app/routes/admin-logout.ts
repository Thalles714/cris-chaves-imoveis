import { redirect } from "react-router";

import { createRequestScopedAdminAuth } from "~/modules/auth/index.server";

import type { Route } from "./+types/admin-logout";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
} from "./admin-route-helpers.server";

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	await enforceAdminRateLimit(context, request, "auth", "logout");
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		await scoped.auth.signOut();
		return redirect("/admin/entrar", {
			headers: adminResponseHeaders(scoped.responseHeaders),
		});
	} catch {
		return redirect("/admin/entrar", { headers: adminResponseHeaders() });
	}
}
