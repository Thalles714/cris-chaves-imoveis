# Handoff da Etapa 5 — hardening e lançamento

**Estado do gate:** EM ANDAMENTO — lançamento ainda não autorizado

**Início:** 7 de setembro de 2026

## Autorização e limite desta etapa

O UAT final da Etapa 4 foi aprovado em 7 de setembro de 2026 sem dúvida, erro ou dificuldade remanescente. Na mesma confirmação, o responsável autorizou o encerramento formal da Etapa 4 e o início da Etapa 5.

Essa autorização permite hardening, QA, preparação de infraestrutura e ensaios controlados. Ela não autoriza compra, contratação, alteração de plano gratuito, publicação do domínio, exposição de dados reais ou go-live. O lançamento final continua sujeito a um go/no-go humano explícito.

## Baseline recebida da Etapa 4

- 15 migrations locais e remotas alinhadas;
- lint SQL e 52 testes pgTAP locais aprovados;
- 48 controles remotos repetidos dentro de transação com `ROLLBACK`;
- assinatura antiga de publicação removida e contrato novo restrito a `authenticated` com autorização AAL2/administrativa;
- 241 testes unitários/arquiteturais e 32 cenários E2E aprovados;
- ciclo AAL2 de criação, mídia tratada, publicação, catálogo, página, sitemap, arquivamento e restauração aprovado;
- marca d'água central `Cris Chaves` e ausência de endereço privado comprovadas;
- placeholders autorizados apenas para avaliação, com remoção obrigatória antes do go-live.

## Primeiro bloco iniciado

### Supply chain e CI

- workflow de qualidade existente revisado: permissões mínimas, actions fixadas por SHA, lockfile congelado, reconstrução do banco, pgTAP, lint, tipagem, cobertura, integração de publicação, build, inspeção do bundle, dry-run e E2E;
- Dependabot configurado para dependências npm e GitHub Actions em ciclos semanais;
- workflow CodeQL para JavaScript/TypeScript configurado com permissões mínimas e actions fixadas por SHA;
- `pnpm audit --audit-level high` incluído no comando agregado e no workflow, bloqueando vulnerabilidades altas ou críticas;
- scan local existente cobre segredos, e-mail, telefone, CPF, CRECI não autorizado, chave privilegiada e fronteira cliente/servidor, inclusive bundle e source maps.

O responsável autorizou um repositório público no GitHub Free para manter custo zero e habilitar branch protection, required checks, CodeQL e secret scanning gratuitos. O repositório público foi criado em <https://github.com/Thalles714/cris-chaves-imoveis>. Antes do primeiro push, a inspeção encontrou o e-mail administrativo no documento atual e nos dois commits locais; a referência atual foi redigida e o histórico público foi iniciado por uma raiz limpa. O histórico anterior permanece somente na referência local `codex/pre-public-history`, que não foi enviada ao GitHub.

A branch `main` está protegida inclusive para administradores, sem force push ou exclusão e com histórico linear, resolução obrigatória de conversas e atualização estrita antes da integração. Os três controles obrigatórios são:

- `Rebuild and test Supabase policies`;
- `Lint, tests, build and browser checks`;
- `Analyze JavaScript and TypeScript`.

Dependabot security updates, secret scanning, push protection e relato privado de vulnerabilidade estão habilitados. A consulta após a primeira análise encontrou zero alertas de segredo e zero alertas do CodeQL.

### Cloudflare revalidado

As configurações permanecem no Workers Free, com o limite de 10 ms de CPU imposto pela plataforma, observabilidade habilitada, amostragem de 10%, três rate limiters e source maps enviados para diagnóstico da plataforma. A documentação oficial foi revalidada no início desta etapa: 100.000 requests/dia, 10 ms de CPU por request, 128 MB de memória, 50 subrequests e 20.000 static assets no Free. O limite atual é 64 MiB por Worker. O primeiro deploy fechado confirmou que `limits.cpu_ms` é uma opção exclusiva para aumentar o limite no plano Paid; a opção foi removida, sem aceitar upgrade ou cobrança.

O staging gratuito foi publicado no Worker `cris-chaves-imoveis-staging`, com rota `workers.dev`, variáveis em modo `preview`, três namespaces de rate limit próprios e os três segredos obrigatórios (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY`) armazenados como `secret_text`. O primeiro deploy público usou a versão `4fd17cd1-fe0c-4f17-8ca6-745847c48578`, iniciou em 4 ms e enviou 430,85 KiB compactados e 85 assets estáticos. As URLs de preview por versão foram explicitamente desativadas para manter apenas o endpoint de staging necessário. Produção, domínio, fail mode, alertas e verificação real de logs continuam pendentes.

O ensaio seguinte identificou uma particularidade crítica do plugin Vite da Cloudflare: o ambiente é resolvido no build, e `wrangler deploy --env staging` não altera um artefato já achatado como produção. Um artefato sem segredos foi enviado ao Worker base e, por herdar inicialmente a rota `workers.dev`, respondeu apenas `500`, sem acesso ao Supabase ou a dados. A rota foi imediatamente fechada com `workers_dev=false` e `preview_urls=false`; sua URL e a URL da versão passaram a retornar `404`. O staging foi então reconstruído corretamente e publicado como versão `7de1867d-ccc4-4775-a99f-bdde5fe7981a`, mantendo `APP_ENV=preview`; a home permaneceu `200`. O script `build:staging` agora fixa `CLOUDFLARE_ENV=staging` e recusa o artefato se nome, ambiente, rota, preview URLs, segredos ou namespaces divergirem. O comando genérico `deploy` aponta deliberadamente para `deploy:staging` enquanto produção não estiver autorizada.

Uma sessão de tail confirmou eventos do Worker e identificação inequívoca de versão/ambiente, mas também demonstrou que invocation logs nativos carregam IP e geolocalização aproximada. Enquanto finalidade, base legal e retenção não forem aprovadas, a configuração mantém consulta em tempo real para diagnóstico, redige query strings e desativa persistência de logs e traces. A configuração minimizada foi publicada no staging como versão `a0988270-7ade-4fb3-bcc1-5824db4f9022`. A auditoria administrativa de negócio permanece no banco e não depende dessa telemetria.

### CSP e headers

O inventário encontrou scripts inline legítimos do React Router, boot de aparência e JSON-LD. A implementação passou a gerar um nonce criptograficamente aleatório por resposta, propagá-lo ao renderer e a cada script legítimo e aplicar a CSP obrigatória com `base-uri 'none'`, `object-src 'none'`, `script-src-attr 'none'` e sem `unsafe-inline` em `script-src`. Estilos inline declarativos ainda ficam isolados em `style-src-attr 'unsafe-inline'`, enquanto blocos de estilo aceitam somente a própria origem. A matriz de navegador deve comprovar hidratação, tema, JSON-LD, Turnstile, mídia e rotas administrativas antes de considerar esse item encerrado.

### Evidência local desta abertura

- formatação, ESLint e TypeScript aprovados;
- scan de dados sensíveis e contrato estático de segurança aprovados em 15 migrations;
- auditoria do grafo travado: nenhuma vulnerabilidade conhecida, com gate para severidade alta/crítica;
- 242 testes unitários/arquiteturais aprovados;
- build de produção e inspeção da fronteira do bundle aprovados;
- dry-run do Wrangler aprovado: 430,86 KiB compactados, 85 static assets e somente os bindings gratuitos previstos;
- 16 cenários públicos da CSP atualizados e aprovados em desktop e mobile, sem evento `securitypolicyviolation`;
- inspeção HTTP independente da home: `200`, CSP obrigatória, Report-Only ausente, `base-uri 'none'`, `unsafe-inline` ausente de `script-src`, sete scripts com nonce idêntico ao header e nonce diferente entre respostas.
- o primeiro runner limpo do GitHub revelou que o lint dependia dos tipos do React Router já presentes no workspace local; o comando foi corrigido para executar `typegen` antes do ESLint, eliminando a dependência implícita de estado local.
- o primeiro ensaio visual no Ubuntu revelou que as referências de pixel eram específicas do Windows; o job visual foi alinhado ao executor `windows-2025`, enquanto o banco permaneceu isolado no Ubuntu;
- a execução `34173608793` do quality gate foi aprovada integralmente: reconstrução das 15 migrations, lint SQL, 52 testes pgTAP, contrato de publicação, auditoria de dependências, formatação, lint, tipos, 242 testes unitários/arquiteturais, build, fronteira do bundle e 38 testes E2E;
- a execução `34173608800` do CodeQL foi aprovada para JavaScript/TypeScript;
- finais de linha passaram a ser normalizados por `.gitattributes`, eliminando diferenças de checkout entre Windows e Linux.
- o staging respondeu `200` na home, `302` de `/admin` para `/admin/entrar` e `200` em `robots.txt` e `sitemap.xml`; as quatro respostas apresentaram HSTS, CSP obrigatória com nonce e `X-Robots-Tag: noindex, nofollow`, enquanto as respostas HTML e administrativas permaneceram `private, no-store`;
- a inspeção real no Chrome confirmou hidratação completa, catálogo com seis placeholders, preservação das características nos anúncios `Sob consulta`, página detalhada, quatro mídias públicas válidas em 1672 × 941 px, marca-d'água central `Cris Chaves` e exposição limitada a bairro/cidade, sem endereço exato;
- as gravações reproduzíveis dessa validação foram salvas em `stage5-staging-smoke` e `stage5-staging-property` no workspace do `browser-harness`.
- o comando restrito `pnpm check:staging-security` aprovou 13 controles HTTP sem credenciais nem mutação: headers, cache, CSP/noindex, redirecionamento administrativo, IDOR anônimo, CSRF/origin, tipo de upload, marcador XSS, mídia opaca, projeção pública e sitemap; a evidência detalhada está em `staging-http-security-evidence.md`.
- o workflow manual `ZAP baseline staging` foi preparado com a action oficial `zaproxy/action-baseline` e a imagem oficial `stable`, ambas fixadas por hash imutável, alvo literal de staging, permissões somente-leitura e criação automática de issues desativada; sua primeira execução ainda precisa ser aprovada pelos gates e realizada.

Depois que o usuário habilitou a depuração remota, o `browser-harness` repetiu a inspeção assistida e registrou seis quadros em `stage5-csp-final`. A home chegou ao estado `complete`, com título e H1 corretos, React Router hidratado, JSON-LD presente, sete scripts com nonce e nenhuma violação de CSP ou erro de runtime. O seletor de aparência respondeu após a hidratação e aplicou o Black com persistência, classe própria e fundo `#050607`.

## Frentes obrigatórias restantes

1. desdobrar o ASVS 5.0.0 L2 por identificador exato, com aplicabilidade, evidência e justificativa individual para cada `N/A`;
2. revisar OWASP Top 10:2025 e executar testes negativos HTTP, IDOR/BOLA/BOPLA, CSRF, XSS, upload e ZAP em staging;
3. concluir a matriz de navegador da CSP obrigatória com nonce e inspecionar violações reais em staging;
4. isolar staging e produção em Cloudflare/Supabase e validar secrets, redirects, SMTP, logs, cotas, alertas e rollback;
5. selecionar e configurar domínio, origem canônica, DNS e TLS sem habilitar serviço pago;
6. aprovar RPO/RTO, retenção, responsável, criptografia e destino off-site; executar backup real de banco e mídia e restore isolado medido;
7. concluir runbooks de incidente, conta, segredo, rollback, restore e indisponibilidade de fornecedor;
8. fechar inventário LGPD, bases legais, retenções, canal do titular e textos jurídicos com validação humana apropriada;
9. completar matriz visual, acessibilidade, Lighthouse, SEO e conteúdo final;
10. remover/arquivar todos os placeholders e confirmar catálogo inicial conforme aprovação final;
11. realizar go/no-go humano, registrar evidências e só então executar o go-live.

## Bloqueios humanos atuais

- titularidade futura caso o repositório seja transferido da conta pessoal `Thalles714` para uma organização do cliente;
- nome público final ainda não registrado como aprovado no checklist;
- domínio a comprar, titularidade e origem canônica;
- RPO, RTO, frequência, retenção, destino cifrado off-site e responsável operacional;
- decisões de leads, analytics/cookies, vídeo externo, retenção de fotos e validação publicitária;
- conteúdo definitivo, textos legais e remoção dos placeholders;
- aprovação explícita de go-live.

## Regra de saída

A Etapa 5 somente será marcada concluída quando cada controle aplicável tiver evidência reproduzível, o restore real tiver sido aprovado, os ambientes e contas estiverem sob titularidade definida, não houver falha alta/crítica aberta, o conteúdo de produção não contiver placeholder nem dado privado e o responsável registrar um go/no-go explícito.

## Continuação em 8 de setembro de 2026

- PR #8 integrado após aprovação dos checks obrigatórios e do CodeQL, adicionando o baseline passivo e manual do OWASP ZAP contra o staging, com action fixada por SHA, imagem fixada por digest, permissões mínimas e relatório como artifact;
- inventário oficial ASVS 5.0.0 L2 gerado a partir da release fixada: 253 IDs únicos, sendo 70 requisitos L1 e 183 L2;
- os 253 requisitos permanecem deliberadamente `pending`; nenhum controle foi declarado atendido somente por existir no inventário;
- `pnpm check:asvs` valida offline a completude e impede `verified` sem aplicabilidade/evidência ou `not_applicable` sem justificativa individual;
- a classificação requisito a requisito e o baseline ZAP aprovado continuam necessários antes do gate ASVS.
