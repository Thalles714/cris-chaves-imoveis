/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data, redirect } from "react-router";

import {
	AdminMutationFeedback,
	AdminPageHeader,
	AdminPropertyForm,
	AdminRecordTabs,
	AdminStatusBadge,
} from "~/components/admin";
import type { AdminOperation } from "~/modules/auth/index.server";
import { SupabaseAdminMediaRepository } from "~/modules/media/admin/index.server";
import {
	adminPropertyUpdateInputSchema,
	assessPublicationReadiness,
	isPublicationReady,
} from "~/modules/properties/admin";
import {
	AdminPropertyConflictError,
	SupabaseAdminPropertyRepository,
} from "~/modules/properties/admin/index.server";
import { propertyIdSchema } from "~/modules/properties/validation/property-schema";

import type { Route } from "./+types/admin-property-edit";
import {
	parseAdminPropertyDraftForm,
	parseAdminPropertyPrivateForm,
	parseAdminPropertyTransitionForm,
} from "./admin-property-form.server";
import {
	adminResponseHeaders,
	assertAdminFormRequest,
	readAdminFormData,
	requireAdminRoute,
} from "./admin-route-helpers.server";

const controlClass = "cc-field__control";

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{
			title: loaderData
				? `${loaderData.property.title} | Administração Cris Chaves`
				: "Imóvel | Administração Cris Chaves",
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
	const propertyRepository = new SupabaseAdminPropertyRepository(client);
	const mediaRepository = new SupabaseAdminMediaRepository(client);
	const property = await propertyRepository.findById(parsedId.data);
	if (!property) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
	const media = property.isDeleted ? [] : await mediaRepository.list(parsedId.data);
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
			publicationReadiness: assessPublicationReadiness(publicationInput),
			publicationReady: isPublicationReady(publicationInput),
			justCreated: new URL(request.url).searchParams.get("criado") === "1",
			saved: new URL(request.url).searchParams.get("salvo") === "1",
		},
		{ headers: adminResponseHeaders(responseHeaders) },
	);
}

const operationForTransition: Record<string, AdminOperation> = {
	publish: "property.publish",
	archive: "property.archive",
	restore: "property.restore",
	reserve: "property.reserve",
	releaseReservation: "property.releaseReservation",
	markSold: "property.markSold",
	softDelete: "property.softDelete",
};

export async function action({ request, context, params }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const propertyId = propertyIdSchema.safeParse(params.propertyId);
	if (!propertyId.success) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(),
		});
	}
	const form = await readAdminFormData(request);
	const intent = form.get("intent");
	const returnToReview = form.get("returnTo") === "review";
	const transitionValue = form.get("transition");
	const operation =
		intent === "update" || intent === "update-private"
			? "property.update"
			: typeof transitionValue === "string"
				? operationForTransition[transitionValue]
				: undefined;
	if (!operation) {
		return data(
			{ error: "Ação inválida." },
			{ status: 400, headers: adminResponseHeaders() },
		);
	}
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		operation,
	);
	const repository = new SupabaseAdminPropertyRepository(client);

	try {
		if (intent === "update") {
			const draft = parseAdminPropertyDraftForm(form);
			const parsed = draft.success
				? adminPropertyUpdateInputSchema.safeParse({
						...draft.data,
						expectedVersion: Number(form.get("expectedVersion")),
					})
				: draft;
			if (!parsed.success) {
				return data(
					{ error: parsed.error.issues[0]?.message ?? "Revise os campos informados." },
					{ status: 400, headers: adminResponseHeaders(responseHeaders) },
				);
			}
			await repository.update(propertyId.data, parsed.data);
		} else if (intent === "update-private") {
			const parsed = parseAdminPropertyPrivateForm(form);
			if (!parsed.success) {
				return data(
					{ error: parsed.error.issues[0]?.message ?? "Revise os dados privados." },
					{ status: 400, headers: adminResponseHeaders(responseHeaders) },
				);
			}
			await repository.updatePrivate(propertyId.data, parsed.data);
		} else {
			const parsed = parseAdminPropertyTransitionForm(form, propertyId.data);
			if (!parsed.success) {
				return data(
					{
						error:
							parsed.error.issues[0]?.message ??
							"Não foi possível confirmar a alteração de situação.",
					},
					{ status: 400, headers: adminResponseHeaders(responseHeaders) },
				);
			}
			if (parsed.data.transition === "publish") {
				const [property, media] = await Promise.all([
					repository.findById(propertyId.data),
					new SupabaseAdminMediaRepository(client).list(propertyId.data),
				]);
				if (!property) {
					throw new Response("Imóvel não encontrado.", {
						status: 404,
						headers: adminResponseHeaders(responseHeaders),
					});
				}
				const readiness = assessPublicationReadiness({
					description: property.description,
					imageCount: media.filter((item) => item.kind === "image").length,
					hasApprovedCover: media.some(
						(item) =>
							item.kind === "image" && item.isCover && item.isApprovedForPublication,
					),
				});
				const missing = readiness.filter((item) => !item.complete);
				if (missing.length > 0) {
					return data(
						{
							error: `Antes de publicar, conclua: ${missing
								.map((item) => item.label.toLowerCase())
								.join(", ")}.`,
						},
						{ status: 409, headers: adminResponseHeaders(responseHeaders) },
					);
				}
			}
			await repository.transition(parsed.data);
			if (parsed.data.transition === "softDelete") {
				return redirect("/admin/imoveis", {
					headers: adminResponseHeaders(responseHeaders),
				});
			}
		}
		const successPath = returnToReview
			? `/admin/imoveis/${propertyId.data}/revisar?salvo=1`
			: `/admin/imoveis/${propertyId.data}?salvo=1`;
		return redirect(successPath, {
			headers: adminResponseHeaders(responseHeaders),
		});
	} catch (error) {
		return data(
			{
				error:
					error instanceof AdminPropertyConflictError
						? error.message
						: "Não foi possível salvar esta alteração.",
			},
			{
				status: error instanceof AdminPropertyConflictError ? 409 : 400,
				headers: adminResponseHeaders(responseHeaders),
			},
		);
	}
}

function publicSections(property: Route.ComponentProps["loaderData"]["property"]) {
	return [
		{
			id: "essenciais",
			title: "Dados essenciais",
			fields: [
				{
					id: "publicCode",
					label: "Código",
					width: "third" as const,
					control: (
						<input
							className={controlClass}
							name="publicCode"
							defaultValue={property.publicCode}
							required
						/>
					),
				},
				{
					id: "title",
					label: "Título",
					control: (
						<input
							className={controlClass}
							name="title"
							defaultValue={property.title}
							required
						/>
					),
				},
				{
					id: "slug",
					label: "Endereço amigável",
					control: (
						<input
							className={controlClass}
							name="slug"
							defaultValue={property.slug}
							required
						/>
					),
				},
				{
					id: "purpose",
					label: "Finalidade",
					width: "third" as const,
					control: (
						<select
							className={controlClass}
							name="purpose"
							defaultValue={property.purpose}
						>
							<option value="sale">Venda</option>
							<option value="rent">Aluguel</option>
						</select>
					),
				},
				{
					id: "propertyType",
					label: "Tipo",
					width: "third" as const,
					control: (
						<input
							className={controlClass}
							name="propertyType"
							defaultValue={property.propertyType}
							required
						/>
					),
				},
			],
		},
		{
			id: "localizacao-publica",
			title: "Localização pública",
			description: "Cidade e bairro aparecem no anúncio público.",
			fields: [
				{
					id: "city",
					label: "Cidade",
					width: "half" as const,
					control: (
						<input
							className={controlClass}
							name="city"
							defaultValue={property.city}
							required
						/>
					),
				},
				{
					id: "neighborhood",
					label: "Bairro",
					width: "half" as const,
					control: (
						<input
							className={controlClass}
							name="neighborhood"
							defaultValue={property.neighborhood}
							required
						/>
					),
				},
			],
		},
		{
			id: "descricao-valor",
			title: "Descrição e valor",
			fields: [
				{
					id: "priceDisplay",
					label: "Exibição do valor",
					width: "third" as const,
					control: (
						<select
							className={controlClass}
							name="priceDisplay"
							defaultValue={property.priceDisplay}
						>
							<option value="show">Mostrar valor</option>
							<option value="on_request">Sob consulta</option>
						</select>
					),
				},
				{
					id: "price",
					label: "Valor em reais",
					width: "third" as const,
					optional: true,
					control: (
						<input
							className={controlClass}
							type="number"
							name="price"
							min="0"
							step="0.01"
							defaultValue={
								property.priceInCents === null ? "" : property.priceInCents / 100
							}
						/>
					),
				},
				{
					id: "description",
					label: "Descrição pública",
					control: (
						<textarea
							className={controlClass}
							name="description"
							rows={7}
							defaultValue={property.description}
						/>
					),
				},
			],
		},
		{
			id: "caracteristicas",
			title: "Características",
			fields: [
				...(
					[
						["totalAreaSquareMeters", "Área total (m²)"],
						["privateAreaSquareMeters", "Área privativa (m²)"],
						["lotAreaSquareMeters", "Área do terreno (m²)"],
						["bedrooms", "Dormitórios"],
						["suites", "Suítes"],
						["bathrooms", "Banheiros"],
						["parkingSpaces", "Vagas"],
					] as const
				).map(([name, label]) => ({
					id: name,
					label,
					width: "third" as const,
					optional: true,
					control: (
						<input
							className={controlClass}
							type="number"
							name={name}
							min="0"
							step="0.01"
							defaultValue={property[name] ?? ""}
						/>
					),
				})),
				{
					id: "features",
					label: "Diferenciais",
					optional: true,
					control: (
						<textarea
							className={controlClass}
							name="features"
							rows={4}
							defaultValue={property.features.join("\n")}
						/>
					),
				},
				{
					id: "isFeatured",
					label: "Destaque",
					optional: true,
					control: (
						<select
							className={controlClass}
							name="isFeatured"
							defaultValue={property.isFeatured ? "true" : "false"}
						>
							<option value="false">Anúncio comum</option>
							<option value="true">Mostrar em destaque</option>
						</select>
					),
				},
			],
		},
	];
}

function privateSections(property: Route.ComponentProps["loaderData"]["property"]) {
	const details = property.privateDetails;
	return [
		{
			id: "localizacao-privada",
			title: "Localização privada",
			description: "Estes dados nunca são enviados ao catálogo público.",
			fields: [
				{
					id: "addressLine",
					label: "Logradouro",
					control: (
						<input
							className={controlClass}
							name="addressLine"
							defaultValue={details.addressLine ?? ""}
						/>
					),
				},
				{
					id: "addressNumber",
					label: "Número",
					width: "third" as const,
					control: (
						<input
							className={controlClass}
							name="addressNumber"
							defaultValue={details.addressNumber ?? ""}
						/>
					),
				},
				{
					id: "addressComplement",
					label: "Complemento",
					width: "third" as const,
					optional: true,
					control: (
						<input
							className={controlClass}
							name="addressComplement"
							defaultValue={details.addressComplement ?? ""}
						/>
					),
				},
				{
					id: "postalCode",
					label: "CEP",
					width: "third" as const,
					optional: true,
					control: (
						<input
							className={controlClass}
							name="postalCode"
							defaultValue={details.postalCode ?? ""}
						/>
					),
				},
			],
		},
		{
			id: "informacoes-internas",
			title: "Informações internas",
			description: "Todos os campos desta etapa são opcionais e protegidos por RLS.",
			fields: [
				{
					id: "ownerName",
					label: "Nome do proprietário",
					optional: true,
					control: (
						<input
							className={controlClass}
							name="ownerName"
							defaultValue={details.ownerName ?? ""}
						/>
					),
				},
				{
					id: "ownerContact",
					label: "Contato do proprietário",
					optional: true,
					control: (
						<input
							className={controlClass}
							name="ownerContact"
							defaultValue={details.ownerContact ?? ""}
						/>
					),
				},
				{
					id: "internalNotes",
					label: "Observações internas",
					optional: true,
					control: (
						<textarea
							className={controlClass}
							name="internalNotes"
							rows={5}
							defaultValue={details.internalNotes ?? ""}
						/>
					),
				},
			],
		},
	];
}

export default function AdminPropertyEdit({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { property, publicationReadiness, publicationReady, justCreated, saved } =
		loaderData;
	const nextMissing = publicationReadiness.find((item) => !item.complete);
	const publication =
		property.publicationStatus === "published"
			? { label: "Publicado", tone: "success" as const }
			: property.publicationStatus === "archived"
				? { label: "Arquivado", tone: "neutral" as const }
				: { label: "Rascunho", tone: "warning" as const };
	return (
		<>
			<AdminPageHeader
				eyebrow={property.publicCode}
				title={property.title}
				description={`${property.neighborhood}, ${property.city}`}
				actions={
					<a className="cc-button cc-button--ghost" href="/admin/imoveis">
						Voltar para imóveis
					</a>
				}
			/>
			<div className="admin-record-status">
				<AdminStatusBadge {...publication} />
				<AdminStatusBadge
					label={
						property.dealStatus === "sold"
							? "Vendido"
							: property.dealStatus === "reserved"
								? "Reservado"
								: "Disponível"
					}
					tone={property.dealStatus === "available" ? "info" : "warning"}
				/>
			</div>
			<AdminRecordTabs propertyId={property.id} active="details" />
			{justCreated && (
				<AdminMutationFeedback tone="success" title="Rascunho criado">
					Agora complete os dados privados e adicione as fotos. O imóvel ainda não está
					visível no site.
				</AdminMutationFeedback>
			)}
			{saved && !justCreated && (
				<AdminMutationFeedback tone="success" title="Dados salvos">
					As informações foram registradas com segurança. O checklist desta página mostra
					o que ainda falta para publicar.
				</AdminMutationFeedback>
			)}
			{actionData?.error && (
				<AdminMutationFeedback tone="error" title="Não foi possível salvar">
					{actionData.error}
				</AdminMutationFeedback>
			)}
			<section className="admin-publication-checklist" aria-labelledby="checklist-title">
				<div>
					<p className="admin-publication-checklist__eyebrow">Prontidão do anúncio</p>
					<h2 id="checklist-title">
						{publicationReady ? "Pronto para publicar" : "Complete antes de publicar"}
					</h2>
					<p>
						A publicação só é liberada quando a descrição e as fotos estiverem prontas.
					</p>
				</div>
				<ul>
					{publicationReadiness.map((item) => (
						<li key={item.id} data-complete={item.complete || undefined}>
							<span aria-hidden="true">{item.complete ? "✓" : "—"}</span>
							{item.label}
						</li>
					))}
				</ul>
				{publicationReady ? (
					<a
						className="cc-button cc-button--primary"
						href={`/admin/imoveis/${property.id}/revisar`}
					>
						Revisar e publicar
					</a>
				) : nextMissing?.id === "images" || nextMissing?.id === "cover" ? (
					<a
						className="cc-button cc-button--primary"
						href={`/admin/imoveis/${property.id}/midia`}
					>
						Adicionar fotos
					</a>
				) : nextMissing?.id === "description" ? (
					<a className="cc-button cc-button--primary" href="#descricao-valor">
						Completar descrição
					</a>
				) : (
					<a
						className="cc-button cc-button--secondary"
						href={`/admin/imoveis/${property.id}/midia`}
					>
						Revisar fotos
					</a>
				)}
			</section>
			<AdminPropertyForm
				method="post"
				sections={publicSections(property)}
				status="Salve para continuar com segurança."
				actions={
					<>
						<input type="hidden" name="intent" value="update" />
						<input type="hidden" name="expectedVersion" value={property.version} />
						<button className="cc-button cc-button--primary" type="submit">
							Salvar informações
						</button>
					</>
				}
			/>
			<AdminPropertyForm
				method="post"
				sections={privateSections(property)}
				formLabel="Localização e informações internas"
				actions={
					<>
						<input type="hidden" name="intent" value="update-private" />
						<input
							type="hidden"
							name="privateExpectedVersion"
							value={property.privateDetails.version}
						/>
						<button className="cc-button cc-button--primary" type="submit">
							Salvar dados privados
						</button>
					</>
				}
			/>
		</>
	);
}
