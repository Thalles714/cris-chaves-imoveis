import { data } from "react-router";

import { AdminDashboardSummary, AdminPageHeader } from "~/components/admin";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/supabase-admin-property-repository.server";

import type { Route } from "./+types/admin-dashboard";
import { adminResponseHeaders, requireAdminRoute } from "./admin-route-helpers.server";

export function meta() {
	return [{ title: "Visão geral | Administração Cris Chaves" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	const summary = await new SupabaseAdminPropertyRepository(client).summary();
	return data(summary, { headers: adminResponseHeaders(responseHeaders) });
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
	const hasProperties = loaderData.total > 0;
	const metrics = hasProperties
		? [
				{
					id: "drafts",
					label: "Rascunhos para concluir",
					value: loaderData.drafts,
					description: "Ainda precisam de informações, mídia ou revisão",
					tone: "warning" as const,
				},
				{
					id: "awaiting-review",
					label: "Aguardando revisão",
					value: loaderData.awaitingReview,
					description: "Com descrição e capa aprovada para conferência final",
					tone: "info" as const,
				},
			]
		: [];

	return (
		<>
			<AdminPageHeader
				eyebrow="Operação imobiliária"
				title="Visão geral"
				description="Acompanhe os anúncios e continue de onde parou."
				actions={
					<a className="cc-button cc-button--primary" href="/admin/imoveis/novo">
						Cadastrar imóvel
					</a>
				}
			/>
			<AdminDashboardSummary
				title="Pendências operacionais"
				metrics={metrics}
				emptyTitle="Nenhum imóvel cadastrado"
				emptyDescription="Crie o primeiro rascunho. Ele só aparecerá no site depois de uma publicação confirmada."
				emptyAction={
					<a className="cc-button cc-button--primary" href="/admin/imoveis/novo">
						Cadastrar primeiro imóvel
					</a>
				}
			/>
			{hasProperties && (
				<div className="admin-dashboard-worklists">
					<section className="admin-dashboard-list" aria-labelledby="draft-work-title">
						<div className="admin-dashboard-list__header">
							<div>
								<p className="admin-publication-checklist__eyebrow">Próxima ação</p>
								<h2 id="draft-work-title">Continuar um cadastro</h2>
							</div>
							<a className="text-link" href="/admin/imoveis?status=draft">
								Ver rascunhos
							</a>
						</div>
						{loaderData.draftsToContinue.length > 0 ? (
							<ul>
								{loaderData.draftsToContinue.map((property) => (
									<li key={property.id}>
										<a href={`/admin/imoveis/${property.id}`}>
											<strong>{property.publicCode}</strong>
											<span>{property.title}</span>
										</a>
									</li>
								))}
							</ul>
						) : (
							<p className="admin-dashboard-list__empty">Nenhum rascunho pendente.</p>
						)}
					</section>

					<section className="admin-dashboard-list" aria-labelledby="recent-work-title">
						<div className="admin-dashboard-list__header">
							<div>
								<p className="admin-publication-checklist__eyebrow">Histórico recente</p>
								<h2 id="recent-work-title">Últimos imóveis alterados</h2>
							</div>
						</div>
						<ul>
							{loaderData.recentlyUpdated.map((property) => (
								<li key={property.id}>
									<a href={`/admin/imoveis/${property.id}/revisar`}>
										<strong>{property.publicCode}</strong>
										<span>{property.title}</span>
										<time dateTime={property.updatedAt}>
											{new Intl.DateTimeFormat("pt-BR", {
												dateStyle: "short",
												timeZone: "America/Sao_Paulo",
											}).format(new Date(property.updatedAt))}
										</time>
									</a>
								</li>
							))}
						</ul>
					</section>
				</div>
			)}
		</>
	);
}
