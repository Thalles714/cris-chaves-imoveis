import { useEffect } from "react";
import { data, redirect, useSubmit } from "react-router";
import { z } from "zod";

import { createRequestScopedAdminAuth } from "~/modules/auth/index.server";
import "~/styles/admin-auth.css";

import type { Route } from "./+types/admin-invite-accept";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
	readAdminFormData,
} from "./admin-route-helpers.server";

const inviteTokenSchema = z
	.string()
	.trim()
	.min(20)
	.max(4096)
	.regex(/^[A-Za-z0-9._~-]+$/u);

const inviteSessionSchema = z
	.object({
		// Supabase tokens are opaque. Local GoTrue currently issues 12-character
		// refresh tokens, while hosted projects may use a different representation.
		// Authenticity belongs to setSession; this boundary only rejects empty or
		// unreasonably large values before they reach the SDK.
		accessToken: z.string().trim().min(1).max(8192),
		refreshToken: z.string().trim().min(1).max(8192),
		type: z.literal("invite"),
	})
	.strict();

export function meta() {
	return [{ title: "Aceitar convite | Administração Cris Chaves" }];
}

export function headers() {
	return adminResponseHeaders();
}

async function activateInviteSession(
	request: Request,
	context: Route.LoaderArgs["context"],
	accessToken: string,
	refreshToken: string,
) {
	await enforceAdminRateLimit(context, request, "auth", "invite-acceptance");
	const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
	const session = await scoped.client.auth.setSession({
		access_token: accessToken,
		refresh_token: refreshToken,
	});
	if (session.error || !session.data.session) {
		throw new Error("Invite session verification failed");
	}
	const activation = await scoped.client.rpc("activate_own_admin_membership");
	if (activation.error || activation.data !== true) {
		throw new Error("Invite membership activation failed");
	}
	return redirect("/admin/redefinir-senha", {
		headers: adminResponseHeaders(scoped.responseHeaders),
	});
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const rawToken = url.searchParams.get("token_hash");
	const rawType = url.searchParams.get("type");

	// Custom SSR email template: the token hash is available to the server.
	if (rawToken !== null || rawType !== null) {
		const token = inviteTokenSchema.safeParse(rawToken);
		if (!token.success || rawType !== "invite") {
			return redirect("/admin/entrar?convite=invalido", {
				headers: adminResponseHeaders(),
			});
		}

		await enforceAdminRateLimit(context, request, "auth", "invite-acceptance");
		try {
			const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
			const verification = await scoped.client.auth.verifyOtp({
				token_hash: token.data,
				type: "invite",
			});
			if (verification.error || !verification.data.session) {
				throw new Error("Invite verification failed");
			}
			const activation = await scoped.client.rpc("activate_own_admin_membership");
			if (activation.error || activation.data !== true) {
				throw new Error("Invite membership activation failed");
			}
			return redirect("/admin/redefinir-senha", {
				headers: adminResponseHeaders(scoped.responseHeaders),
			});
		} catch {
			return redirect("/admin/entrar?convite=invalido", {
				headers: adminResponseHeaders(),
			});
		}
	}

	// The hosted default template returns the session in the URL fragment. The
	// fragment never reaches the server, so a tiny browser bridge submits it once
	// to this same-origin action, where it becomes an HttpOnly SSR cookie.
	return data({ acceptsBrowserSession: true }, { headers: adminResponseHeaders() });
}

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const form = await readAdminFormData(request);
	const parsed = inviteSessionSchema.safeParse({
		accessToken: form.get("access_token"),
		refreshToken: form.get("refresh_token"),
		type: form.get("type"),
	});
	if (!parsed.success) {
		return redirect("/admin/entrar?convite=invalido", {
			headers: adminResponseHeaders(),
		});
	}

	try {
		return await activateInviteSession(
			request,
			context,
			parsed.data.accessToken,
			parsed.data.refreshToken,
		);
	} catch {
		return redirect("/admin/entrar?convite=invalido", {
			headers: adminResponseHeaders(),
		});
	}
}

export default function AdminInviteAccept() {
	const submit = useSubmit();

	useEffect(() => {
		const fragment = new URLSearchParams(window.location.hash.slice(1));
		const accessToken = fragment.get("access_token");
		const refreshToken = fragment.get("refresh_token");
		const type = fragment.get("type");

		window.history.replaceState(
			null,
			"",
			`${window.location.pathname}${window.location.search}`,
		);
		if (!accessToken || !refreshToken || type !== "invite") {
			window.location.replace("/admin/entrar?convite=invalido");
			return;
		}

		const form = new FormData();
		form.set("access_token", accessToken);
		form.set("refresh_token", refreshToken);
		form.set("type", type);
		void submit(form, { action: "/admin/convite", method: "post" });
	}, [submit]);

	return (
		<main className="admin-auth-page">
			<section className="admin-auth-card" aria-labelledby="admin-invite-title">
				<p className="admin-auth-card__eyebrow">Primeiro acesso</p>
				<h1 id="admin-invite-title">Validando seu convite…</h1>
				<p className="admin-auth-card__intro">
					Aguarde um instante. Em seguida, você criará sua senha.
				</p>
			</section>
		</main>
	);
}
