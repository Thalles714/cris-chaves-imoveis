import { useRef } from "react";
import { data, Form, redirect } from "react-router";

import {
	createRequestScopedAdminAuth,
	isAdminAuthFlowError,
} from "~/modules/auth/index.server";
import "~/styles/admin-auth.css";

import type { Route } from "./+types/admin-password-reset";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
	readAdminFormData,
} from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Nova senha | Administração Cris Chaves" }];
}

export function headers() {
	return adminResponseHeaders();
}

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const form = await readAdminFormData(request);
	await enforceAdminRateLimit(context, request, "auth", "password-reset");
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		await scoped.auth.updatePassword({
			password: form.get("password"),
			passwordConfirmation: form.get("passwordConfirmation"),
		});
		return redirect("/admin/entrar?senha=alterada", {
			headers: adminResponseHeaders(scoped.responseHeaders),
		});
	} catch (error) {
		return data(
			{
				error: isAdminAuthFlowError(error)
					? error.message
					: "Não foi possível atualizar a senha.",
			},
			{
				status: isAdminAuthFlowError(error) ? error.status : 503,
				headers: adminResponseHeaders(),
			},
		);
	}
}

export default function AdminPasswordReset({ actionData }: Route.ComponentProps) {
	const passwordRef = useRef<HTMLInputElement>(null);
	const passwordConfirmationRef = useRef<HTMLInputElement>(null);
	const validatePasswordConfirmation = () => {
		const password = passwordRef.current?.value ?? "";
		const confirmation = passwordConfirmationRef.current;
		if (!confirmation) return;
		confirmation.setCustomValidity(
			confirmation.value && confirmation.value !== password
				? "As senhas precisam ser exatamente iguais."
				: "",
		);
	};

	return (
		<main className="admin-auth-page">
			<section className="admin-auth-card" aria-labelledby="admin-reset-title">
				<p className="admin-auth-card__eyebrow">Recuperação de acesso</p>
				<h1 id="admin-reset-title">Crie uma nova senha.</h1>
				<p className="admin-auth-card__intro">
					Use pelo menos 12 caracteres. Ao concluir, todas as sessões serão encerradas.
				</p>
				{actionData?.error && (
					<div className="admin-auth-message" role="alert">
						{actionData.error}
					</div>
				)}
				<Form method="post" className="admin-auth-form">
					<label className="admin-auth-field">
						<span>Nova senha</span>
						<input
							ref={passwordRef}
							type="password"
							name="password"
							autoComplete="new-password"
							minLength={12}
							maxLength={128}
							onInput={validatePasswordConfirmation}
							required
						/>
					</label>
					<label className="admin-auth-field">
						<span>Confirmar nova senha</span>
						<input
							ref={passwordConfirmationRef}
							type="password"
							name="passwordConfirmation"
							autoComplete="new-password"
							minLength={12}
							maxLength={128}
							onInput={validatePasswordConfirmation}
							required
						/>
					</label>
					<button className="cc-button cc-button--primary" type="submit">
						Salvar nova senha
					</button>
				</Form>
			</section>
		</main>
	);
}
