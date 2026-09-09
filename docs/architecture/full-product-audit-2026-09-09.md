# Auditoria integral do produto — 9 de setembro de 2026

**Decisão atual:** `NO-GO` para produção. O código local está aprovado, mas ainda existem ações manuais de segurança, infraestrutura e conteúdo.

## Escopo revisado

- segurança da aplicação, banco, Storage, autenticação, segredos, CI e deploy;
- fluxo público e administrativo, responsividade, acessibilidade e temas;
- conversão, conteúdo, SEO técnico e exposição de dados;
- operação, rollback e prontidão de lançamento;
- comparação com a referência Resider, sem copiar ativos.

## Melhorias aplicadas

### Segurança e arquitetura

- adicionada a migration 16 para exigir administrador ativo com AAL2 na leitura de originais privados;
- removida a capacidade de `authenticated` alterar objetos do Storage depois da verificação;
- confirmação de mídia passa a aceitar somente o Worker confiável com identidade administrativa validada;
- removido o contrato legado de publicação e mantido apenas o contrato atual;
- cliente Supabase privilegiado recusa chave pública, origem insegura e URL com credenciais;
- scanner procura chaves `sb_secret_` e artefatos gerados antes ignorados;
- builds removem `.dev.vars` gerados e `artifacts/` não entra no repositório;
- lint do banco falha em erro nos schemas da aplicação;
- CI passou a executar o dry-run de produção do Cloudflare.

### Experiência, acessibilidade e design

- preservados os temas claros e escuros anteriores e adicionado Black como modo independente;
- as seis paletas alteram superfícies, textos, bordas e estados, e não apenas botões;
- contraste corrigido; alvos interativos têm pelo menos 44 px;
- navegação administrativa móvel ganhou rótulos e fluxo sem estouro de largura;
- formulário de contato sem backend foi substituído por CTA direto para WhatsApp;
- marca no cabeçalho e rodapé aponta para a home real (`/home`).

### SEO e conteúdo público

- detalhes do imóvel publicam imagem Open Graph específica e tipo de página correto;
- adicionados dados estruturados `RealEstateListing` e `BreadcrumbList` somente com campos públicos;
- nenhum endereço privado é incluído em HTML, metadados ou JSON-LD;
- removida promessa de formulário indisponível na página de venda.

## Evidência técnica local

| Controle | Resultado |
|---|---|
| Reconstrução do banco | 16 migrations aplicadas do zero |
| Lint SQL | sem erros em `public` e `app_private` |
| pgTAP | 60/60 aprovados |
| Contrato de publicação | contratos 14/15 aprovados em transação com rollback |
| Unitários/arquiteturais | 264 aprovados em 51 arquivos |
| E2E | 32 aprovados e 6 pulados intencionalmente pela matriz de projetos |
| Dependências | nenhuma vulnerabilidade conhecida no lockfile |
| Cloudflare dry-run | 86 assets; 433,42 KiB compactados; nenhum deploy |
| Navegador | Black, escuro Entardecer, contato e menu móvel inspecionados |

Na conclusão da revisão local, a migration 16 ainda não havia sido aplicada no Supabase remoto; a atualização abaixo registra sua aplicação posterior.

### Atualização após a auditoria

- nova chave secreta criada pelo responsável e instalada no Worker de staging sem exposição do valor;
- migration 16 aplicada no Supabase remoto e histórico local/remoto alinhado;
- Worker compatível publicado no staging, com URL canônica explícita e sem aviso de herança de variáveis;
- matriz RLS remota ampliada de 48 para 56 controles e aprovada dentro de `BEGIN`/`ROLLBACK`;
- consulta independente confirmou zero usuários, imóveis, mídias e objetos sintéticos residuais;
- 14 controles HTTP do staging aprovados após o deploy final;
- upload autenticado com AAL2 confirmou o novo segredo no fluxo privilegiado: uma imagem segura foi tratada, recebeu marca-d'água, ficou pública em rota opaca e gerou os eventos de auditoria esperados;
- a página pública exibiu apenas bairro/cidade e a mensagem de preservação do endereço exato, sem dado privado;
- chave secreta antiga aposentada manualmente pelo responsável;
- após a revogação, os 14 controles HTTP voltaram a passar, o painel AAL2 permaneceu funcional e o Worker manteve somente os três nomes de segredo esperados.
- zona `crischaves.com.br` criada na Cloudflare no plano gratuito, sem importação de registros;
- DNSSEC antigo removido na origem do Registro.br; o DS ainda pode aparecer temporariamente em caches públicos durante o TTL;
- troca dos nameservers foi recusada corretamente enquanto a zona Cloudflare ainda estava `initializing`, portanto os hosts antigos permaneceram ativos;
- rotas de Custom Domain para raiz e `www` foram versionadas e o dry-run de produção foi aprovado sem deploy.
- o Registro.br confirmou uma janela temporária de transição após a remoção do DNSSEC; a delegação externa permanece bloqueada até o contador terminar;
- um alerta de alta severidade publicado para `sharp < 0.35.4` foi eliminado com override mínimo para `0.35.4`; a auditoria voltou a informar zero vulnerabilidades conhecidas;
- o gate completo passou com 51 arquivos e 264 testes unitários, contrato de publicação com rollback, 32 cenários E2E aprovados e 6 variações intencionalmente ignoradas;
- o ambiente de testes recebeu `routes: []`, impedindo que uma publicação acidental desse ambiente reassocie os Custom Domains de produção.
- após o fim da transição, o Registro.br aceitou integralmente `daphne.ns.cloudflare.com` e `dave.ns.cloudflare.com`, mantendo zero DS;
- a delegação pública passou a responder pelos dois nameservers esperados e a zona Cloudflare atingiu o estado `active` em 9 de setembro de 2026;
- a branch pública foi examinada localmente e pelo secret scanning do GitHub, ambos sem alertas de segredo aberto.
- o Supabase Auth passou a usar `https://crischaves.com.br` como Site URL e recebeu redirects exatos, sem curingas, para convite e recuperação em produção e staging; os dois caminhos locais foram preservados para desenvolvimento;
- o Worker base ainda tem zero segredos e as credenciais presentes apenas no ambiente local foram recusadas pelo Supabase, portanto não serão reutilizadas em produção.

## Bloqueadores antes do go-live

1. Manter comprovado o alinhamento da migration 16 e do Worker antes do corte de produção.
2. Publicar o Worker com os segredos válidos, provisionar TLS para raiz e `www` e validar o redirecionamento canônico.
3. Definir `https://crischaves.com.br` como Site URL do Supabase Auth e permitir apenas redirects exatos necessários.
4. Cadastrar os três secrets de produção sem copiá-los para arquivo ou conversa.
5. Arquivar os seis placeholders antes de liberar indexação pública.
6. Substituir as minutas de privacidade e termos por textos validados.
7. Definir responsável por alertas, incidentes e recuperação das contas.
8. Repetir controles remotos, ZAP, fluxo AAL2 e smoke test no host final.
9. Classificar a matriz ASVS requisito a requisito; 251 de 253 itens ainda não têm evidência individual.

O risco de operar inicialmente sem backup próprio foi aceito na ADR-0010 e não é apresentado como controle implementado.

## Decisão de lançamento

O go-live somente pode ser autorizado quando os bloqueadores críticos tiverem evidência e não houver vulnerabilidade alta/crítica aberta. Se a migration 16 ou o novo Worker falhar, preservar o hardening do banco e colocar o site em manutenção; não restaurar o contrato inseguro anterior.
