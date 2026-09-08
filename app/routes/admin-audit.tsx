/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data, Link, useLoaderData, type LoaderFunctionArgs } from "react-router";

import { AdminEmpty, AdminPageHeader } from "~/components/admin";
import {
	parseAdminAuditQuery,
	SupabaseAdminAuditRepository,
	type AdminAuditEvent,
} from "~/modules/audit/index.server";

import { adminResponseHeaders, requireAdminRoute } from "./admin-route-helpers.server";

const actionLabels: Readonly<Record<string, string>> = {
	"properties.insert": "Imóvel criado",
	"properties.update": "Imóvel alterado",
	"properties.delete": "Imóvel excluído",
	"property_private_details.insert": "Dados privados adicionados",
	"property_private_details.update": "Dados privados alterados",
	"property_private_details.delete": "Dados privados excluídos",
	"property_media.insert": "Mídia adicionada",
	"property_media.update": "Mídia alterada",
	"property_media.delete": "Mídia excluída",
	"admin_members.insert": "Membro adicionado",
	"admin_members.update": "Membro alterado",
	"admin_members.delete": "Membro excluído",
};

const resourceLabels: Readonly<Record<string, string>> = {
	properties: "Imóvel",
	property_private_details: "Dados privados",
	property_media: "Mídia",
	admin_members: "Membro",
};

const detailLabels: Readonly<Record<string, string>> = {
	operation: "Operação",
	old_version: "Versão anterior",
	new_version: "Nova versão",
	old_publication_status: "Publicação anterior",
	new_publication_status: "Nova publicação",
	old_deal_status: "Negociação anterior",
	new_deal_status: "Nova negociação",
	old_role: "Papel anterior",
	new_role: "Novo papel",
	old_status: "Status anterior",
	new_status: "Novo status",
	old_media_kind: "Mídia anterior",
	new_media_kind: "Nova mídia",
	old_deleted: "Exclusão anterior",
	new_deleted: "Nova exclusão",
};

export function meta() {
	return [{ title: "Auditoria | Administração Cris Chaves" }];
}

export async function loader({ request, context }: LoaderFunctionArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"audit.read",
	);
	let query;
	try {
		query = parseAdminAuditQuery(new URL(request.url));
	} catch {
		throw new Response("Página inválida.", {
			status: 400,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
	const page = await new SupabaseAdminAuditRepository(client).list(query);
	return data({ page }, { headers: adminResponseHeaders(responseHeaders) });
}

function detailSummary(event: AdminAuditEvent): string {
	const entries = Object.entries(event.details);
	if (entries.length === 0) return "Sem detalhes adicionais";
	return entries
		.map(([key, value]) => `${detailLabels[key] ?? key}: ${String(value)}`)
		.join(" · ");
}

function pageHref(page: number) {
	return `/admin/auditoria?page=${page}`;
}

export default function AdminAudit() {
	const { page } = useLoaderData<typeof loader>();
	const totalPages = Math.max(1, Math.ceil(page.totalItems / page.pageSize));

	return (
		<>
			<AdminPageHeader
				eyebrow="Segurança e governança"
				title="Auditoria"
				description="Histórico somente leitura das alterações administrativas. Identificadores são exibidos de forma reduzida."
			/>

			{page.items.length === 0 ? (
				<AdminEmpty
					title="Nenhum evento de auditoria"
					description="As alterações administrativas aparecerão aqui quando forem registradas."
				/>
			) : (
				<section className="admin-property-list" aria-labelledby="audit-events-title">
					<h2 id="audit-events-title" className="admin-visually-hidden">
						Eventos de auditoria
					</h2>
					<div className="admin-data-table-wrap">
						<table className="admin-data-table">
							<caption className="admin-visually-hidden">
								Histórico administrativo em ordem decrescente de data
							</caption>
							<thead>
								<tr>
									<th scope="col">Data</th>
									<th scope="col">Evento</th>
									<th scope="col">Recurso</th>
									<th scope="col">Responsável</th>
									<th scope="col">Resumo</th>
								</tr>
							</thead>
							<tbody>
								{page.items.map((event) => (
									<tr key={event.id}>
										<td data-label="Data">
											<time dateTime={event.occurredAt}>
												{new Intl.DateTimeFormat("pt-BR", {
													dateStyle: "short",
													timeStyle: "short",
												}).format(new Date(event.occurredAt))}
											</time>
										</td>
										<td data-label="Evento">
											<strong>{actionLabels[event.action] ?? event.action}</strong>
										</td>
										<td className="admin-data-table__mono" data-label="Recurso">
											{resourceLabels[event.resourceType] ?? event.resourceType}
											{event.resourceReference ? ` ${event.resourceReference}` : ""}
										</td>
										<td className="admin-data-table__mono" data-label="Responsável">
											{event.actorRole === "owner"
												? "Proprietário"
												: event.actorRole === "editor"
													? "Editor"
													: "Sistema"}
											{event.actorReference ? ` ${event.actorReference}` : ""}
										</td>
										<td data-label="Resumo">{detailSummary(event)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<nav className="cc-pagination" aria-label="Paginação da auditoria">
							{page.page > 1 ? (
								<Link className="cc-pagination__button" to={pageHref(page.page - 1)}>
									Anterior
								</Link>
							) : (
								<span className="cc-pagination__button" aria-disabled="true">
									Anterior
								</span>
							)}
							<span aria-live="polite">
								Página {page.page} de {totalPages}
							</span>
							{page.page < totalPages ? (
								<Link className="cc-pagination__button" to={pageHref(page.page + 1)}>
									Próxima
								</Link>
							) : (
								<span className="cc-pagination__button" aria-disabled="true">
									Próxima
								</span>
							)}
						</nav>
					)}
				</section>
			)}
		</>
	);
}
