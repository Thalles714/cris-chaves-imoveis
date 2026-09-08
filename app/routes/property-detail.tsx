import { Breadcrumb } from "~/components/ui";
import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { cloudflareContext } from "~/lib/cloudflare-context";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";
import { createPublicPropertyRepository } from "~/modules/properties/server/repository-factory.server";
import { buildSimilarPropertiesUrl } from "~/modules/properties/domain/public-property-links";
import { propertySlugSchema } from "~/modules/properties/validation/property-schema";
import { formatPropertyPrice } from "~/components/public";

import type { Route } from "./+types/property-detail";

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const slug = propertySlugSchema.safeParse(params.slug);
	if (!slug.success) {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw new Response("Imóvel não encontrado.", { status: 404 });
	}
	const site = loadPublicSiteContext(request, context);
	const { repository } = createPublicPropertyRepository(
		request,
		context.get(cloudflareContext),
	);
	const property = await repository.findPublishedBySlug(slug.data);
	if (!property) {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw new Response("Imóvel não encontrado.", { status: 404 });
	}
	const canonicalUrl = new URL(`/imoveis/${property.slug}`, `${site.canonicalOrigin}/`)
		.href;
	return {
		property,
		whatsappUrl: buildWhatsAppUrl(site.whatsappNumber, {
			propertyCode: property.publicCode,
			canonicalUrl,
		}),
	};
}

export function meta({ loaderData, matches }: Route.MetaArgs) {
	if (!loaderData) {
		return publicMeta(matches, [{ title: "Imóvel não encontrado | Cris Chaves" }]);
	}
	return publicMeta(matches, [
		{ title: `${loaderData.property.title} | Cris Chaves` },
		{
			name: "description",
			content: `Conheça este ${loaderData.property.propertyType.toLowerCase()} em ${loaderData.property.neighborhood}, ${loaderData.property.city}, apresentado por Cris Chaves.`,
		},
	]);
}

export default function PropertyDetail({ loaderData }: Route.ComponentProps) {
	const { property, whatsappUrl } = loaderData;
	const labels = { sale: "Venda", rent: "Aluguel" } as const;
	const status = {
		available: "Disponível",
		reserved: "Reservado",
		sold: "Indisponível",
	} as const;
	const isReserved = property.dealStatus === "reserved";
	const facts = [
		["Tipo", property.propertyType],
		["Dormitórios", property.bedrooms],
		["Suítes", property.suites],
		["Banheiros", property.bathrooms],
		["Vagas", property.parkingSpaces],
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
	].filter((item) => item[1] !== null);

	return (
		<main id="conteudo" className="property-detail cc-container">
			<Breadcrumb
				items={[
					{ label: "Imóveis", href: "/" },
					{ label: property.publicCode, current: true },
				]}
			/>
			<div className="property-detail__layout">
				<section className="detail-gallery" aria-label="Mídias do imóvel">
					{property.media.length ? (
						property.media.map((media, index) => (
							<figure key={`${media.kind}-${media.position}`}>
								{media.kind === "image" ? (
									<img
										src={media.url}
										alt={media.altText}
										loading={index === 0 ? "eager" : "lazy"}
										fetchPriority={index === 0 ? "high" : "auto"}
										decoding="async"
									/>
								) : (
									<a
										className="detail-video"
										href={media.url}
										target="_blank"
										rel="noreferrer"
									>
										Assistir vídeo no provedor <span aria-hidden="true">↗</span>
									</a>
								)}
								{media.kind === "image" && (
									<figcaption className="visually-hidden">{media.altText}</figcaption>
								)}
							</figure>
						))
					) : (
						<div className="detail-gallery__empty">
							<span aria-hidden="true">CC</span>
							<p>As mídias aprovadas deste imóvel ainda não estão disponíveis.</p>
						</div>
					)}
				</section>
				<aside className="property-detail__summary">
					<p className="site-eyebrow">
						{labels[property.purpose]} · {property.city}
					</p>
					<h1>{property.title}</h1>
					<p className="property-detail__place">
						{property.neighborhood}, {property.city}
					</p>
					<div className="property-detail__price">{formatPropertyPrice(property)}</div>
					<div className="property-detail__status">
						<span>{status[property.dealStatus]}</span>
						<span className="cc-mono">Código {property.publicCode}</span>
					</div>
					{isReserved ? (
						<a
							className="cc-button cc-button--primary property-detail__cta"
							href={buildSimilarPropertiesUrl(property)}
						>
							<span>Ver imóveis semelhantes</span>
						</a>
					) : whatsappUrl ? (
						<a
							className="cc-button cc-button--primary property-detail__cta"
							href={whatsappUrl}
							target="_blank"
							rel="noreferrer"
						>
							<span>Quero conversar sobre este imóvel</span>
						</a>
					) : (
						<a
							className="cc-button cc-button--primary property-detail__cta"
							href="/contato"
						>
							<span>Falar comigo sobre este imóvel</span>
						</a>
					)}
					<p className="privacy-note">
						Eu preservo o endereço exato e compartilho os detalhes no atendimento.
					</p>
				</aside>
			</div>
			<section className="property-description">
				<div>
					<p className="site-eyebrow">O que vale saber</p>
					<h2>Conheça este imóvel</h2>
					<p>{property.description}</p>
				</div>
				<dl>
					{facts.map(([label, value]) => (
						<div key={String(label)}>
							<dt>{label}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			</section>
		</main>
	);
}
