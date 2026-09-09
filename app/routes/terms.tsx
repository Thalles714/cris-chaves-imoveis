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
				<p>Última atualização: 9 de setembro de 2026.</p>
			</header>
			<article>
				<section>
					<h2>Responsável pelo site</h2>
					<p>
						Este site é operado por Cris Chaves Corretor de Imóveis. A identificação
						profissional vigente aparece no cabeçalho e no rodapé. Ao navegar, você
						concorda em usar o conteúdo de forma lícita e de acordo com estes termos.
					</p>
				</section>
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
					<p>
						Anúncios identificados como demonstrativos usam dados de avaliação e não
						constituem oferta de imóvel. As imagens publicadas recebem a marca d'água
						“Cris Chaves”.
					</p>
				</section>
				<section>
					<h2>Uso permitido</h2>
					<p>
						Você pode pesquisar, consultar e compartilhar os links públicos dos anúncios.
						É proibido tentar acessar a área administrativa, contornar controles de
						segurança, automatizar tráfego abusivo ou interferir no funcionamento do site.
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
					<h2>Privacidade</h2>
					<p>
						O tratamento de informações relacionado ao uso do site é explicado no
						<a href="/privacidade"> Aviso de privacidade</a>.
					</p>
				</section>
				<section>
					<h2>Alterações e contato</h2>
					<p>
						Estes termos podem ser atualizados quando o serviço mudar. A versão vigente e
						sua data permanecem nesta página. Para dúvidas, use a
						<a href="/contato"> página de contato</a>.
					</p>
				</section>
			</article>
		</main>
	);
}
