import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/privacy";

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Privacidade | Cris Chaves" },
		{
			name: "description",
			content: "Entenda como o site de Cris Chaves protege informações e preferências.",
		},
	]);
}

export default function Privacy() {
	return (
		<main id="conteudo" className="legal-page cc-container">
			<header>
				<p className="site-eyebrow">Transparência desde o início</p>
				<h1>Como cuido da sua privacidade</h1>
				<p>O que é público, o que permanece protegido e quais dados este site utiliza.</p>
			</header>
			<article>
				<section>
					<h2>Catálogo público</h2>
					<p>
						Eu exibo somente os dados necessários para você conhecer o imóvel, como cidade
						e bairro. Endereço exato, dados de proprietários, notas internas e documentos
						permanecem protegidos.
					</p>
				</section>
				<section>
					<h2>Contatos</h2>
					<p>
						O formulário está desativado e não armazena dados. Antes de ativá-lo, esta
						página informará com clareza a finalidade, o destino, o acesso, a retenção e
						os direitos de quem entrar em contato.
					</p>
				</section>
				<section>
					<h2>Preferência de aparência</h2>
					<p>
						O navegador pode guardar localmente a preferência de tema e luminosidade. Essa
						escolha permanece no dispositivo e serve apenas para manter a interface
						escolhida.
					</p>
				</section>
				<section>
					<h2>Serviços externos</h2>
					<p>
						Vídeos, proteção antiabuso e canais externos só serão carregados quando
						necessários e após configuração aprovada. Links para terceiros seguem as
						políticas dos respectivos provedores.
					</p>
				</section>
				<section>
					<h2>Antes da publicação</h2>
					<p>
						Esta é uma versão preliminar e conservadora. A política definitiva será
						validada junto com o fluxo de contato, o domínio e os responsáveis antes do
						lançamento.
					</p>
				</section>
			</article>
		</main>
	);
}
