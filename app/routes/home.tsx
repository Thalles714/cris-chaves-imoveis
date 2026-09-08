import { PublicPropertyCard, RevealObserver } from "~/components/public";
import { EmptyState, SearchIcon } from "~/components/ui";
import { cloudflareContext } from "~/lib/cloudflare-context";
import { useCspNonce } from "~/lib/http/csp-nonce";
import { approvedRegions } from "~/lib/public-site/config";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";
import { createPublicPropertyRepository } from "~/modules/properties/server/repository-factory.server";

import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
	const cloudflare = context.get(cloudflareContext);
	const site = loadPublicSiteContext(request, context);
	const { repository } = createPublicPropertyRepository(request, cloudflare);
	const featured = await repository.listPublished({ page: 1, pageSize: 3 });
	return { site, featured };
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Conheça Cris Chaves | Imóveis no Litoral Norte Gaúcho" },
		{
			name: "description",
			content:
				"Conheça o atendimento de Cris Chaves para encontrar, comprar, alugar ou anunciar imóveis no Litoral Norte Gaúcho.",
		},
		{
			property: "og:title",
			content: "Conheça Cris Chaves | Imóveis no Litoral Norte Gaúcho",
		},
	]);
}

function catalogHref(name: string) {
	return `/?${new URLSearchParams({ cidade: name }).toString()}`;
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { site, featured } = loaderData;
	const cspNonce = useCspNonce();
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "RealEstateAgent",
		name: site.brandName,
		url: site.canonicalUrl,
		areaServed: site.regions.map((name) => ({ "@type": "City", name })),
	};

	return (
		<main id="conteudo" className="cc-home">
			<RevealObserver />
			<section className="cc-home-hero" aria-labelledby="cc-home-title">
				<svg
					className="cc-home-hero__coastline"
					viewBox="0 0 1440 420"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path d="M-60 280C90 190 165 335 330 238S560 120 720 222s265 144 410 34 260-62 380-8" />
					<path d="M-40 330c180-92 262 30 410-36s220-122 365-42 260 110 390 18 270-74 390-18" />
					<path
						className="cc-home-hero__coastline-accent"
						d="M-30 300c155-70 250 54 400-28s225-110 370-24 255 104 392 12 260-54 350-26"
					/>
				</svg>
				<div className="cc-container cc-home-hero__inner">
					<div className="cc-home-hero__copy cc-home-reveal">
						<p className="site-eyebrow">Cris Chaves · Corretor de imóveis</p>
						<h1 id="cc-home-title">
							Seu lugar no litoral começa por uma busca mais clara.
						</h1>
						<p className="cc-home-hero__lede">
							Encontre imóveis no Litoral Norte Gaúcho e conte comigo para organizar as
							opções, esclarecer dúvidas e conduzir o próximo passo.
						</p>
					</div>

					<form
						className="cc-home-search cc-home-reveal"
						action="/"
						method="get"
						aria-label="Buscar imóveis"
					>
						<label className="cc-home-search__field">
							<SearchIcon />
							<span className="visually-hidden">Descreva o imóvel que procura</span>
							<input
								name="busca"
								placeholder="Cidade, bairro ou característica"
								minLength={2}
								maxLength={160}
								autoComplete="off"
							/>
						</label>
						<button className="cc-button cc-button--primary" type="submit">
							<SearchIcon />
							<span>Buscar imóveis</span>
						</button>
					</form>

					<nav
						className="cc-home-hero__shortcuts cc-home-reveal"
						aria-label="Atalhos de busca"
					>
						<a href="/?busca=casa+perto+do+mar">Perto do mar</a>
						<a href="/?finalidade=venda">Para comprar</a>
						<a href="/?finalidade=aluguel">Para alugar</a>
					</nav>
				</div>
			</section>

			<section
				className="site-section cc-container cc-home-featured"
				aria-labelledby="cc-home-featured-title"
			>
				<header className="cc-home-section-heading cc-home-reveal">
					<p className="site-eyebrow">Imóveis em destaque</p>
					<h2 id="cc-home-featured-title">Uma seleção para começar a explorar.</h2>
					<p>
						Anúncios publicados com as informações necessárias para comparar as opções
						antes de conversar.
					</p>
				</header>
				{featured.items.length ? (
					<>
						<div className="property-grid cc-home-featured__grid">
							{featured.items.map((property) => (
								<div className="cc-home-reveal" key={property.publicCode}>
									<PublicPropertyCard property={property} />
								</div>
							))}
						</div>
						<a className="text-link cc-home-featured__link" href="/">
							Ver catálogo completo <span aria-hidden="true">→</span>
						</a>
					</>
				) : (
					<EmptyState
						title="O catálogo está sendo preparado"
						description="Enquanto os anúncios não chegam, você pode apresentar seu imóvel ou falar diretamente com o Cris."
						action={
							<a className="cc-button cc-button--secondary" href="/anuncie-seu-imovel">
								<span>Quero anunciar</span>
							</a>
						}
					/>
				)}
			</section>

			<section
				className="site-section cc-home-paths"
				aria-labelledby="cc-home-paths-title"
			>
				<div className="cc-container">
					<header className="cc-home-section-heading cc-home-section-heading--center cc-home-reveal">
						<p className="site-eyebrow">Dois caminhos, o mesmo cuidado</p>
						<h2 id="cc-home-paths-title">Escolha de que lado da conversa você está.</h2>
					</header>
					<div className="cc-home-paths__grid">
						<article className="cc-home-path-card cc-home-reveal">
							<span className="cc-mono">Comprar ou alugar</span>
							<h3>Compare opções com o contexto que importa.</h3>
							<p>
								Use o catálogo para filtrar a busca e abra cada anúncio para entender suas
								características. Quando quiser, leve o código do imóvel para a conversa.
							</p>
							<a className="text-link" href="/">
								Explorar imóveis <span aria-hidden="true">→</span>
							</a>
						</article>
						<article className="cc-home-path-card cc-home-reveal">
							<span className="cc-mono">Vender ou alugar</span>
							<h3>Apresente seu imóvel com informação clara.</h3>
							<p>
								Conte o essencial primeiro. O Cris ajuda a organizar as informações e as
								mídias antes de qualquer publicação.
							</p>
							<a className="text-link" href="/anuncie-seu-imovel">
								Conhecer o processo <span aria-hidden="true">→</span>
							</a>
						</article>
					</div>
				</div>
			</section>

			<section
				className="site-section site-section--ink cc-home-process"
				aria-labelledby="cc-home-process-title"
			>
				<div className="cc-container cc-home-process__grid">
					<header className="cc-home-reveal">
						<p className="site-eyebrow">Como funciona</p>
						<h2 id="cc-home-process-title">Da primeira busca à conversa certa.</h2>
					</header>
					<ol className="cc-home-process__steps">
						<li className="cc-home-reveal">
							<strong>01</strong>
							<div>
								<h3>Explore</h3>
								<p>
									Busque por região e pelas características que fazem sentido para você.
								</p>
							</div>
						</li>
						<li className="cc-home-reveal">
							<strong>02</strong>
							<div>
								<h3>Compare</h3>
								<p>Consulte os detalhes públicos sem depender do endereço exato.</p>
							</div>
						</li>
						<li className="cc-home-reveal">
							<strong>03</strong>
							<div>
								<h3>Converse</h3>
								<p>Compartilhe o link ou o código do anúncio para avançar com clareza.</p>
							</div>
						</li>
					</ol>
				</div>
			</section>

			<section
				className="site-section cc-container cc-home-regions"
				aria-labelledby="cc-home-regions-title"
			>
				<header className="cc-home-section-heading cc-home-section-heading--center cc-home-reveal">
					<p className="site-eyebrow">Litoral Norte Gaúcho</p>
					<h2 id="cc-home-regions-title">Explore pelas regiões onde o Cris atua.</h2>
				</header>
				<nav className="cc-home-regions__list" aria-label="Imóveis por região">
					{approvedRegions.map((region) => (
						<a
							className="cc-home-region-card cc-home-reveal"
							href={catalogHref(region)}
							key={region}
						>
							<span>{region}</span>
							<span aria-hidden="true">→</span>
						</a>
					))}
				</nav>
				<a className="text-link cc-home-regions__directory" href="/regioes">
					Conhecer todas as regiões <span aria-hidden="true">→</span>
				</a>
			</section>

			<section className="site-section cc-home-final-cta">
				<div className="cc-container cc-home-final-cta__inner cc-home-reveal">
					<div>
						<p className="site-eyebrow">Seu próximo passo</p>
						<h2>Encontre um imóvel ou prepare o seu para anunciar.</h2>
					</div>
					<div className="cc-home-final-cta__actions">
						<a className="cc-button cc-button--primary" href="/">
							<span>Ver imóveis</span>
						</a>
						<a className="cc-button cc-button--ghost" href="/anuncie-seu-imovel">
							<span>Quero anunciar</span>
						</a>
					</div>
				</div>
			</section>

			<script
				nonce={cspNonce}
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData).replace(/</gu, "\\u003c"),
				}}
			/>
		</main>
	);
}
