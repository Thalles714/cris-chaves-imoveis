import { data, redirect } from "react-router";
import { useState } from "react";

import {
	AdminMutationFeedback,
	AdminPageHeader,
	AdminPropertyForm,
} from "~/components/admin";
import { createPropertySlug } from "~/modules/properties/admin";
import { SupabaseAdminPropertyRepository } from "~/modules/properties/admin/index.server";

import type { Route } from "./+types/admin-property-new";
import {
	adminResponseHeaders,
	assertAdminFormRequest,
	readAdminFormData,
	requireAdminRoute,
} from "./admin-route-helpers.server";
import {
	adminPropertyDraftErrorField,
	adminPropertyDraftErrorMessage,
	parseAdminPropertyDraftForm,
	readAdminPropertyDraftFormValues,
} from "./admin-property-form.server";

export function meta() {
	return [{ title: "Cadastrar imóvel | Administração Cris Chaves" }];
}

export async function action({ request, context }: Route.ActionArgs) {
	await assertAdminFormRequest(request);
	const { client, responseHeaders } = await requireAdminRoute(
		request,
		context,
		"property.create",
	);
	const form = await readAdminFormData(request);
	const values = readAdminPropertyDraftFormValues(form);
	const parsed = parseAdminPropertyDraftForm(form);
	if (!parsed.success) {
		return data(
			{
				error: adminPropertyDraftErrorMessage(parsed.error),
				errorField: adminPropertyDraftErrorField(parsed.error),
				values,
			},
			{ status: 400, headers: adminResponseHeaders(responseHeaders) },
		);
	}

	try {
		const property = await new SupabaseAdminPropertyRepository(client).createDraft(
			parsed.data,
		);
		return redirect(`/admin/imoveis/${property.id}/midia?criado=1`, {
			headers: adminResponseHeaders(responseHeaders),
		});
	} catch {
		return data(
			{
				error: "Não foi possível salvar o rascunho. Revise os dados e tente novamente.",
				errorField: undefined,
				values,
			},
			{ status: 409, headers: adminResponseHeaders(responseHeaders) },
		);
	}
}

const controlClass = "cc-field__control";

export default function AdminPropertyNew({ actionData }: Route.ComponentProps) {
	const submittedValues = actionData?.values;
	const [title, setTitle] = useState(submittedValues?.title ?? "");
	const [slug, setSlug] = useState(submittedValues?.slug ?? "");
	const [slugEdited, setSlugEdited] = useState(Boolean(submittedValues?.slug));

	return (
		<>
			<AdminPageHeader
				eyebrow="Novo anúncio"
				title="Cadastrar imóvel"
				description="Preencha os dados essenciais. Depois você adicionará a localização privada e as fotos antes de publicar."
			/>
			{actionData?.error && (
				<AdminMutationFeedback tone="error" title="Não foi possível salvar">
					{actionData.error}
				</AdminMutationFeedback>
			)}
			<div className="admin-draft-flow" aria-label="Etapas do cadastro">
				<strong>Você está na etapa 1 de 3</strong>
				<ol>
					<li aria-current="step">Informações</li>
					<li>Fotos</li>
					<li>Revisar e publicar</li>
				</ol>
				<p>Nada desta tela aparece no site antes da publicação final.</p>
			</div>
			<datalist id="property-type-options">
				<option value="Casa" />
				<option value="Apartamento" />
				<option value="Sobrado" />
				<option value="Terreno" />
				<option value="Sala comercial" />
				<option value="Chácara" />
			</datalist>
			<AdminPropertyForm
				method="post"
				formLabel="Informações do novo imóvel"
				sections={[
					{
						id: "essenciais",
						title: "Dados essenciais",
						description: "Identificação e finalidade do anúncio.",
						fields: [
							{
								id: "publicCode",
								label: "Código do imóvel",
								hint: "Identificador interno único. Exemplo: CC-001.",
								error:
									actionData?.errorField === "publicCode" ? actionData.error : undefined,
								width: "third",
								control: (
									<input
										className={controlClass}
										name="publicCode"
										defaultValue={submittedValues?.publicCode ?? ""}
										placeholder="IMV-001"
										pattern="[A-Z0-9][A-Z0-9-]{2,31}"
										required
									/>
								),
							},
							{
								id: "title",
								label: "Título",
								error: actionData?.errorField === "title" ? actionData.error : undefined,
								control: (
									<input
										className={controlClass}
										name="title"
										value={title}
										onChange={(event) => {
											const nextTitle = event.target.value;
											setTitle(nextTitle);
											if (!slugEdited) setSlug(createPropertySlug(nextTitle));
										}}
										maxLength={140}
										autoComplete="off"
										required
									/>
								),
							},
							{
								id: "slug",
								label: "Endereço amigável",
								hint: "Gerado automaticamente a partir do título. Edite somente se necessário.",
								error: actionData?.errorField === "slug" ? actionData.error : undefined,
								control: (
									<input
										className={controlClass}
										name="slug"
										value={slug}
										onChange={(event) => {
											setSlugEdited(true);
											setSlug(createPropertySlug(event.target.value));
										}}
										placeholder="casa-em-cidreira"
										pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
										required
									/>
								),
							},
							{
								id: "purpose",
								label: "Finalidade",
								width: "third",
								control: (
									<select
										className={controlClass}
										name="purpose"
										defaultValue={submittedValues?.purpose || "sale"}
									>
										<option value="sale">Venda</option>
										<option value="rent">Aluguel</option>
									</select>
								),
							},
							{
								id: "propertyType",
								label: "Tipo de imóvel",
								width: "third",
								error:
									actionData?.errorField === "propertyType"
										? actionData.error
										: undefined,
								control: (
									<input
										className={controlClass}
										name="propertyType"
										defaultValue={submittedValues?.propertyType ?? ""}
										list="property-type-options"
										placeholder="Ex.: Casa"
										required
									/>
								),
							},
						],
					},
					{
						id: "localizacao",
						title: "Localização pública",
						description: "Somente cidade e bairro serão exibidos aos visitantes.",
						fields: [
							{
								id: "city",
								label: "Cidade",
								width: "half",
								error: actionData?.errorField === "city" ? actionData.error : undefined,
								control: (
									<input
										className={controlClass}
										name="city"
										defaultValue={submittedValues?.city ?? ""}
										required
									/>
								),
							},
							{
								id: "neighborhood",
								label: "Bairro",
								width: "half",
								error:
									actionData?.errorField === "neighborhood"
										? actionData.error
										: undefined,
								control: (
									<input
										className={controlClass}
										name="neighborhood"
										defaultValue={submittedValues?.neighborhood ?? ""}
										required
									/>
								),
							},
						],
					},
					{
						id: "valores",
						title: "Valor e descrição",
						fields: [
							{
								id: "priceDisplay",
								label: "Exibição do valor",
								width: "third",
								control: (
									<select
										className={controlClass}
										name="priceDisplay"
										defaultValue={submittedValues?.priceDisplay || "show"}
									>
										<option value="show">Mostrar valor</option>
										<option value="on_request">Sob consulta</option>
									</select>
								),
							},
							{
								id: "price",
								label: "Valor em reais",
								hint: "Digite apenas o valor. Exemplo: 100000.",
								error: actionData?.errorField === "price" ? actionData.error : undefined,
								width: "third",
								optional: true,
								control: (
									<input
										className={controlClass}
										type="number"
										name="price"
										defaultValue={submittedValues?.price ?? ""}
										min="0"
										step="0.01"
										inputMode="decimal"
										placeholder="100000"
									/>
								),
							},
							{
								id: "description",
								label: "Descrição pública",
								error:
									actionData?.errorField === "description" ? actionData.error : undefined,
								control: (
									<textarea
										className={controlClass}
										name="description"
										defaultValue={submittedValues?.description ?? ""}
										rows={7}
										maxLength={10_000}
									/>
								),
							},
						],
					},
					{
						id: "caracteristicas",
						title: "Características",
						description: "Medidas e ambientes podem ser completados depois.",
						fields: [
							...(
								[
									"totalAreaSquareMeters",
									"privateAreaSquareMeters",
									"lotAreaSquareMeters",
								] as const
							).map((name, index) => ({
								id: name,
								label: ["Área total (m²)", "Área privativa (m²)", "Área do terreno (m²)"][
									index
								],
								hint:
									name === "lotAreaSquareMeters"
										? "Multiplique frente × profundidade. Ex.: 12 × 25 = 300 m²."
										: undefined,
								width: "third" as const,
								optional: true,
								error: actionData?.errorField === name ? actionData.error : undefined,
								control: (
									<input
										className={controlClass}
										type="number"
										name={name}
										defaultValue={submittedValues?.[name] ?? ""}
										min="0"
										step="0.01"
									/>
								),
							})),
							...(["bedrooms", "suites", "bathrooms", "parkingSpaces"] as const).map(
								(name, index) => ({
									id: name,
									label: ["Dormitórios", "Suítes", "Banheiros", "Vagas"][index],
									width: "third" as const,
									optional: true,
									error: actionData?.errorField === name ? actionData.error : undefined,
									control: (
										<input
											className={controlClass}
											type="number"
											name={name}
											defaultValue={submittedValues?.[name] ?? ""}
											min="0"
											max="100"
										/>
									),
								}),
							),
							{
								id: "features",
								label: "Diferenciais",
								hint: "Use itens curtos, com até 100 caracteres cada, separados por vírgula, ponto e vírgula ou linha. Ex.: Sala, Cozinha, Aceita proposta.",
								optional: true,
								error:
									actionData?.errorField === "features" ? actionData.error : undefined,
								control: (
									<textarea
										className={controlClass}
										name="features"
										rows={4}
										defaultValue={submittedValues?.features ?? ""}
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
										defaultValue={submittedValues?.isFeatured || "false"}
									>
										<option value="false">Anúncio comum</option>
										<option value="true">Mostrar em destaque</option>
									</select>
								),
							},
						],
					},
					{
						id: "midia-publicacao",
						title: "Mídia e publicação",
						description:
							"Fotos e endereço privado poderão ser adicionados após salvar este rascunho.",
						content: (
							<p>
								Nada será publicado automaticamente. A publicação terá uma confirmação
								separada.
							</p>
						),
					},
				]}
				actions={
					<>
						<a className="cc-button cc-button--ghost" href="/admin/imoveis">
							Cancelar
						</a>
						<button className="cc-button cc-button--primary" type="submit">
							Salvar e continuar
						</button>
					</>
				}
			/>
		</>
	);
}
