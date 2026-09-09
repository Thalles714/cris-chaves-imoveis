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
				<p className="site-eyebrow">Privacidade e transparência</p>
				<h1>Aviso de privacidade</h1>
				<p>Última atualização: 9 de setembro de 2026.</p>
			</header>
			<article>
				<section>
					<h2>Responsável pelo site</h2>
					<p>
						Cris Chaves Corretor de Imóveis é responsável por este site. A identificação
						profissional vigente aparece no cabeçalho e no rodapé. Dúvidas e solicitações
						sobre privacidade podem ser encaminhadas pela
						<a href="/contato"> página de contato</a>.
					</p>
				</section>
				<section>
					<h2>Dados dos anúncios</h2>
					<p>
						O catálogo mostra somente as informações aprovadas para divulgação, como
						cidade, bairro, características, descrição, situação e mídias tratadas.
						Endereço exato, contatos de proprietários, notas internas, documentos e
						arquivos originais não são publicados.
					</p>
				</section>
				<section>
					<h2>Dados técnicos e segurança</h2>
					<p>
						A infraestrutura pode processar dados técnicos necessários para entregar e
						proteger o site, como endereço IP, navegador, rota acessada, data, hora e
						resultado da requisição. Esses dados são usados para segurança, prevenção de
						abuso e disponibilidade, com configuração de logs minimizada.
					</p>
				</section>
				<section>
					<h2>Cookies e preferências</h2>
					<p>
						O site público não usa cookies de publicidade, pixels ou ferramentas de
						análise de audiência. A preferência de tema e luminosidade pode ser guardada
						localmente no seu dispositivo. Cookies de sessão são usados somente na área
						administrativa restrita, para autenticação e segurança.
					</p>
				</section>
				<section>
					<h2>Contato e serviços externos</h2>
					<p>
						Este site não possui formulário de leads e não armazena a sua mensagem. Ao
						abrir o WhatsApp ou outro link externo, você escolhe o que compartilhar e
						passa a usar o serviço e a política de privacidade do respectivo provedor.
					</p>
				</section>
				<section>
					<h2>Conservação e proteção</h2>
					<p>
						Dados operacionais são mantidos somente pelo tempo necessário para administrar
						os anúncios, proteger contas, cumprir obrigações aplicáveis e exercer
						direitos. O acesso administrativo exige autenticação reforçada e as operações
						relevantes geram auditoria protegida.
					</p>
				</section>
				<section>
					<h2>Seus direitos</h2>
					<p>
						Quando houver tratamento de dados pessoais relacionado a você, é possível
						solicitar confirmação, acesso, correção, informações sobre compartilhamento e,
						quando aplicável, oposição, anonimização, bloqueio ou eliminação. Para exercer
						esses direitos, use a <a href="/contato">página de contato</a>.
					</p>
				</section>
				<section>
					<h2>Atualizações deste aviso</h2>
					<p>
						Este aviso será atualizado quando as finalidades, os canais ou os serviços do
						site mudarem. A data da versão vigente aparece no início desta página.
					</p>
				</section>
			</article>
		</main>
	);
}
