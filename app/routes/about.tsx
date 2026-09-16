import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/about";

export function loader({ request, context }: Route.LoaderArgs) {
	return loadPublicSiteContext(request, context);
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Sobre Cris Chaves | Corretor no Litoral Norte" },
		{
			name: "description",
			content:
				"Conheça a forma de atendimento de Cris Chaves para comprar, alugar ou anunciar imóveis no Litoral Norte Gaúcho.",
		},
	]);
}

export default function About({ loaderData: site }: Route.ComponentProps) {
	const whatsappUrl = buildWhatsAppUrl(site.whatsappNumber);

	return (
		<main id="conteudo" className="cc-sell">
			<section className="about-hero page-hero">
				<div className="cc-container about-hero__grid">
					<div>
						<p className="site-eyebrow">Prazer, sou o Cris</p>
						<h1>
							Uma decisão importante pede alguém que escute antes de mostrar opções.
						</h1>
					</div>
					<div className="about-hero__statement">
						<p>
							Atendo pessoas que querem comprar, alugar ou anunciar imóveis em Cidreira,
							Tramandaí, Balneário Pinhal, Magistério e Quintão. Meu papel é entender o
							que você procura, apresentar as informações com clareza e ajudar a tornar o
							próximo passo mais simples.
						</p>
					</div>
				</div>
			</section>

			{/* Pendência editorial: foto e biografia só entram após material aprovado. */}
			<section
				className="site-section cc-container cc-sell-benefits"
				aria-labelledby="como-trabalho-title"
			>
				<header className="cc-sell-section-heading">
					<p className="site-eyebrow">Atendimento pessoal</p>
					<h2 id="como-trabalho-title">Como eu trabalho</h2>
				</header>
				<div className="cc-sell-benefits__grid">
					<article>
						<span className="cc-mono">01</span>
						<h3>Primeiro, eu entendo o contexto</h3>
						<p>
							Antes de falar em imóveis, quero saber o que você precisa, como pretende
							usar o imóvel e quais pontos realmente importam para você.
						</p>
					</article>
					<article>
						<span className="cc-mono">02</span>
						<h3>Depois, organizamos as opções</h3>
						<p>
							Você recebe informações objetivas para comparar os imóveis publicados e
							perguntar o que ainda não ficou claro.
						</p>
					</article>
					<article>
						<span className="cc-mono">03</span>
						<h3>A conversa continua no seu ritmo</h3>
						<p>
							Sem atendimento impessoal ou pressão para decidir. O próximo passo acontece
							quando fizer sentido para você.
						</p>
					</article>
				</div>
			</section>

			<section
				className="certification-fold cc-container"
				aria-labelledby="atuacao-title"
			>
				<div className="certification-fold__mark" aria-hidden="true">
					CC
				</div>
				<div>
					<p className="site-eyebrow">Onde eu atuo</p>
					<h2 id="atuacao-title">Atendimento no Litoral Norte Gaúcho</h2>
					<p>
						Minha atuação está concentrada em Cidreira, Tramandaí, Balneário Pinhal,
						Magistério e Quintão. Esse recorte deixa claro onde posso acompanhar sua busca
						ou conversar sobre o seu imóvel.
					</p>
					<p>
						<strong>Cris Chaves — Corretor de Imóveis</strong>
						{site.creci && (
							<>
								<br />
								{site.creci}
							</>
						)}
					</p>
					<p>
						Os anúncios publicados utilizam somente as informações autorizadas para
						divulgação. Dados como endereço exato, contato do proprietário e observações
						internas permanecem fora do catálogo público.
					</p>
					{whatsappUrl ? (
						<a
							className="cc-button cc-button--primary"
							href={whatsappUrl}
							target="_blank"
							rel="noreferrer"
						>
							Falar diretamente com o Cris
						</a>
					) : (
						<a className="text-link" href="/contato">
							Ver canais de contato <span aria-hidden="true">→</span>
						</a>
					)}
				</div>
			</section>
		</main>
	);
}
