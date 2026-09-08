/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data } from "react-router";

import {
	AdminPageHeader,
	AdminPropertyList,
	QuickPropertyDrawer,
} from "~/components/admin";
import { parseAdminPropertyQuery } from "~/modules/properties/admin";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/index.server";

import type { Route } from "./+types/admin-properties";
import { adminResponseHeaders, requireAdminRoute } from "./admin-route-helpers.server";

const publicationLabels = {
	draft: { label: "Rascunho", tone: "warning" as const },
	published: { label: "Publicado", tone: "success" as const },
	archived: { label: "Arquivado", tone: "neutral" as const },
};

const dealLabels = {
	available: { label: "Disponível", tone: "info" as const },
	reserved: { label: "Reservado", tone: "warning" as const },
	sold: { label: "Vendido", tone: "neutral" as const },
};

function priceLabel(value: number | null, display: "show" | "on_request") {
	if (display === "on_request" || value === null) return "Sob consulta";
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: 0,
	}).format(value / 100);
}

export function meta() {
	return [{ title: "Imóveis | Administração Cris Chaves" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	let query;
	try {
		query = parseAdminPropertyQuery(new URL(request.url));
	} catch {
		throw new Response("Filtros inválidos.", {
			status: 400,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
	const page = await new SupabaseAdminPropertyRepository(client).list(query);
	return data({ page, query }, { headers: adminResponseHeaders(responseHeaders) });
}

export default function AdminProperties({ loaderData }: Route.ComponentProps) {
	const totalPages = Math.max(
		1,
		Math.ceil(loaderData.page.totalItems / loaderData.page.pageSize),
	);
	const goToPage = (page: number) => {
		const params = new URLSearchParams();
		if (loaderData.query.search) params.set("busca", loaderData.query.search);
		if (loaderData.query.publicationStatus) {
			params.set("status", loaderData.query.publicationStatus);
		}
		if (loaderData.query.dealStatus) {
			params.set("negociacao", loaderData.query.dealStatus);
		}
		if (loaderData.query.showDeleted) params.set("excluidos", "1");
		params.set("pagina", String(page));
		window.location.assign(`/admin/imoveis?${params.toString()}`);
	};
	return (
		<>
			<AdminPageHeader
				eyebrow="Catálogo"
				title="Imóveis"
				description="Cadastre, revise e publique os anúncios a partir de um único lugar."
				actions={<QuickPropertyDrawer />}
			/>
			<AdminPropertyList
				items={loaderData.page.items.map((item) => ({
					id: item.id,
					title: item.title,
					code: item.publicCode,
					locationLabel: `${item.neighborhood}, ${item.city}`,
					priceLabel: priceLabel(item.priceInCents, item.priceDisplay),
					updatedLabel: new Intl.DateTimeFormat("pt-BR", {
						dateStyle: "short",
					}).format(new Date(item.updatedAt)),
					statuses: [
						publicationLabels[item.publicationStatus],
						dealLabels[item.dealStatus],
					],
					actions: (
						<a className="cc-button cc-button--ghost" href={`/admin/imoveis/${item.id}`}>
							Editar
						</a>
					),
				}))}
				searchValue={loaderData.query.search ?? ""}
				searchAction="/admin/imoveis"
				tools={
					<>
						<label className="admin-filter-control">
							<span>Publicação</span>
							<select
								className="cc-field__control"
								name="status"
								defaultValue={loaderData.query.publicationStatus ?? ""}
							>
								<option value="">Todas</option>
								<option value="draft">Rascunhos</option>
								<option value="published">Publicados</option>
								<option value="archived">Arquivados</option>
							</select>
						</label>
						<label className="admin-filter-control">
							<span>Negociação</span>
							<select
								className="cc-field__control"
								name="negociacao"
								defaultValue={loaderData.query.dealStatus ?? ""}
							>
								<option value="">Todas</option>
								<option value="available">Disponíveis</option>
								<option value="reserved">Reservados</option>
								<option value="sold">Vendidos</option>
							</select>
						</label>
						<label className="admin-filter-control">
							<span>Registros</span>
							<select
								className="cc-field__control"
								name="excluidos"
								defaultValue={loaderData.query.showDeleted ? "1" : ""}
							>
								<option value="">Ativos</option>
								<option value="1">Excluídos recuperáveis</option>
							</select>
						</label>
						<a className="cc-button cc-button--ghost" href="/admin/imoveis">
							Limpar
						</a>
					</>
				}
				emptyTitle="Nenhum imóvel encontrado"
				emptyDescription="Ajuste a busca ou cadastre um novo rascunho."
				emptyAction={
					<a className="cc-button cc-button--primary" href="/admin/imoveis/novo">
						Cadastrar imóvel
					</a>
				}
				pagination={{
					page: loaderData.page.page,
					totalPages,
					onPageChange: goToPage,
				}}
			/>
		</>
	);
}
