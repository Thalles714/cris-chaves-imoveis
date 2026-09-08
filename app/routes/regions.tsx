import { approvedRegions } from "~/lib/public-site/config";
import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/regions";

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Regiões de atuação | Cris Chaves" },
		{
			name: "description",
			content:
				"Explore imóveis em Cidreira, Tramandaí, Balneário Pinhal, Magistério e Quintão no catálogo de Cris Chaves.",
		},
	]);
}

function catalogHref(name: string) {
	return `/?${new URLSearchParams({ cidade: name }).toString()}`;
}

function regionAnchor(name: string) {
	return `regiao-${name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, "-")}`;
}

export default function Regions() {
	return (
		<main id="conteudo" className="cc-regions">
			<header className="cc-regions-hero">
				<div className="cc-container cc-regions-hero__inner">
					<p className="site-eyebrow">Onde o Cris atua</p>
					<h1>Encontre imóveis por região no Litoral Norte Gaúcho.</h1>
					<p>
						Escolha uma das regiões atendidas para abrir o catálogo com o filtro já
						aplicado.
					</p>
				</div>
			</header>

			<nav className="cc-container cc-regions-jump" aria-label="Ir para uma região">
				{approvedRegions.map((region) => (
					<a href={`#${regionAnchor(region)}`} key={region}>
						{region}
					</a>
				))}
			</nav>

			<section
				className="site-section cc-container cc-regions-directory"
				aria-labelledby="cc-regions-directory-title"
			>
				<header className="cc-regions-section-heading">
					<p className="site-eyebrow">Diretório</p>
					<h2 id="cc-regions-directory-title">Todas as regiões atendidas.</h2>
				</header>
				<div className="cc-regions-directory__grid">
					{approvedRegions.map((region, index) => (
						<article className="cc-regions-card" id={regionAnchor(region)} key={region}>
							<span className="cc-mono">{String(index + 1).padStart(2, "0")}</span>
							<h3>{region}</h3>
							<p>Consulte os anúncios publicados com esta região selecionada.</p>
							<a className="text-link" href={catalogHref(region)}>
								Ver imóveis em {region} <span aria-hidden="true">→</span>
							</a>
						</article>
					))}
				</div>
			</section>

			<section className="site-section cc-regions-cta">
				<div className="cc-container cc-regions-cta__inner">
					<div>
						<p className="site-eyebrow">Catálogo completo</p>
						<h2>Prefere comparar todas as regiões?</h2>
					</div>
					<a className="cc-button cc-button--primary" href="/">
						<span>Ver todos os imóveis</span>
					</a>
				</div>
			</section>
		</main>
	);
}
