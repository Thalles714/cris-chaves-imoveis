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

O responsável autorizou um repositório público no GitHub Free para manter custo zero e habilitar branch protection, required checks, CodeQL e secret scanning gratuitos. Antes do primeiro push, a inspeção encontrou o e-mail administrativo no documento atual e nos dois commits locais; a referência atual foi redigida e o histórico público será iniciado por uma raiz limpa, mantendo o histórico anterior somente em uma referência local não enviada.

### Cloudflare revalidado

As configurações permanecem no Workers Free, com `cpu_ms: 10`, observabilidade habilitada, amostragem de 10%, três rate limiters e source maps enviados para diagnóstico da plataforma. A documentação oficial foi revalidada no início desta etapa: 100.000 requests/dia, 10 ms de CPU por request, 128 MB de memória, 50 subrequests e 20.000 static assets no Free. O limite atual de upload do Worker é maior que o registrado no ADR-0001 e deverá ser corrigido no registro de custos/limites, sem relaxar o limite observado no dry-run.

Não houve deploy nesta abertura. Staging, produção, domínio, TLS, fail mode, alertas e verificação real de logs continuam pendentes.

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

Depois que o usuário habilitou a depuração remota, o `browser-harness` repetiu a inspeção assistida e registrou seis quadros em `stage5-csp-final`. A home chegou ao estado `complete`, com título e H1 corretos, React Router hidratado, JSON-LD presente, sete scripts com nonce e nenhuma violação de CSP ou erro de runtime. O seletor de aparência respondeu após a hidratação e aplicou o Black com persistência, classe própria e fundo `#050607`.

## Frentes obrigatórias restantes

1. desdobrar o ASVS 5.0.0 L2 por identificador exato, com aplicabilidade, evidência e justificativa individual para cada `N/A`;
2. revisar OWASP Top 10:2025 e executar testes negativos HTTP, IDOR/BOLA/BOPLA, CSRF, XSS, upload e ZAP em staging;
3. concluir a matriz de navegador da CSP obrigatória com nonce e inspecionar violações reais em staging;
4. criar e proteger o repositório GitHub, ligar required checks e os recursos de segurança compatíveis com visibilidade e plano aprovados;
5. isolar staging e produção em Cloudflare/Supabase e validar secrets, redirects, SMTP, logs, cotas, alertas e rollback;
6. selecionar e configurar domínio, origem canônica, DNS e TLS sem habilitar serviço pago;
7. aprovar RPO/RTO, retenção, responsável, criptografia e destino off-site; executar backup real de banco e mídia e restore isolado medido;
8. concluir runbooks de incidente, conta, segredo, rollback, restore e indisponibilidade de fornecedor;
9. fechar inventário LGPD, bases legais, retenções, canal do titular e textos jurídicos com validação humana apropriada;
10. completar matriz visual, acessibilidade, Lighthouse, SEO e conteúdo final;
11. remover/arquivar todos os placeholders e confirmar catálogo inicial conforme aprovação final;
12. realizar go/no-go humano, registrar evidências e só então executar o go-live.

## Bloqueios humanos atuais

- conta/organização, nome, visibilidade e titularidade do repositório GitHub;
- titularidade futura caso o repositório seja transferido da conta pessoal `Thalles714` para uma organização do cliente;
- nome público final ainda não registrado como aprovado no checklist;
- domínio a comprar, titularidade e origem canônica;
- RPO, RTO, frequência, retenção, destino cifrado off-site e responsável operacional;
- decisões de leads, analytics/cookies, vídeo externo, retenção de fotos e validação publicitária;
- conteúdo definitivo, textos legais e remoção dos placeholders;
- aprovação explícita de go-live.

## Regra de saída

A Etapa 5 somente será marcada concluída quando cada controle aplicável tiver evidência reproduzível, o restore real tiver sido aprovado, os ambientes e contas estiverem sob titularidade definida, não houver falha alta/crítica aberta, o conteúdo de produção não contiver placeholder nem dado privado e o responsável registrar um go/no-go explícito.
