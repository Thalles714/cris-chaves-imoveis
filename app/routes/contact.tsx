import { ContactForm } from "~/components/public";
import { publicMeta } from "~/lib/public-site/meta";

import { disabledContactAction } from "./contact-action.server";
import type { Route } from "./+types/contact";

export function action() {
	return disabledContactAction();
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Contato | Cris Chaves" },
		{
			name: "description",
			content: "Fale diretamente com Cris Chaves sobre imóveis no Litoral Norte Gaúcho.",
		},
	]);
}

export default function Contact() {
	return (
		<main id="conteudo">
			<header className="page-hero">
				<div className="cc-container contact-intro">
					<div>
						<p className="site-eyebrow">Fale comigo</p>
						<h1>Quero entender o que faz sentido para você.</h1>
					</div>
					<p>
						Pode chegar com uma ideia pronta ou apenas com as primeiras dúvidas. Eu ajudo
						a organizar a busca e o próximo passo.
					</p>
				</div>
			</header>
			<section className="site-section cc-container contact-layout">
				<div className="contact-layout__aside">
					<p className="site-eyebrow">Onde eu atuo</p>
					<h2>Perto de você no Litoral Norte Gaúcho</h2>
					<p>Cidreira · Tramandaí · Balneário Pinhal · Magistério · Quintão</p>
					<div className="contact-code-note">
						<span className="cc-mono">Já encontrou um imóvel?</span>
						<p>
							Envie o link ou o código do anúncio. Assim eu identifico a opção rapidamente
							sem expor o endereço exato.
						</p>
					</div>
				</div>
				<ContactForm intent="general" />
			</section>
		</main>
	);
}
