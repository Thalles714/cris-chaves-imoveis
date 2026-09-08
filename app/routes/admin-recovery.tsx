import { data, Form, useNavigation } from "react-router";

import { createRequestScopedAdminAuth } from "~/modules/auth/index.server";
import "~/styles/admin-auth.css";

import type { Route } from "./+types/admin-recovery";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
	readAdminFormData,
} from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Recuperar acesso | Administração Cris Chaves" }];
}

export function headers() {
	return adminResponseHeaders();
}

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const form = await readAdminFormData(request);
	const email = form.get("email");
	await enforceAdminRateLimit(
		context,
		request,
		"auth",
		typeof email === "string" ? email.trim().toLowerCase() : "invalid-email",
	);
	let responseHeaders: Headers | undefined;
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		responseHeaders = scoped.responseHeaders;
		await scoped.auth.requestPasswordRecovery({ email });
	} catch {
		// A resposta permanece idêntica para não revelar contas nem configuração.
	}
	return data(
		{ accepted: true },
		{ status: 202, headers: adminResponseHeaders(responseHeaders) },
	);
}

export default function AdminRecovery({ actionData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const busy = navigation.state !== "idle";

	return (
		<main className="admin-auth-page">
			<section className="admin-auth-card" aria-labelledby="admin-recovery-title">
				<p className="admin-auth-card__eyebrow">Recuperação de acesso</p>
				<h1 id="admin-recovery-title">Redefinir a senha.</h1>
				<p className="admin-auth-card__intro">
					Informe o e-mail convidado. Se a conta estiver ativa, enviaremos as próximas
					instruções.
				</p>
				{actionData?.accepted && (
					<div className="admin-auth-message" data-tone="success" role="status">
						Se a conta estiver ativa, as instruções serão enviadas.
					</div>
				)}
				<Form method="post" className="admin-auth-form" aria-busy={busy || undefined}>
					<label className="admin-auth-field">
						<span>E-mail</span>
						<input
							type="email"
							name="email"
							autoComplete="email"
							required
							disabled={busy}
						/>
					</label>
					<button className="cc-button cc-button--primary" type="submit" disabled={busy}>
						{busy ? "Enviando instruções…" : "Enviar instruções"}
					</button>
				</Form>
				<div className="admin-auth-card__links">
					<a href="/admin/entrar">Voltar para entrar</a>
				</div>
			</section>
		</main>
	);
}
