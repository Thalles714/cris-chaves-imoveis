import { data, Form, redirect } from "react-router";

import {
	createRequestScopedAdminAuth,
	isAdminAuthFlowError,
} from "~/modules/auth/index.server";
import { BrandLockup } from "~/components/brand-lockup";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import "~/styles/admin-auth.css";

import type { Route } from "./+types/admin-login";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
	readAdminFormData,
} from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Entrar | Administração Cris Chaves" }];
}

export function headers() {
	return adminResponseHeaders();
}

export function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	return {
		passwordChanged: url.searchParams.get("senha") === "alterada",
		creci: loadPublicSiteContext(request, context).creci,
	};
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
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		const result = await scoped.auth.signInPassword({
			email,
			password: form.get("password"),
		});
		return redirect(result.next === "admin" ? "/admin" : "/admin/mfa", {
			headers: adminResponseHeaders(scoped.responseHeaders),
		});
	} catch (error) {
		const message = isAdminAuthFlowError(error)
			? error.message
			: "Não foi possível concluir a autenticação.";
		const status = isAdminAuthFlowError(error) ? error.status : 503;
		return data({ error: message }, { status, headers: adminResponseHeaders() });
	}
}

export default function AdminLogin({ actionData, loaderData }: Route.ComponentProps) {
	return (
		<main className="admin-auth-page">
			<section className="admin-auth-card" aria-labelledby="admin-login-title">
				<BrandLockup
					className="admin-auth-card__brand"
					creci={loaderData.creci}
					variant="compact"
					accessibleName="Cris Chaves Corretor de Imóveis — início"
				/>
				<p className="admin-auth-card__eyebrow">Área administrativa</p>
				<h1 id="admin-login-title">Entrar com segurança.</h1>
				<p className="admin-auth-card__intro">
					Use a conta que recebeu o convite. Depois da senha, confirme o código do
					autenticador.
				</p>
				{loaderData.passwordChanged && (
					<div className="admin-auth-message" data-tone="success" role="status">
						Senha criada com sucesso. Entre com seu e-mail e a nova senha.
					</div>
				)}
				{actionData?.error && (
					<div className="admin-auth-message" role="alert">
						{actionData.error}
					</div>
				)}
				<Form method="post" className="admin-auth-form">
					<label className="admin-auth-field">
						<span>E-mail</span>
						<input
							type="email"
							name="email"
							autoComplete="username"
							maxLength={254}
							required
						/>
					</label>
					<label className="admin-auth-field">
						<span>Senha</span>
						<input
							type="password"
							name="password"
							autoComplete="current-password"
							maxLength={1024}
							required
						/>
					</label>
					<button className="cc-button cc-button--primary" type="submit">
						Entrar
					</button>
				</Form>
				<div className="admin-auth-card__links">
					<a href="/admin/recuperar-senha">Esqueci minha senha</a>
					<a href="/">Voltar ao site</a>
				</div>
			</section>
		</main>
	);
}
