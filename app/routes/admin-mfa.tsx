/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data, Form, redirect, useNavigation } from "react-router";

import {
	AdminAccessError,
	createRequestScopedAdminAuth,
	isAdminAuthFlowError,
} from "~/modules/auth/index.server";
import "~/styles/admin-auth.css";

import type { Route } from "./+types/admin-mfa";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	enforceAdminRateLimit,
	readAdminFormData,
} from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Verificação em duas etapas | Administração Cris Chaves" }];
}

export function headers() {
	return adminResponseHeaders();
}

export async function loader({ request, context }: Route.LoaderArgs) {
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		const state = await scoped.auth.getMfaState();
		if (state === "ready") {
			return redirect("/admin", {
				headers: adminResponseHeaders(scoped.responseHeaders),
			});
		}
		return data({ state }, { headers: adminResponseHeaders(scoped.responseHeaders) });
	} catch (error) {
		if (error instanceof AdminAccessError && error.code === "AUTHENTICATION_REQUIRED") {
			return redirect("/admin/entrar", { headers: adminResponseHeaders() });
		}
		throw new Response("Acesso não autorizado.", {
			status: error instanceof AdminAccessError ? error.status : 503,
			headers: adminResponseHeaders(),
		});
	}
}

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const form = await readAdminFormData(request);
	await enforceAdminRateLimit(context, request, "auth", "mfa");
	const intent = form.get("intent");
	try {
		const scoped = createRequestScopedAdminAuth(request, adminBindings(context));
		if (intent === "enroll") {
			const enrollment = await scoped.auth.startTotpEnrollment();
			return data(
				{ state: "enrollment_required" as const, enrollment },
				{ headers: adminResponseHeaders(scoped.responseHeaders) },
			);
		}
		if (intent === "verify-enrollment") {
			await scoped.auth.verifyTotpEnrollment({
				factorId: form.get("factorId"),
				code: form.get("code"),
			});
		} else if (intent === "verify-challenge") {
			await scoped.auth.verifyTotpChallenge({ code: form.get("code") });
		} else {
			throw new Response("Requisição inválida.", {
				status: 400,
				headers: adminResponseHeaders(),
			});
		}
		return redirect("/admin", { headers: adminResponseHeaders(scoped.responseHeaders) });
	} catch (error) {
		if (error instanceof Response) throw error;
		return data(
			{
				state:
					intent === "enroll"
						? ("enrollment_required" as const)
						: ("challenge_required" as const),
				error: isAdminAuthFlowError(error)
					? error.message
					: "Não foi possível confirmar o código.",
			},
			{
				status: isAdminAuthFlowError(error) ? error.status : 503,
				headers: adminResponseHeaders(),
			},
		);
	}
}

export default function AdminMfa({ loaderData, actionData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const isSubmitting = navigation.state !== "idle";
	const state = actionData?.state ?? loaderData.state;
	const enrollment =
		actionData && "enrollment" in actionData ? actionData.enrollment : null;
	const qrCode =
		enrollment?.qrCode.startsWith("data:image/") === true ? enrollment.qrCode : null;

	return (
		<main className="admin-auth-page">
			<section className="admin-auth-card" aria-labelledby="admin-mfa-title">
				<p className="admin-auth-card__eyebrow">Verificação em duas etapas</p>
				<h1 id="admin-mfa-title">
					{state === "enrollment_required" ? "Proteja sua conta." : "Confirme o código."}
				</h1>
				<p className="admin-auth-card__intro">
					{state === "enrollment_required"
						? "Configure um aplicativo autenticador antes de acessar os anúncios."
						: "Digite o código de seis números exibido no seu aplicativo autenticador."}
				</p>
				{actionData && "error" in actionData && actionData.error && (
					<div className="admin-auth-message" role="alert">
						{actionData.error}
					</div>
				)}
				{state === "enrollment_required" && !enrollment ? (
					<Form method="post" className="admin-auth-form" aria-busy={isSubmitting}>
						<input type="hidden" name="intent" value="enroll" />
						<button
							className="cc-button cc-button--primary"
							type="submit"
							disabled={isSubmitting}
						>
							{isSubmitting ? "Configurando…" : "Configurar autenticador"}
						</button>
					</Form>
				) : (
					<>
						{qrCode && (
							<div className="admin-auth-qr">
								<img src={qrCode} alt="QR code para configurar o autenticador" />
							</div>
						)}
						{enrollment && (
							<p className="admin-auth-secret">
								Código manual: <strong>{enrollment.secret}</strong>
							</p>
						)}
						<Form method="post" className="admin-auth-form" aria-busy={isSubmitting}>
							<input
								type="hidden"
								name="intent"
								value={enrollment ? "verify-enrollment" : "verify-challenge"}
							/>
							{enrollment && (
								<input type="hidden" name="factorId" value={enrollment.factorId} />
							)}
							<label className="admin-auth-field">
								<span>Código de seis números</span>
								<input
									type="text"
									name="code"
									inputMode="numeric"
									autoComplete="one-time-code"
									pattern="[0-9]{6}"
									maxLength={6}
									disabled={isSubmitting}
									required
								/>
							</label>
							<button
								className="cc-button cc-button--primary"
								type="submit"
								disabled={isSubmitting}
							>
								{isSubmitting ? "Confirmando…" : "Confirmar código"}
							</button>
						</Form>
					</>
				)}
			</section>
		</main>
	);
}
