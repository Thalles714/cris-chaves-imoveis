import { redirect } from "react-router";

import { createRequestScopedAdminAuth } from "~/modules/auth/index.server";

import type { Route } from "./+types/admin-auth-callback";
import { adminBindings, adminResponseHeaders } from "./admin-route-helpers.server";

const recoveryDestination = "/admin/redefinir-senha";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	if (url.searchParams.get("next") !== recoveryDestination) {
		return redirect("/admin/entrar?recuperacao=invalida", {
			headers: adminResponseHeaders(),
		});
	}

	let responseHeaders: Headers | undefined;
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		responseHeaders = scoped.responseHeaders;
		await scoped.auth.exchangeRecoveryCode({ code: url.searchParams.get("code") });
		return redirect(recoveryDestination, {
			headers: adminResponseHeaders(responseHeaders),
		});
	} catch {
		return redirect("/admin/entrar?recuperacao=invalida", {
			headers: adminResponseHeaders(responseHeaders),
		});
	}
}
