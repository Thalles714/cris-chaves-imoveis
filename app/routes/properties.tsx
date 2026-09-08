import { CatalogFilters, CatalogSearch, PublicPropertyCard } from "~/components/public";
import { EmptyState } from "~/components/ui";
import { cloudflareContext } from "~/lib/cloudflare-context";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";
import {
	InvalidCatalogQueryError,
	parsePublicCatalogSearch,
} from "~/modules/properties/server/public-query.server";
import { createPublicPropertyRepository } from "~/modules/properties/server/repository-factory.server";

import type { Route } from "./+types/properties";

export async function loader({ request, context }: Route.LoaderArgs) {
	const url = new URL(request.url);
	let query;
	try {
		query = parsePublicCatalogSearch(url);
	} catch (error) {
		if (error instanceof InvalidCatalogQueryError) {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw new Response("Filtros inválidos.", { status: 400 });
		}
		throw error;
	}
	const site = loadPublicSiteContext(request, context);
	const { repository } = createPublicPropertyRepository(
		request,
		context.get(cloudflareContext),
	);
	const catalog = await repository.listPublished(query);
	return { site, catalog, filters: Object.fromEntries(url.searchParams) };
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Imóveis no Litoral Norte Gaúcho | Cris Chaves" },
		{
			name: "description",
			content:
				"Busque e filtre os imóveis publicados por Cris Chaves no Litoral Norte Gaúcho.",
		},
	]);
}

function pageHref(filters: Record<string, string>, page: number) {
	const params = new URLSearchParams(filters);
	if (page === 1) params.delete("pagina");
	else params.set("pagina", String(page));
	const query = params.toString();
	return query ? `/?${query}` : "/";
}

export default function Properties({ loaderData }: Route.ComponentProps) {
	const { site, catalog, filters } = loaderData;
	const totalPages = Math.max(1, Math.ceil(catalog.totalItems / catalog.pageSize));
	const searchTerm = filters.busca?.trim();
	const resultTitle =
		catalog.totalItems === 1
			? "Encontrei 1 imóvel"
			: `Encontrei ${catalog.totalItems} imóveis`;

	return (
		<main id="conteudo" className="cc-catalog">
			<header className="cc-catalog-toolbar">
				<div className="cc-catalog-toolbar__inner">
					<div className="cc-catalog-toolbar__intro">
						<p className="site-eyebrow">Litoral Norte Gaúcho</p>
						<h1>Imóveis</h1>
					</div>
					<CatalogSearch filters={filters} />
					<CatalogFilters filters={filters} regions={site.regions} />
				</div>
			</header>

			<section
				className="cc-catalog-results cc-container"
				aria-labelledby="catalog-title"
			>
				<div className="catalog-results__heading" aria-live="polite">
					<div>
						<p className="site-eyebrow">
							{searchTerm ? `Sua busca · “${searchTerm}”` : "Seleção publicada"}
						</p>
						<h2 id="catalog-title">{resultTitle}</h2>
					</div>
					<span className="cc-mono">
						Página {catalog.page} de {totalPages}
					</span>
				</div>

				{catalog.items.length ? (
					<div className="property-grid property-grid--catalog">
						{catalog.items.map((property) => (
							<PublicPropertyCard key={property.publicCode} property={property} />
						))}
					</div>
				) : (
					<EmptyState
						title="Ainda não encontrei um imóvel para esta busca"
						description="Tente descrever com menos detalhes ou limpe os filtros. Se preferir, fale comigo e eu acompanho a procura pessoalmente."
						action={
							<a className="cc-button cc-button--secondary" href="/">
								<span>Limpar filtros</span>
							</a>
						}
					/>
				)}

				{totalPages > 1 && (
					<nav className="catalog-pagination" aria-label="Paginação do catálogo">
						{catalog.page > 1 && (
							<a href={pageHref(filters, catalog.page - 1)}>← Anterior</a>
						)}
						<span>
							Página {catalog.page} de {totalPages}
						</span>
						{catalog.page < totalPages && (
							<a href={pageHref(filters, catalog.page + 1)}>Próxima →</a>
						)}
					</nav>
				)}
			</section>
		</main>
	);
}
