import { approvedRegions, regionEditorialContent } from "~/lib/public-site/config";
import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/regions";

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Regiões do Litoral Norte | Cris Chaves" },
		{
			name: "description",
			content:
				"Compare os imóveis disponíveis nas regiões atendidas por Cris Chaves no Litoral Norte Gaúcho.",
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
					<p className="site-eyebrow">Seu lugar no Litoral Norte</p>
					<h1>Cada região combina com um jeito diferente de viver.</h1>
					<p>
						Quer morar perto do mar, encontrar um imóvel para os fins de semana ou
						comparar oportunidades com mais calma? Comece pela região. Você vê somente os
						anúncios disponíveis em cada local e pode falar diretamente com o Cris quando
						quiser entender melhor uma opção.
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
					<h2 id="cc-regions-directory-title">Conheça as regiões atendidas</h2>
				</header>
				<div className="cc-regions-directory__grid">
					{approvedRegions.map((region, index) => (
						<article className="cc-regions-card" id={regionAnchor(region)} key={region}>
							<span className="cc-mono">{String(index + 1).padStart(2, "0")}</span>
							<h3>{region}</h3>
							<p>
								{regionEditorialContent[region].description ??
									`Está considerando ${region}? Veja os imóveis publicados e compare localização, características e finalidade antes de iniciar a conversa.`}
							</p>
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
						<p className="site-eyebrow">Escolha com calma</p>
						<h2>Ainda não sabe qual região escolher?</h2>
						<p>
							Conte ao Cris o tipo de imóvel que procura, como pretende usar e o que é
							importante na sua rotina. A conversa ajuda a organizar as opções sem obrigar
							você a decidir antes da hora.
						</p>
					</div>
					<a className="cc-button cc-button--primary" href="/contato">
						<span>Conversar sobre as regiões</span>
					</a>
				</div>
			</section>
		</main>
	);
}
