# Evidência de go-live de produção

**Estado:** `NO-GO` técnico até concluir a validação pós-deploy

**Checkpoint:** 9 de setembro de 2026
**Origem canônica:** `https://crischaves.com.br`

Este documento é o checkpoint operacional corrente. Relatórios anteriores continuam válidos como histórico do momento em que foram escritos, mas não devem ser usados isoladamente para decidir o go-live.

## Concluído

- Etapas 1–4 encerradas e UAT administrativo AAL2 aprovado;
- 16 migrations reconstruídas do zero e lint SQL limpo; a suíte remota corrente aprovou 58 controles de autorização/RLS e 4 de busca pública dentro de transação com `ROLLBACK`, sem resíduos sintéticos;
- migration 16 aplicada e chave privilegiada antiga aposentada;
- repositório público protegido, PR 15 integrado na `main` pelo commit `84ca73066e9f127bb50761745ab5613f9844de3b`, CI/CodeQL verdes e zero alerta aberto de segredo;
- páginas públicas de Privacidade e Termos deixaram de ser minutas técnicas no PR 15; uma revisão jurídica profissional continua sendo uma validação humana, não um controle de software;
- zona Cloudflare ativa com `daphne.ns.cloudflare.com` e `dave.ns.cloudflare.com`, sem DS antigo;
- HTTPS obrigatório, TLS 1.3 e versão mínima TLS 1.2 estão ativos; HTTP e `www` redirecionam para a raiz canônica preservando caminho e query;
- Site URL e redirects exatos do Supabase Auth configurados para produção e staging;
- Worker `cris-chaves-imoveis` implantado em produção com os três nomes de segredo esperados; o identificador da revisão final será registrado depois do deploy aprovado pelo CI;
- artefato corrente aprovado em dry-run com 86 assets, aproximadamente 434 KiB compactados e sem segredo no bundle;
- o erro inicial `500` foi encerrado após corrigir e validar a origem exata do Supabase; home, catálogo, detalhe, mídia, `robots.txt` e `sitemap.xml` respondem `200`;
- o smoke HTTP de produção aprovou 15 controles somente leitura, incluindo headers, CSP com nonce, canonical, indexabilidade, sitemap, privacidade pública e fronteira administrativa;
- 52 arquivos/268 testes unitários e arquiteturais estão verdes; 34 cenários E2E passaram e 6 variações redundantes ficaram intencionalmente puladas;
- acessibilidade automatizada não encontrou violações sérias/críticas nas páginas públicas verificadas; a correção do CTA mobile foi validada em 375 e 390 px sem overflow ou texto duplicado;
- risco de operar sem backup próprio aceito temporariamente pela ADR-0010;
- placeholders claramente demonstrativos autorizados para avaliação pública; podem permanecer no lançamento e ser arquivados quando o cliente cadastrar anúncios reais.

## Incidente técnico encerrado

A primeira validação do domínio canônico encontrou `HTTP 500` na home porque a variável de origem do Supabase continha configuração inválida. O Worker iniciou normalmente e o erro público permaneceu redigido. A origem foi corrigida e o código agora recusa credenciais, query, fragmento ou caminho indevido, normalizando somente a origem HTTPS. O reteste no host real encerrou o incidente.

## Gate restante, em ordem

- [x] implantar a correção de runtime e confirmar `200` em home, catálogo, detalhe, mídia, `robots.txt` e `sitemap.xml`;
- [x] confirmar redirecionamento `HTTP → HTTPS` e `www → raiz`, preservando caminho e query string;
- [x] executar o controle HTTP de produção sem mutações;
- [x] repetir os 62 controles remotos dentro de `BEGIN`/`ROLLBACK` após o corte final;
- [ ] aprovar a revisão final no CI, implantar o artefato correspondente e repetir o smoke HTTP;
- [ ] repetir localmente os 62 controles pgTAP e o contrato de publicação quando o Docker Desktop estiver operacional; alternativamente, aceitar como evidência o job Linux isolado do CI, que reconstrói o banco do zero;
- [ ] executar o baseline ZAP passivo no host canônico ou registrar formalmente a equivalência do artefato já aprovado no staging;
- [ ] realizar smoke autenticado AAL2: login, publicação, auditoria, catálogo, detalhe, mídia/marca-d'água, privacidade, arquivamento e restauração;
- [ ] conferir logs redigidos, taxa de erros, rate limits e caminho de rollback da versão implantada;
- [ ] registrar titularidade/recuperação das contas e o responsável operacional provisório/definitivo;
- [ ] decidir formalmente como tratar os 251 requisitos ASVS ainda `pending`: concluir a verificação antes de alegar conformidade L2 ou registrar que o lançamento não possui essa certificação;
- [ ] registrar a decisão sobre SMTP/recuperação de conta enquanto o projeto depender do serviço padrão do Supabase;
- [ ] emitir go/no-go humano final e somente então divulgar o domínio.

## Regras de segurança durante o fechamento

- não imprimir, versionar ou copiar valores de secrets para documentos, logs ou conversa;
- não reativar a chave antiga, o RPC legado, leitura AAL1 de originais ou UPDATE direto de Storage;
- não usar rollback de banco que reduza o hardening da migration 16;
- se o catálogo voltar a `500`, interromper a divulgação, reverter para a última versão saudável e diagnosticar somente por operação/código redigidos;
- sem backup próprio, qualquer perda de dados/mídia poderá exigir recadastro manual, conforme risco aceito.
