import {
	data,
	Form,
	redirect,
	useActionData,
	useLoaderData,
	useNavigation,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "react-router";
import { useState } from "react";

import { AdminEmpty, AdminMutationFeedback, AdminPageHeader } from "~/components/admin";
import { Modal } from "~/components/ui";
import { hasRecentSecondFactor } from "~/modules/auth/index.server";
import { redactAdminMemberReference, type AdminMemberDto } from "~/modules/members";
import {
	adminMemberActionIntentSchema,
	AdminMemberOperationError,
	AdminMemberService,
	createPrivilegedAuthDirectory,
	SupabaseAdminMemberRepository,
} from "~/modules/members/index.server";

import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	readAdminFormData,
	requireAdminRoute,
} from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Equipe | Administração Cris Chaves" }];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"member.invite",
	);
	const service = new AdminMemberService(
		new SupabaseAdminMemberRepository(client),
		createPrivilegedAuthDirectory(adminBindings(context)),
	);
	const members = await service.list();
	return data({ members }, { headers: adminResponseHeaders(responseHeaders) });
}

export async function action({ request, context }: ActionFunctionArgs) {
	await assertAdminFormRequest(request);
	const form = await readAdminFormData(request);
	const intent = adminMemberActionIntentSchema.safeParse(form.get("intent"));
	if (!intent.success) {
		return data(
			{ error: "Ação inválida." },
			{ status: 400, headers: adminResponseHeaders() },
		);
	}
	const operation = ["invite", "resend-invite", "cancel-invite"].includes(intent.data)
		? "member.invite"
		: intent.data === "change-role"
			? "member.changeRole"
			: "member.disable";
	const { client, session, responseHeaders } = await requireAdminRoute(
		request,
		context,
		operation,
	);
	if (!hasRecentSecondFactor(session)) {
		return data(
			{
				error:
					"Confirme novamente a autenticação em duas etapas para alterar a equipe. A confirmação vale por cinco minutos.",
				requiresMfa: true,
			},
			{ status: 403, headers: adminResponseHeaders(responseHeaders) },
		);
	}
	const service = new AdminMemberService(
		new SupabaseAdminMemberRepository(client),
		createPrivilegedAuthDirectory(adminBindings(context)),
	);

	try {
		if (intent.data === "invite") {
			await service.invite({ email: form.get("email"), role: form.get("role") });
		} else if (intent.data === "resend-invite") {
			await service.resendInvitation({
				userId: form.get("userId"),
				expectedVersion: form.get("expectedVersion"),
				confirmation: form.get("confirmation"),
			});
		} else if (intent.data === "cancel-invite") {
			await service.cancelInvitation({
				userId: form.get("userId"),
				expectedVersion: form.get("expectedVersion"),
				confirmation: form.get("confirmation"),
			});
		} else if (intent.data === "change-role") {
			await service.changeRole(session.userId, {
				userId: form.get("userId"),
				role: form.get("role"),
				expectedVersion: form.get("expectedVersion"),
			});
		} else {
			await service.disable(session.userId, {
				userId: form.get("userId"),
				expectedVersion: form.get("expectedVersion"),
				confirmation: form.get("confirmation"),
			});
		}
		return redirect("/admin/membros?salvo=1", {
			headers: adminResponseHeaders(responseHeaders),
		});
	} catch (error) {
		return data(
			{
				error:
					error instanceof AdminMemberOperationError &&
					error.code === "SELF_CHANGE_FORBIDDEN"
						? "Sua própria função ou situação não pode ser alterada aqui."
						: error instanceof AdminMemberOperationError &&
							  error.code === "EMAIL_RATE_LIMITED"
							? "O limite de e-mails do Supabase foi atingido. Aguarde cerca de 30 minutos antes de tentar novamente."
							: error instanceof AdminMemberOperationError &&
								  error.code === "INVITATION_RECOVERY_REQUIRED"
								? "O convite não pôde ser recomposto automaticamente. O acesso continua bloqueado; revise a auditoria antes de tentar novamente."
								: "Não foi possível concluir a alteração da equipe.",
				requiresMfa: false,
			},
			{ status: 409, headers: adminResponseHeaders(responseHeaders) },
		);
	}
}

function memberStatus(status: "invited" | "active" | "disabled") {
	return status === "active"
		? "Ativo"
		: status === "invited"
			? "Convite enviado"
			: "Desativado";
}

function MemberDisableButton({
	userId,
	version,
	busy,
}: {
	userId: string;
	version: number;
	busy: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				className="cc-button cc-button--danger"
				type="button"
				disabled={busy}
				onClick={() => setOpen(true)}
			>
				Desativar
			</button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				title="Desativar este acesso?"
				description="A pessoa sairá da área administrativa e não poderá entrar novamente até que o acesso seja reativado."
				footer={
					<>
						<button
							className="cc-button cc-button--secondary"
							type="button"
							onClick={() => setOpen(false)}
						>
							Cancelar
						</button>
						<Form method="post">
							<input type="hidden" name="intent" value="disable" />
							<input type="hidden" name="userId" value={userId} />
							<input type="hidden" name="expectedVersion" value={version} />
							<input type="hidden" name="confirmation" value="confirmed" />
							<button
								className="cc-button cc-button--danger"
								type="submit"
								disabled={busy}
							>
								{busy ? "Desativando…" : "Sim, desativar"}
							</button>
						</Form>
					</>
				}
			>
				<p>Os registros de auditoria serão preservados.</p>
			</Modal>
		</>
	);
}

function PendingInvitationActions({
	userId,
	version,
	busy,
}: {
	userId: string;
	version: number;
	busy: boolean;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Form method="post">
				<input type="hidden" name="intent" value="resend-invite" />
				<input type="hidden" name="userId" value={userId} />
				<input type="hidden" name="expectedVersion" value={version} />
				<input type="hidden" name="confirmation" value="confirmed" />
				<button className="cc-button cc-button--secondary" type="submit" disabled={busy}>
					{busy ? "Enviando…" : "Reenviar"}
				</button>
			</Form>
			<button
				className="cc-button cc-button--danger"
				type="button"
				disabled={busy}
				onClick={() => setOpen(true)}
			>
				Cancelar convite
			</button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				title="Cancelar este convite?"
				description="O link enviado deixará de funcionar. Depois, um novo convite poderá ser criado normalmente."
				footer={
					<>
						<button
							className="cc-button cc-button--secondary"
							type="button"
							onClick={() => setOpen(false)}
						>
							Voltar
						</button>
						<Form method="post">
							<input type="hidden" name="intent" value="cancel-invite" />
							<input type="hidden" name="userId" value={userId} />
							<input type="hidden" name="expectedVersion" value={version} />
							<input type="hidden" name="confirmation" value="confirmed" />
							<button
								className="cc-button cc-button--danger"
								type="submit"
								disabled={busy}
							>
								{busy ? "Cancelando…" : "Sim, cancelar"}
							</button>
						</Form>
					</>
				}
			>
				<p>O membro pendente será removido do acesso administrativo.</p>
			</Modal>
		</>
	);
}

function MemberRoleChangeButton({
	member,
	busy,
}: {
	member: AdminMemberDto;
	busy: boolean;
}) {
	const [open, setOpen] = useState(false);
	const currentRole = member.role === "owner" ? "Proprietário" : "Editor";
	const newRole = member.role === "owner" ? "Editor" : "Proprietário";
	const newRoleValue = member.role === "owner" ? "editor" : "owner";
	const accessExplanation =
		newRoleValue === "owner"
			? "A pessoa poderá gerenciar membros e consultar a auditoria, além de operar imóveis."
			: "A pessoa continuará operando imóveis, mas não poderá gerenciar membros nem consultar a auditoria.";

	return (
		<>
			<button
				className="cc-button cc-button--secondary"
				type="button"
				disabled={busy}
				onClick={() => setOpen(true)}
			>
				Tornar {newRole.toLowerCase()}
			</button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				title="Confirmar mudança de função?"
				description={`Membro ${redactAdminMemberReference(member.userId)}`}
				footer={
					<>
						<button
							className="cc-button cc-button--secondary"
							type="button"
							disabled={busy}
							onClick={() => setOpen(false)}
						>
							Cancelar
						</button>
						<Form method="post">
							<input type="hidden" name="intent" value="change-role" />
							<input type="hidden" name="userId" value={member.userId} />
							<input type="hidden" name="expectedVersion" value={member.version} />
							<input type="hidden" name="role" value={newRoleValue} />
							<button
								className="cc-button cc-button--primary"
								type="submit"
								disabled={busy}
							>
								{busy ? "Confirmando…" : "Confirmar alteração"}
							</button>
						</Form>
					</>
				}
			>
				<p>
					Função atual: <strong>{currentRole}</strong>
				</p>
				<p>
					Nova função: <strong>{newRole}</strong>
				</p>
				<p>{accessExplanation}</p>
			</Modal>
		</>
	);
}

export default function AdminMembers() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const busy = navigation.state !== "idle";
	return (
		<>
			<AdminPageHeader
				eyebrow="Acesso administrativo"
				title="Equipe"
				description="Convide contas individuais. Toda pessoa deverá configurar senha e autenticação em duas etapas."
			/>
			{actionData?.error && (
				<AdminMutationFeedback tone="error" title="Alteração não concluída">
					<p>{actionData.error}</p>
					{"requiresMfa" in actionData && actionData.requiresMfa === true && (
						<a className="cc-button cc-button--primary" href="/admin/mfa?renovar=1">
							Confirmar MFA novamente
						</a>
					)}
				</AdminMutationFeedback>
			)}
			<section className="admin-form-section" aria-labelledby="invite-title">
				<header className="admin-form-section__header">
					<span aria-hidden="true">01</span>
					<div>
						<h2 id="invite-title">Enviar convite</h2>
						<p>O cadastro público permanece fechado.</p>
					</div>
				</header>
				<Form method="post" className="admin-inline-form" aria-busy={busy}>
					<input type="hidden" name="intent" value="invite" />
					<label className="cc-field">
						<span className="cc-field__label">E-mail</span>
						<input
							className="cc-field__control"
							type="email"
							name="email"
							maxLength={254}
							disabled={busy}
							required
						/>
					</label>
					<label className="cc-field">
						<span className="cc-field__label">Função</span>
						<select
							className="cc-field__control"
							name="role"
							defaultValue="editor"
							disabled={busy}
						>
							<option value="editor">Editor</option>
							<option value="owner">Proprietário</option>
						</select>
					</label>
					<button className="cc-button cc-button--primary" type="submit" disabled={busy}>
						{busy ? "Enviando…" : "Enviar convite"}
					</button>
				</Form>
			</section>

			{loaderData.members.length === 0 ? (
				<AdminEmpty
					title="Nenhum membro"
					description="A equipe administrativa está vazia."
				/>
			) : (
				<div className="admin-data-table-wrap admin-members-table">
					<table className="admin-data-table">
						<thead>
							<tr>
								<th>E-mail</th>
								<th>Situação</th>
								<th>Função</th>
								<th>Ações</th>
							</tr>
						</thead>
						<tbody>
							{loaderData.members.map((member) => (
								<tr key={member.userId}>
									<td data-label="E-mail">
										{member.email ?? redactAdminMemberReference(member.userId)}
									</td>
									<td data-label="Situação">{memberStatus(member.status)}</td>
									<td data-label="Função">
										{member.role === "owner" ? "Proprietário" : "Editor"}
									</td>
									<td data-label="Ações" className="admin-member-actions">
										{member.status === "invited" && (
											<div className="admin-member-actions__controls">
												<PendingInvitationActions
													userId={member.userId}
													version={member.version}
													busy={busy}
												/>
											</div>
										)}
										{member.status === "active" && (
											<div className="admin-member-actions__controls">
												<MemberRoleChangeButton member={member} busy={busy} />
												<MemberDisableButton
													userId={member.userId}
													version={member.version}
													busy={busy}
												/>
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}
