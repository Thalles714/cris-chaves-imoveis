/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data, redirect } from "react-router";

import {
	AdminMediaManager,
	AdminMutationFeedback,
	AdminPageHeader,
	AdminRecordTabs,
} from "~/components/admin";
import {
	ADMIN_IMAGE_LIMITS,
	AdminMediaError,
	adminMediaArchiveInputSchema,
	adminMediaMetadataInputSchema,
	adminVideoInputSchema,
	SupabaseAdminMediaRepository,
} from "~/modules/media/admin/index.server";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/index.server";
import { isPublicationReady } from "~/modules/properties/admin";
import { propertyIdSchema } from "~/modules/properties/validation/property-schema";

import type { Route } from "./+types/admin-property-media";
import {
	adminResponseHeaders,
	assertAdminFormRequest,
	readAdminFormData,
	requireAdminRoute,
} from "./admin-route-helpers.server";

export function meta({ loaderData }: Route.MetaArgs) {
	return [
		{ title: loaderData ? `Mídias de ${loaderData.property.title}` : "Mídias do imóvel" },
	];
}

function routePropertyId(value: string | undefined) {
	const parsed = propertyIdSchema.safeParse(value);
	if (!parsed.success) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(),
		});
	}
	return parsed.data;
}

function formString(form: FormData, name: string) {
	const value = form.get(name);
	return typeof value === "string" ? value : "";
}

function formNumber(form: FormData, name: string) {
	return Number(formString(form, name));
}

function mediaError(error: unknown) {
	if (error instanceof AdminMediaError) {
		switch (error.code) {
			case "IMAGE_LIMIT_REACHED":
				return { status: 409, message: "Este imóvel já atingiu o limite de fotos." };
			case "NOT_FOUND":
				return { status: 404, message: "Imóvel ou mídia não encontrado." };
			case "CONFLICT":
				return {
					status: 409,
					message:
						"A mídia foi alterada em outra sessão. Atualize a página e tente novamente.",
				};
			case "STORAGE_MISMATCH":
				return {
					status: 409,
					message:
						"Os dois arquivos ainda não foram confirmados. Tente o envio novamente.",
				};
			default:
				return {
					status: 503,
					message: "O armazenamento está temporariamente indisponível.",
				};
		}
	}
	return { status: 400, message: "Confira os dados informados e tente novamente." };
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"admin.read",
	);
	const propertyId = routePropertyId(params.propertyId);
	const [property, media] = await Promise.all([
		new SupabaseAdminPropertyRepository(client).findById(propertyId),
		new SupabaseAdminMediaRepository(client).list(propertyId),
	]);
	if (!property) {
		throw new Response("Imóvel não encontrado.", {
			status: 404,
			headers: adminResponseHeaders(responseHeaders),
		});
	}
	return data(
		{
			property,
			media,
			maxImages: ADMIN_IMAGE_LIMITS.maxImagesPerProperty,
			publicationReady: isPublicationReady({
				description: property.description,
				imageCount: media.filter((item) => item.kind === "image").length,
				hasApprovedCover: media.some(
					(item) =>
						item.kind === "image" && item.isCover && item.isApprovedForPublication,
				),
			}),
			removed: new URL(request.url).searchParams.get("removida") === "1",
			created: new URL(request.url).searchParams.get("criado") === "1",
		},
		{ headers: adminResponseHeaders(responseHeaders) },
	);
}

export async function action({ request, context, params }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const propertyId = routePropertyId(params.propertyId);
	const form = await readAdminFormData(request);
	const intent = formString(form, "intent");
	const operation =
		intent === "update-metadata"
			? "media.update"
			: intent === "archive-media"
				? "media.softDelete"
				: "media.create";
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		operation,
	);
	const repository = new SupabaseAdminMediaRepository(client);

	try {
		if (intent === "add-video") {
			await repository.addVideo(
				adminVideoInputSchema.parse({
					propertyId,
					url: formString(form, "url"),
					altText: formString(form, "altText"),
					sortOrder: formNumber(form, "sortOrder"),
					confirmedWatermarked: formString(form, "confirmedWatermarked") === "true",
					confirmedPublicationAuthorized:
						formString(form, "confirmedWatermarked") === "true",
				}),
			);
			return redirect(`/admin/imoveis/${propertyId}/midia`, {
				headers: adminResponseHeaders(responseHeaders),
			});
		}

		if (intent === "update-metadata") {
			await repository.updateMetadata(
				adminMediaMetadataInputSchema.parse({
					propertyId,
					mediaId: formString(form, "mediaId"),
					altText: formString(form, "altText"),
					sortOrder: formNumber(form, "sortOrder"),
					isCover: formString(form, "isCover") === "true",
					expectedVersion: formNumber(form, "expectedVersion"),
				}),
			);
			return redirect(`/admin/imoveis/${propertyId}/midia`, {
				headers: adminResponseHeaders(responseHeaders),
			});
		}

		if (intent === "archive-media") {
			await repository.archive(
				adminMediaArchiveInputSchema.parse({
					propertyId,
					mediaId: formString(form, "mediaId"),
					expectedVersion: formNumber(form, "expectedVersion"),
				}),
			);
			return redirect(`/admin/imoveis/${propertyId}/midia?removida=1`, {
				headers: adminResponseHeaders(responseHeaders),
			});
		}
	} catch (error) {
		const failure = mediaError(error);
		return data(
			{ ok: false, error: failure.message },
			{ status: failure.status, headers: adminResponseHeaders(responseHeaders) },
		);
	}

	return data(
		{ ok: false, error: "Operação inválida." },
		{ status: 400, headers: adminResponseHeaders(responseHeaders) },
	);
}

export default function AdminPropertyMedia({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return (
		<>
			<AdminPageHeader
				eyebrow={loaderData.property.publicCode}
				title={`Mídias de ${loaderData.property.title}`}
				description="Originais privados e cópias públicas tratadas, na ordem do anúncio."
				actions={
					<>
						<a
							className="cc-button cc-button--ghost"
							href={`/admin/imoveis/${loaderData.property.id}`}
						>
							Editar informações
						</a>
						<a
							className="cc-button cc-button--primary"
							href={`/admin/imoveis/${loaderData.property.id}/revisar`}
						>
							{loaderData.publicationReady
								? "Revisar e publicar"
								: "Continuar para revisão"}
						</a>
					</>
				}
			/>
			<AdminRecordTabs propertyId={loaderData.property.id} active="media" />
			{loaderData.created && (
				<AdminMutationFeedback tone="success" title="Rascunho criado">
					Agora adicione as fotos. Quando terminar, siga para revisar e publicar.
				</AdminMutationFeedback>
			)}
			{loaderData.removed && (
				<AdminMutationFeedback tone="success" title="Mídia ocultada">
					Ela não faz mais parte do anúncio. O arquivo foi mantido para recuperação.
				</AdminMutationFeedback>
			)}
			{actionData &&
				"error" in actionData &&
				typeof actionData.error === "string" &&
				actionData.error && (
					<AdminMutationFeedback tone="error" title="Não foi possível salvar">
						{actionData.error}
					</AdminMutationFeedback>
				)}
			<AdminMediaManager
				propertyId={loaderData.property.id}
				items={loaderData.media}
				maxImages={loaderData.maxImages}
			/>
		</>
	);
}
