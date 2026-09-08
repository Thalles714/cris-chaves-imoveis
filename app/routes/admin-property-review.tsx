/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data } from "react-router";

import {
	AdminMutationFeedback,
	AdminPageHeader,
	AdminPropertyTransitionActions,
	AdminRecordTabs,
	AdminStatusBadge,
} from "~/components/admin";
import { SupabaseAdminMediaRepository } from "~/modules/media/admin/index.server";
import {
	assessPublicationReadiness,
	isPublicationReady,
} from "~/modules/properties/admin";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/index.server";
import { propertyIdSchema } from "~/modules/properties/validation/property-schema";

import type { Route } from "./+types/admin-property-review";
import {
	adminResponseHeaders,
	assertAdminFormRequest,
	requireAdminRoute,
} from "./admin-route-helpers.server";
import { action as updatePropertyAction } from "./admin-property-edit";

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: loaderData
				? `Revisar ${loaderData.property.title} | Administração Cris Chaves`
				: "Revisar imóvel | Administração Cris Chaves",
		},
	];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	const parsedId = propertyIdSchema.safeParse(params.propertyId);
	if (!parsedId.success) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(responseHeaders),
		});
	}

	const property = await new SupabaseAdminPropertyRepository(client).findById(
		parsedId.data,
	);
	if (!property) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
	const media = property.isDeleted
		? []
		: await new SupabaseAdminMediaRepository(client).list(parsedId.data);
	const publicationInput = {
		description: property.description,
		imageCount: media.filter((item) => item.kind === "image").length,
		hasApprovedCover: media.some(
			(item) => item.kind === "image" && item.isCover && item.isApprovedForPublication,
		),
	};

	return data(
		{
			property,
			mediaCount: media.length,
			publicationReadiness: assessPublicationReadiness(publicationInput),
			publicationReady: isPublicationReady(publicationInput),
			saved: new URL(request.url).searchParams.get("salvo") === "1",
		},
		{ headers: adminResponseHeaders(responseHeaders) },
	);
}

export async function action({ request, ...args }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	return updatePropertyAction({ request, ...args });
}

export default function AdminPropertyReview({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { property, mediaCount, publicationReadiness, publicationReady, saved } =
		loaderData;
	const publication =
		property.publicationStatus === "published"
			? { label: "Publicado", tone: "success" as const }
			: property.publicationStatus === "archived"
				? { label: "Arquivado", tone: "neutral" as const }
				: { label: "Rascunho", tone: "warning" as const };
	const deal =
		property.dealStatus === "sold"
			? { label: "Vendido", tone: "neutral" as const }
			: property.dealStatus === "reserved"
				? { label: "Reservado", tone: "warning" as const }
				: { label: "Disponível", tone: "info" as const };
	const characteristics = [
		["Dormitórios", property.bedrooms],
		["Suítes", property.suites],
		["Banheiros", property.bathrooms],
		["Vagas", property.parkingSpaces],
		[
			"Área total",
			property.totalAreaSquareMeters === null
				? null
				: `${property.totalAreaSquareMeters} m²`,
		],
		[
			"Área privativa",
			property.privateAreaSquareMeters === null
				? null
				: `${property.privateAreaSquareMeters} m²`,
		],
		[
			"Área do terreno",
			property.lotAreaSquareMeters === null ? null : `${property.lotAreaSquareMeters} m²`,
		],
	].filter((item): item is [string, string | number] => item[1] !== null);

	return (
		<>
			<AdminPageHeader
				eyebrow={`${property.publicCode} · Etapa 3 de 3`}
				title="Revisar e publicar"
				description="Confira o que ficará público e escolha a próxima ação do imóvel."
				actions={
					<a className="cc-button cc-button--ghost" href="/admin/imoveis">
						Voltar para imóveis
					</a>
				}
			/>
			<div className="admin-record-status">
				<AdminStatusBadge {...publication} />
				<AdminStatusBadge {...deal} />
			</div>
			<AdminRecordTabs propertyId={property.id} active="review" />
			{saved && (
				<AdminMutationFeedback tone="success" title="Situação atualizada">
					A alteração foi registrada e esta revisão já mostra o estado mais recente.
				</AdminMutationFeedback>
			)}
			{actionData && "error" in actionData && actionData.error && (
				<AdminMutationFeedback tone="error" title="Não foi possível atualizar">
					{actionData.error}
				</AdminMutationFeedback>
			)}

			<div className="admin-review-grid">
				<section className="admin-review-summary" aria-labelledby="review-summary-title">
					<div className="admin-review-summary__heading">
						<div>
							<p className="admin-publication-checklist__eyebrow">Prévia do conteúdo</p>
							<h2 id="review-summary-title">{property.title}</h2>
						</div>
						<a
							className="cc-button cc-button--secondary"
							href={`/admin/imoveis/${property.id}`}
						>
							Editar informações
						</a>
					</div>
					<dl className="admin-review-facts">
						<div>
							<dt>Finalidade</dt>
							<dd>{property.purpose === "sale" ? "Venda" : "Aluguel"}</dd>
						</div>
						<div>
							<dt>Tipo</dt>
							<dd>{property.propertyType}</dd>
						</div>
						<div>
							<dt>Localização pública</dt>
							<dd>{`${property.neighborhood}, ${property.city}`}</dd>
						</div>
						<div>
							<dt>Fotos e vídeos</dt>
							<dd>{mediaCount}</dd>
						</div>
					</dl>
					<div className="admin-review-characteristics">
						<h3>Características do imóvel</h3>
						{characteristics.length > 0 ? (
							<dl className="admin-review-facts admin-review-facts--characteristics">
								{characteristics.map(([label, value]) => (
									<div key={label}>
										<dt>{label}</dt>
										<dd>{value}</dd>
									</div>
								))}
							</dl>
						) : (
							<p className="admin-review-characteristics__empty">
								Nenhuma característica foi cadastrada. O catálogo será exibido sem
								dormitórios, banheiros, vagas ou área.
							</p>
						)}
					</div>
					<p className="admin-review-description">
						{property.description || "A descrição pública ainda não foi preenchida."}
					</p>
					<div className="admin-review-summary__actions">
						<a
							className="cc-button cc-button--secondary"
							href={`/admin/imoveis/${property.id}/midia`}
						>
							Gerenciar fotos e vídeos
						</a>
						{property.publicationStatus === "published" && (
							<a
								className="cc-button cc-button--ghost"
								href={`/imoveis/${property.slug}`}
							>
								Ver anúncio público
							</a>
						)}
					</div>
				</section>

				<section
					className="admin-review-checklist"
					aria-labelledby="review-checklist-title"
				>
					<p className="admin-publication-checklist__eyebrow">Checklist de publicação</p>
					<h2 id="review-checklist-title">
						{publicationReady ? "Pronto para publicar" : "Ainda falta concluir"}
					</h2>
					<ul>
						{publicationReadiness.map((item) => (
							<li key={item.id} data-complete={item.complete || undefined}>
								<span aria-hidden="true">{item.complete ? "✓" : "—"}</span>
								{item.label}
							</li>
						))}
					</ul>
					{!publicationReady && !property.isDeleted && (
						<a
							className="cc-button cc-button--secondary"
							href={
								publicationReadiness[0]?.complete
									? `/admin/imoveis/${property.id}/midia`
									: `/admin/imoveis/${property.id}#descricao-valor`
							}
						>
							Completar o que falta
						</a>
					)}
				</section>
			</div>

			<AdminPropertyTransitionActions
				property={property}
				publicationReady={publicationReady}
			/>
		</>
	);
}
