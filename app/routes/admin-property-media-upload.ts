/* eslint-disable @typescript-eslint/only-throw-error -- React Router uses thrown Responses for HTTP control flow. */
import { data } from "react-router";

import { readSupabaseServerConfig } from "~/lib/supabase/index.server";
import {
	AdminMediaError,
	adminImagePlanInputSchema,
	SupabaseAdminMediaRepository,
} from "~/modules/media/admin/index.server";
import { propertyIdSchema } from "~/modules/properties/validation/property-schema";

import type { Route } from "./+types/admin-property-media-upload";
import {
	adminBindings,
	adminResponseHeaders,
	assertAdminFormRequest,
	readAdminFormData,
	requireAdminRoute,
} from "./admin-route-helpers.server";

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

function jsonField(form: FormData, name: string): unknown {
	const value = form.get(name);
	if (typeof value !== "string" || value.length > 4_096) throw new Error("invalid-json");
	return JSON.parse(value) as unknown;
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

export async function action({ request, context, params }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const propertyId = routePropertyId(params.propertyId);
	const form = await readAdminFormData(request);
	const intent = formString(form, "intent");
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"media.create",
	);
	const repository = new SupabaseAdminMediaRepository(client);

	try {
		if (intent === "plan-image") {
			const grant = await repository.planImage(
				adminImagePlanInputSchema.parse({
					propertyId,
					original: jsonField(form, "original"),
					publicDerivative: jsonField(form, "publicDerivative"),
					altText: formString(form, "altText"),
					sortOrder: formNumber(form, "sortOrder"),
					isCover: formString(form, "isCover") === "true",
					privacyReviewed: formString(form, "privacyReviewed") === "true",
				}),
				readSupabaseServerConfig(adminBindings(context)),
			);
			return data(
				{ ok: true, grant },
				{ headers: adminResponseHeaders(responseHeaders) },
			);
		}

		if (intent === "confirm-image") {
			await repository.confirmImage(
				propertyId,
				formString(form, "mediaId"),
				formNumber(form, "expectedVersion"),
				formString(form, "isCover") === "true",
			);
			return data({ ok: true }, { headers: adminResponseHeaders(responseHeaders) });
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
