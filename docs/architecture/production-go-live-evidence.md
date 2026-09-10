# Evidência de go-live de produção

**Estado:** `GO` técnico para o escopo de lançamento aprovado

**Checkpoint:** 9 de setembro de 2026
**Origem canônica:** `https://crischaves.com.br`

Este documento é o checkpoint operacional corrente. Relatórios anteriores continuam válidos como histórico do momento em que foram escritos, mas não devem ser usados isoladamente para decidir o go-live.

## Concluído

- Etapas 1–4 encerradas e UAT administrativo AAL2 aprovado;
- 16 migrations reconstruídas do zero e lint SQL limpo; a suíte remota corrente aprovou 58 controles de autorização/RLS e 4 de busca pública dentro de transação com `ROLLBACK`, sem resíduos sintéticos;
- migration 16 aplicada e chave privilegiada antiga aposentada;
- repositório público protegido; os PRs 16 e 17 foram integrados e o artefato final corresponde ao commit `5d8d7aea240833436dffcff77b8331f2fe4828f7`, com Quality gate e CodeQL verdes;
- páginas públicas de Privacidade e Termos deixaram de ser minutas técnicas no PR 15; uma revisão jurídica profissional continua sendo uma validação humana, não um controle de software;
- zona Cloudflare ativa com `daphne.ns.cloudflare.com` e `dave.ns.cloudflare.com`, sem DS antigo;
- HTTPS obrigatório, TLS 1.3 e versão mínima TLS 1.2 estão ativos; HTTP e `www` redirecionam para a raiz canônica preservando caminho e query;
- Site URL e redirects exatos do Supabase Auth configurados para produção e staging;
- Worker `cris-chaves-imoveis` implantado em produção com os três nomes de segredo esperados; versão final `dec7b901-d110-47d0-a3c1-592af23fbecb`;
- artefato corrente aprovado em dry-run com 86 assets, aproximadamente 434 KiB compactados e sem segredo no bundle;
- o erro inicial `500` foi encerrado após corrigir e validar a origem exata do Supabase; home, catálogo, detalhe, mídia, `robots.txt` e `sitemap.xml` respondem `200`;
- o smoke HTTP de produção aprovou 15 controles somente leitura, incluindo headers, CSP com nonce, canonical, indexabilidade, sitemap, privacidade pública e fronteira administrativa;
- 52 arquivos/268 testes unitários e arquiteturais estão verdes; 34 cenários E2E passaram e 6 variações redundantes ficaram intencionalmente puladas;
- acessibilidade automatizada não encontrou violações sérias/críticas nas páginas públicas verificadas; a correção do CTA mobile foi validada em 375 e 390 px sem overflow ou texto duplicado;
- risco de operar sem backup próprio aceito temporariamente pela ADR-0010;
- placeholders claramente demonstrativos autorizados para avaliação pública; podem permanecer no lançamento e ser arquivados quando o cliente cadastrar anúncios reais.
- o smoke autenticado AAL2 foi repetido no domínio canônico: arquivamento, remoção imediata do detalhe e sitemap, restauração para rascunho, republicação autorizada, mídia opaca, marca-d'água e três eventos de auditoria foram confirmados;
- após a republicação, os 15 controles HTTP de produção passaram novamente e o GitHub permaneceu com zero alerta aberto de segredo, CodeQL ou Dependabot alto/crítico;
- o caminho de rollback foi confirmado pelo histórico de deployments; a versão imediatamente anterior é `b468757b-4b74-434c-9d5c-6de783175fb4`.

## Incidente técnico encerrado

A primeira validação do domínio canônico encontrou `HTTP 500` na home porque a variável de origem do Supabase continha configuração inválida. O Worker iniciou normalmente e o erro público permaneceu redigido. A origem foi corrigida e o código agora recusa credenciais, query, fragmento ou caminho indevido, normalizando somente a origem HTTPS. O reteste no host real encerrou o incidente.

## Gate final

- [x] implantar a correção de runtime e confirmar `200` em home, catálogo, detalhe, mídia, `robots.txt` e `sitemap.xml`;
- [x] confirmar redirecionamento `HTTP → HTTPS` e `www → raiz`, preservando caminho e query string;
- [x] executar o controle HTTP de produção sem mutações;
- [x] repetir os 62 controles remotos dentro de `BEGIN`/`ROLLBACK` após o corte final;
- [x] revisão final aprovada no CI, artefato correspondente implantado e smoke HTTP repetido;
- [x] evidência isolada do CI aceita para reconstrução das 16 migrations, lint SQL, 62 controles pgTAP e contrato de publicação; o Docker local não é gate de lançamento;
- [x] baseline ZAP passivo aprovado em staging e equivalência aceita para o mesmo artefato de aplicação, complementada pelo smoke específico do host canônico; não foi executado crawler ativo em produção;
- [x] smoke autenticado AAL2 concluído no domínio canônico;
- [x] logs de aplicação permanecem redigidos, persistência de invocation logs desativada, rate limits foram exercitados em staging e há versão anterior identificada para rollback;
- [x] responsável operacional provisório registrado; titularidade definitiva e recuperação das contas permanecem item de handoff pós-lançamento, sem bloquear o escopo aprovado;
- [x] lançamento registrado sem alegação de conformidade ASVS L2: 2 requisitos possuem evidência formal e 251 continuam pendentes;
- [x] serviço padrão de e-mail do Supabase aceito temporariamente; SMTP próprio e teste de recuperação assistida ficam como melhoria operacional, sem alegar SLA de entrega;
- [x] go-live técnico emitido para o escopo aprovado: site sem leads persistidos, analytics ou pixels, com placeholders inequivocamente demonstrativos.

## Riscos residuais aceitos

- não existe certificação ou declaração de conformidade ASVS L2;
- não há backup próprio nem RPO/RTO garantido; eventual recadastro manual segue a ADR-0010;
- o e-mail transacional usa o serviço padrão do Supabase, sem SLA próprio;
- contas continuam sob titularidade operacional provisória e devem ser transferidas/documentadas no handoff definitivo;
- textos legais são publicáveis e coerentes com o escopo técnico, mas não substituem parecer jurídico;
- placeholders demonstrativos permanecem públicos por autorização expressa e devem ser arquivados à medida que o conteúdo real for cadastrado.

## Regras de segurança durante o fechamento

- não imprimir, versionar ou copiar valores de secrets para documentos, logs ou conversa;
- não reativar a chave antiga, o RPC legado, leitura AAL1 de originais ou UPDATE direto de Storage;
- não usar rollback de banco que reduza o hardening da migration 16;
- se o catálogo voltar a `500`, interromper a divulgação, reverter para a última versão saudável e diagnosticar somente por operação/código redigidos;
- sem backup próprio, qualquer perda de dados/mídia poderá exigir recadastro manual, conforme risco aceito.
