import { publicMeta } from "~/lib/public-site/meta";

import type { Route } from "./+types/terms";

export function meta({ matches }: Route.MetaArgs) {
	return publicMeta(matches, [
		{ title: "Termos de uso | Cris Chaves" },
		{
			name: "description",
			content: "Condições para navegar e consultar imóveis no site de Cris Chaves.",
		},
	]);
}

export default function Terms() {
	return (
		<main id="conteudo" className="legal-page cc-container">
			<header>
				<p className="site-eyebrow">Uma relação clara</p>
				<h1>Termos de uso</h1>
				<p>O que você pode esperar ao navegar, pesquisar e consultar um imóvel.</p>
			</header>
			<article>
				<section>
					<h2>Finalidade do site</h2>
					<p>
						Este site apresenta meu trabalho e os anúncios imobiliários publicados.
						Navegar ou entrar em contato não cria compromisso de compra, venda, aluguel ou
						prestação de serviço.
					</p>
				</section>
				<section>
					<h2>Informações dos imóveis</h2>
					<p>
						Preço, disponibilidade e características podem ser atualizados. A confirmação
						ocorre no atendimento, antes de qualquer decisão. O endereço exato não é
						divulgado no catálogo.
					</p>
				</section>
				<section>
					<h2>Conteúdo e mídias</h2>
					<p>
						Somente anúncios e mídias aprovados são exibidos. Não é permitido reutilizar o
						conteúdo do site de modo que viole direitos de terceiros ou apresente
						informações fora de contexto.
					</p>
				</section>
				<section>
					<h2>Links externos</h2>
					<p>
						Ao abrir um canal de mensagem ou vídeo externo, o visitante passa a usar o
						serviço do respectivo provedor.
					</p>
				</section>
				<section>
					<h2>Antes da publicação</h2>
					<p>
						Esta minuta deverá ser validada junto com os dados profissionais, os canais
						públicos e a política de privacidade antes do lançamento.
					</p>
				</section>
			</article>
		</main>
	);
}
