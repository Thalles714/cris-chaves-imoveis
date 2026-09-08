import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/about";

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Sobre Cris | Cris Chaves" },
		{
			name: "description",
			content:
				"Conheça o atendimento pessoal de Cris Chaves para comprar, alugar ou anunciar imóveis no Litoral Norte Gaúcho.",
		},
	]);
}

export default function About() {
	return (
		<main id="conteudo">
			<section className="about-hero page-hero">
				<div className="cc-container about-hero__grid">
					<div>
						<p className="site-eyebrow">Prazer, sou o Cris</p>
						<h1>Seu próximo imóvel começa com uma boa conversa.</h1>
					</div>
					<div className="about-hero__statement">
						<p>
							Meu trabalho está concentrado em Cidreira, Tramandaí, Balneário Pinhal,
							Magistério e Quintão. É aqui que acompanho oportunidades e pessoas.
						</p>
						<p>
							Quero que você entenda cada opção com clareza e se sinta à vontade para
							perguntar. Comprar, alugar ou anunciar um imóvel é uma decisão importante —
							e não precisa ser uma experiência impessoal.
						</p>
					</div>
				</div>
			</section>
			<section
				className="certification-fold cc-container"
				aria-labelledby="certificacao-title"
			>
				<div className="certification-fold__mark" aria-hidden="true">
					CC
				</div>
				<div>
					<p className="site-eyebrow">Meu compromisso</p>
					<h2 id="certificacao-title">Informação clara, cuidado e responsabilidade.</h2>
					<p>
						Eu apresento somente anúncios autorizados e preservo informações que não
						precisam ser públicas. Meu registro profissional acompanha a marca para que
						você saiba com quem está falando desde o primeiro contato.
					</p>
					<a className="text-link" href="/contato">
						Falar comigo <span aria-hidden="true">→</span>
					</a>
				</div>
			</section>
		</main>
	);
}
