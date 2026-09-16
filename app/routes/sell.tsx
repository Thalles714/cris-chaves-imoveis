import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/sell";

export function loader({ request, context }: Route.LoaderArgs) {
	return loadPublicSiteContext(request, context);
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Anuncie seu imóvel | Cris Chaves" },
		{
			name: "description",
			content:
				"Converse com Cris Chaves sobre vender ou alugar seu imóvel no Litoral Norte, com informações e mídias alinhadas antes da publicação.",
		},
	]);
}

export default function Sell({ loaderData: site }: Route.ComponentProps) {
	const whatsappUrl = buildWhatsAppUrl(site.whatsappNumber, {
		message: "Olá, Cris. Quero conversar sobre vender ou alugar meu imóvel.",
	});

	return (
		<main id="conteudo" className="cc-sell">
			<header className="cc-sell-hero">
				<div className="cc-container cc-sell-hero__grid">
					<div className="cc-sell-hero__copy">
						<p className="site-eyebrow">Para proprietários</p>
						<h1>
							Quer vender ou alugar? Comece contando o que você espera do seu imóvel.
						</h1>
						<p>
							Antes de publicar qualquer informação, o Cris entende seu objetivo, conhece
							as características do imóvel e combina com você o que poderá aparecer no
							anúncio.
						</p>
						{whatsappUrl ? (
							<a
								className="cc-button cc-button--primary"
								href={whatsappUrl}
								target="_blank"
								rel="noreferrer"
							>
								Quero conversar sobre meu imóvel
							</a>
						) : (
							<a className="cc-button cc-button--primary" href="/contato">
								Ver canais de contato
							</a>
						)}
					</div>
					<aside className="cc-sell-hero__note" aria-label="Privacidade do anúncio">
						<span className="cc-mono">Privacidade desde o início</span>
						<p>
							O catálogo mostra a região e as informações necessárias para apresentar o
							imóvel. Endereço exato, contato do proprietário e anotações internas não são
							publicados.
						</p>
					</aside>
				</div>
			</header>

			<section
				className="site-section site-section--ink cc-sell-process"
				aria-labelledby="cc-sell-process-title"
			>
				<div className="cc-container cc-sell-process__grid">
					<header>
						<p className="site-eyebrow">Etapas</p>
						<h2 id="cc-sell-process-title">O que acontece depois do primeiro contato</h2>
					</header>
					<ol>
						<li>
							<span>01</span>
							<div>
								<h3>Você apresenta o imóvel</h3>
								<p>
									Informe a cidade, o tipo de imóvel, se pretende vender ou alugar e as
									principais características. Não é necessário ter tudo organizado para
									começar.
								</p>
							</div>
						</li>
						<li>
							<span>02</span>
							<div>
								<h3>As informações são conferidas</h3>
								<p>
									Preço, disponibilidade, descrição e demais dados são alinhados antes da
									publicação.
								</p>
							</div>
						</li>
						<li>
							<span>03</span>
							<div>
								<h3>Fotos e vídeos são revisados</h3>
								<p>
									Somente mídias autorizadas e adequadas para divulgação entram no
									catálogo.
								</p>
							</div>
						</li>
						<li>
							<span>04</span>
							<div>
								<h3>O anúncio é publicado após alinhamento</h3>
								<p>
									O conteúdo público apresenta o imóvel sem expor o endereço exato ou
									informações internas.
								</p>
							</div>
						</li>
					</ol>
				</div>
			</section>

			<section
				className="site-section cc-container cc-sell-contact"
				aria-labelledby="cc-sell-contact-title"
			>
				<div className="cc-sell-contact__intro">
					<p className="site-eyebrow">Antes de conversar</p>
					<h2 id="cc-sell-contact-title">O que ajuda a iniciar a conversa</h2>
					<ul className="cc-sell-checklist">
						<li>Cidade ou região do imóvel.</li>
						<li>Venda ou aluguel.</li>
						<li>Tipo do imóvel.</li>
						<li>Principais características.</li>
						<li>Fotos disponíveis, se houver.</li>
						<li>Dúvida ou expectativa principal.</li>
					</ul>
				</div>
				<div className="cc-sell-contact__privacy">
					<p>
						O catálogo mostra a região e as informações necessárias para apresentar o
						imóvel. Endereço exato, contato do proprietário e anotações internas não são
						publicados.
					</p>
					{whatsappUrl ? (
						<a
							className="cc-button cc-button--primary"
							href={whatsappUrl}
							target="_blank"
							rel="noreferrer"
						>
							Apresentar meu imóvel pelo WhatsApp
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
