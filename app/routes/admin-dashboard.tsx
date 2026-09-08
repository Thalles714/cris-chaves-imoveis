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
					id: "total",
					label: "Imóveis ativos",
					value: loaderData.total,
					description: "Todos os registros não excluídos",
				},
				{
					id: "published",
					label: "Publicados",
					value: loaderData.published,
					description: "Visíveis no catálogo público",
					tone: "success" as const,
				},
				{
					id: "drafts",
					label: "Rascunhos",
					value: loaderData.drafts,
					description: "Ainda não publicados",
					tone: "warning" as const,
				},
				{
					id: "archived",
					label: "Arquivados",
					value: loaderData.archived,
					description: "Fora do catálogo",
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
				metrics={metrics}
				emptyTitle="Nenhum imóvel cadastrado"
				emptyDescription="Crie o primeiro rascunho. Ele só aparecerá no site depois de uma publicação confirmada."
				emptyAction={
					<a className="cc-button cc-button--primary" href="/admin/imoveis/novo">
						Cadastrar primeiro imóvel
					</a>
				}
			/>
		</>
	);
}
