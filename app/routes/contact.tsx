import { buildWhatsAppUrl } from "~/lib/public-site/config";
import { loadPublicSiteContext } from "~/lib/public-site/loader.server";
import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/contact";

export function loader({ request, context }: Route.LoaderArgs) {
	return loadPublicSiteContext(request, context);
}

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Contato direto com Cris Chaves" },
		{
			name: "description",
			content:
				"Escolha o assunto e converse diretamente com Cris Chaves pelo WhatsApp sobre imóveis no Litoral Norte Gaúcho.",
		},
	]);
}

const contactOptions = [
	{
		title: "Quero encontrar um imóvel",
		description: "Conte a região, o tipo de imóvel e o que é importante para você.",
		message: "Olá, Cris. Quero ajuda para encontrar um imóvel no Litoral Norte.",
	},
	{
		title: "Quero falar sobre um anúncio",
		description:
			"Envie o link ou o código do imóvel para que ele seja identificado rapidamente.",
		message: "Olá, Cris. Tenho interesse no imóvel [código ou link].",
	},
	{
		title: "Quero anunciar meu imóvel",
		description: "Diga a cidade e se pretende vender ou alugar.",
		message: "Olá, Cris. Quero conversar sobre anunciar um imóvel em [cidade].",
	},
] as const;

export default function Contact({ loaderData: site }: Route.ComponentProps) {
	return (
		<main id="conteudo" className="cc-regions">
			<header className="page-hero">
				<div className="cc-container contact-intro">
					<div>
						<p className="site-eyebrow">Fale diretamente com o Cris</p>
						<h1>Qual é o próximo passo que você quer organizar?</h1>
					</div>
					<p>
						Escolha o assunto e continue pelo WhatsApp. Você pode chegar com uma decisão
						pronta, um código de imóvel ou apenas uma dúvida inicial.
					</p>
				</div>
			</header>

			<section
				className="site-section cc-container cc-regions-directory cc-contact-options"
				aria-labelledby="contact-options-title"
			>
				<header className="cc-regions-section-heading">
					<p className="site-eyebrow">Escolha o assunto</p>
					<h2 id="contact-options-title">Comece pela conversa certa</h2>
				</header>
				<div className="cc-regions-directory__grid">
					{contactOptions.map((option, index) => {
						const whatsappUrl = buildWhatsAppUrl(site.whatsappNumber, {
							message: option.message,
						});
						return (
							<article className="cc-regions-card" key={option.title}>
								<span className="cc-mono">{String(index + 1).padStart(2, "0")}</span>
								<h3>{option.title}</h3>
								<p>{option.description}</p>
								{whatsappUrl && (
									<a
										className="text-link"
										href={whatsappUrl}
										target="_blank"
										rel="noreferrer"
									>
										Continuar pelo WhatsApp <span aria-hidden="true">→</span>
									</a>
								)}
							</article>
						);
					})}
				</div>
				<p className="cc-contact-options__privacy" id="canais">
					Você será direcionado ao WhatsApp e decide quais informações deseja
					compartilhar. Nenhum dado é armazenado em formulário neste site.
				</p>
			</section>
		</main>
	);
}
