import { ContactForm } from "~/components/public";
import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";

import { disabledContactAction } from "./contact-action.server";
import type { Route } from "./+types/sell";

export function loader({ request, context }: Route.LoaderArgs) {
	return loadPublicSiteContext(request, context);
}

export function action() {
	return disabledContactAction();
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Anuncie seu imóvel | Cris Chaves" },
		{
			name: "description",
			content:
				"Converse com Cris Chaves para organizar e apresentar seu imóvel no Litoral Norte Gaúcho com clareza e cuidado.",
		},
	]);
}

export default function Sell({ loaderData: site }: Route.ComponentProps) {
	const whatsappUrl = buildWhatsAppUrl(site.whatsappNumber);

	return (
		<main id="conteudo" className="cc-sell">
			<header className="cc-sell-hero">
				<div className="cc-container cc-sell-hero__grid">
					<div className="cc-sell-hero__copy">
						<p className="site-eyebrow">Para proprietários</p>
						<h1>Seu imóvel merece uma apresentação clara desde o início.</h1>
						<p>
							Conte ao Cris o que você pretende vender ou alugar. A conversa começa pelas
							informações essenciais e avança somente com o que estiver alinhado com você.
						</p>
						<a
							className="cc-button cc-button--primary"
							href={whatsappUrl ?? "/contato"}
							target={whatsappUrl ? "_blank" : undefined}
							rel={whatsappUrl ? "noreferrer" : undefined}
						>
							<span>{whatsappUrl ? "Conversar pelo WhatsApp" : "Entrar em contato"}</span>
						</a>
					</div>
					<aside className="cc-sell-hero__note" aria-label="Antes de publicar">
						<span className="cc-mono">Antes de publicar</span>
						<p>
							Informações, disponibilidade e mídias são organizadas antes do anúncio. O
							endereço exato não precisa ficar público.
						</p>
					</aside>
				</div>
			</header>

			<section
				className="site-section cc-container cc-sell-benefits"
				aria-labelledby="cc-sell-benefits-title"
			>
				<header className="cc-sell-section-heading">
					<p className="site-eyebrow">O que você pode esperar</p>
					<h2 id="cc-sell-benefits-title">Cuidado prático em cada informação.</h2>
				</header>
				<div className="cc-sell-benefits__grid">
					<article>
						<span className="cc-mono">01</span>
						<h3>Contexto antes do anúncio</h3>
						<p>Objetivo, características e disponibilidade são alinhados na conversa.</p>
					</article>
					<article>
						<span className="cc-mono">02</span>
						<h3>Apresentação organizada</h3>
						<p>Textos e mídias são reunidos para apresentar o imóvel com clareza.</p>
					</article>
					<article>
						<span className="cc-mono">03</span>
						<h3>Privacidade no catálogo</h3>
						<p>O anúncio público informa a região sem revelar o endereço exato.</p>
					</article>
				</div>
			</section>

			<section
				className="site-section site-section--ink cc-sell-process"
				aria-labelledby="cc-sell-process-title"
			>
				<div className="cc-container cc-sell-process__grid">
					<header>
						<p className="site-eyebrow">Etapas</p>
						<h2 id="cc-sell-process-title">Da conversa inicial à publicação.</h2>
						<p>Cada etapa deixa claro o que precisa ser decidido antes da próxima.</p>
					</header>
					<ol>
						<li>
							<span>01</span>
							<div>
								<h3>Você apresenta o imóvel</h3>
								<p>Compartilha localização aproximada, características e objetivo.</p>
							</div>
						</li>
						<li>
							<span>02</span>
							<div>
								<h3>As informações são organizadas</h3>
								<p>Preço, disponibilidade e dados públicos são alinhados com você.</p>
							</div>
						</li>
						<li>
							<span>03</span>
							<div>
								<h3>As mídias são selecionadas</h3>
								<p>Fotos e vídeos entram no catálogo depois de revisados.</p>
							</div>
						</li>
						<li>
							<span>04</span>
							<div>
								<h3>O anúncio é apresentado</h3>
								<p>
									O imóvel é publicado com os dados aprovados para receber interessados.
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
					<p className="site-eyebrow">Vamos começar</p>
					<h2 id="cc-sell-contact-title">Apresente o básico sobre o seu imóvel.</h2>
					<p>
						O WhatsApp é o canal disponível para iniciar a conversa agora, sem cadastro e
						sem deixar seus dados em um formulário intermediário.
					</p>
					<a
						className="cc-button cc-button--primary"
						href={whatsappUrl ?? "/contato"}
						target={whatsappUrl ? "_blank" : undefined}
						rel={whatsappUrl ? "noreferrer" : undefined}
					>
						<span>{whatsappUrl ? "Falar com o Cris" : "Ver canais de contato"}</span>
					</a>
				</div>
				{site.contactFormAvailable ? null : (
					<div className="cc-sell-contact__form">
						<ContactForm intent="sell" whatsappUrl={whatsappUrl} />
					</div>
				)}
			</section>
		</main>
	);
}
