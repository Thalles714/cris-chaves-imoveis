# Auditoria de segurança e qualidade — 10 de setembro de 2026

**Decisão:** `APROVADO COM RISCOS`

## Resumo executivo

Não foi encontrada vulnerabilidade Crítica ou Alta confirmada no código revisado. Os controles de maior impacto — sessão verificada no servidor, autorização por operação, AAL2, RLS/default-deny, projeções públicas, Storage privado, validação de mídia, proteção de mutações, CSP e separação cliente/servidor — têm implementação e testes locais coerentes. A auditoria de dependências não encontrou advisory alto ou crítico.

O gate local não pôde ser declarado integralmente encerrado: o Docker Desktop não estava disponível para reconstruir o banco, lint SQL, pgTAP e contrato de publicação. Os 35 cenários E2E aplicáveis passaram e 7 variações deliberadas foram puladas, mas o processo ficou preso no teardown depois de imprimir o resultado do último teste; a reprodução mínima confirmou que o cenário passa e o runner não encerra. O Quality Gate e o CodeQL do commit-base `6d86ee24f67b8af79e924a41a702b3f4917dbca6` estão verdes no GitHub. O único defeito confirmado corrigido no repositório nesta rodada foi a perda do diagnóstico do teste de contrato quando o Docker não pode ser iniciado.

## Threat model e superfície de ataque

| Limite/ator | Superfície | Abusos prioritários | Controles observados |
| --- | --- | --- | --- |
| Visitante, bot e atacante com ID conhecido | catálogo, filtros, detalhe, mídia, robots/sitemap e contato | enumeração, XSS, IDOR, scraping/cota e exposição de localização | DTO e views públicas, schemas Zod, códigos opacos, `no-store`, contato sem persistência |
| Conta sem papel, desativada ou AAL1 | login, callback, convite, recuperação, MFA e logout | fixation, callback/redirect, enumeração e acesso fail-open | `getUser`, vínculo ativo no banco, redirects internos fixos, AAL1 restrito a autenticação |
| Editor/owner AAL2 | mutations, publicação, arquivamento/restauração, membros, auditoria e mídia | BOLA/BOPLA, mass assignment, CSRF, corrida e abuso de cota | autorização por operação/alvo, schemas estritos, `Origin`, limite de corpo, rate limits, versões/RPCs e RLS |
| Worker/navegador/Supabase | SSR, cookies, Auth/API/Postgres/Storage | segredo no cliente, cache privado, SSRF, SQLi, upload polyglot/bomb e fail-open | fronteira server-only, cookies HttpOnly/SameSite/Secure, CSP nonce, consultas tipadas, validação estrutural e limites de bytes/pixels |
| CI/CD e supply chain | lockfile, Actions, build, sourcemaps e scanners | dependency confusion, action comprometida, segredo em artefato | lockfile congelado, Actions por SHA, permissões mínimas, scanner de dados e bundle boundary |

Não há D1, KV, R2, Durable Objects, Queues, Vectorize, Workers AI ou Agents SDK neste projeto. Request smuggling permanece responsabilidade primária da borda Cloudflare; não foi identificado parser HTTP próprio ou proxy que crie uma segunda interpretação local.

## Achados

| ID | Severidade / confiança | Evidência e cenário mínimo | Impacto | Status / regressão |
| --- | --- | --- | --- | --- |
| AQ-01 | Informativo / Confirmado | `tests/integration/publication-contract.test.mjs` tentava `stderr.write(undefined)` quando `spawnSync` falhava sem saída. Reproduzido com Docker indisponível. | O diagnóstico real era ocultado por `ERR_INVALID_ARG_TYPE`, atrasando operação e podendo induzir falsa investigação. Não afeta runtime. | **Corrigido**: fallback seguro para `result.error`/ausência de saída. Reexecução agora informa claramente que o engine Docker não está disponível. |
| AQ-02 | Médio / Confirmado | Docker Desktop indisponível ao executar `pnpm test:integration:publication`; por consequência `db:reset`, `db:lint` e `db:test` não foram executados. | As 16 migrations e 60 controles históricos não foram reprovados, mas também não foram comprovados nesta sessão. | **Bloqueio ambiental**; iniciar Docker e repetir os quatro comandos antes de merge/deploy. |
| AQ-03 | Baixo / Confirmado | `pnpm test:e2e` executou os 42 casos (35 aprovados e 7 skips deliberados), mas não encerrou após o último resultado. A reprodução mínima do último cenário também passou e travou no teardown. | O produto e as asserções passaram; a limitação reduz a confiabilidade do feedback local neste runner Windows restrito. | **Risco de ferramenta/ambiente**; o mesmo commit passou no Quality Gate Windows do GitHub. A ocorrência é compatível com falha conhecida de limpeza do Chromium no Playwright/Windows e não justificou patch especulativo na aplicação. |
| AQ-04 | Baixo / Confirmado | O binding de rate limit é local, permissivo e eventualmente consistente segundo a documentação Cloudflare consultada em 10/09/2026. | Rajadas distribuídas podem exceder momentaneamente o limite nominal; não serve como quota exata. | **Risco de plataforma documentado**; manter validação, limites de corpo/pixels e RLS como barreiras independentes. |

Não foram confirmados vazamento de segredo/dado privado, bypass de autenticação/AAL2/RLS, escrita indevida, acesso público a originais, injeção, open redirect, SSRF ou quebra da separação público/admin.

## Mudança realizada

- `tests/integration/publication-contract.test.mjs`: preserva `stderr`/`stdout` existentes e, quando ambos faltam, exibe uma mensagem determinística baseada no erro de spawn. É uma mudança local, reversível, sem dependência, contrato público, banco ou efeito em produção.

## Evidências e comandos

| Comando | Resultado real |
| --- | --- |
| `pnpm check:sensitive-data` | passou; nenhum segredo ou dado pessoal encontrado no escopo do scanner |
| `pnpm check:design-tokens` / `pnpm check:stage2-security` / `pnpm check:asvs` | passaram no início do gate; matriz com 253 requisitos, 2 verificados e 251 pendentes |
| `pnpm audit --audit-level high` | passou; nenhuma vulnerabilidade conhecida no lockfile |
| `pnpm format:check`, `pnpm lint`, `pnpm typecheck` | passaram após a mudança |
| `pnpm test:unit:coverage` | 53 arquivos e 270 testes passaram; 67,94% de linhas e 56,47% de branches |
| `pnpm test:integration:publication` | bloqueado: Docker API/engine indisponível; rollback SQL não foi executado |
| `pnpm build` | passou; 335 módulos cliente e 362 SSR; `.dev.vars` temporário removido pelo build |
| `pnpm check:client-boundary` | passou; sem segredo/server-only no bundle cliente |
| `pnpm check:cloudflare` | dry-run passou, sem deploy; 86 assets, upload 2.066,52 KiB, gzip 433,79 KiB, 3 rate-limit bindings e 4 vars públicas |
| `pnpm test:e2e` | asserções concluídas: 35 passaram e 7 skips deliberados; processo preso no teardown após o último resultado neste runner |
| `pnpm check:production-security` | 15 controles HTTP somente leitura passaram no domínio canônico, incluindo HTTPS, raiz, `www`, páginas públicas, mídia opaca, `robots`, sitemap, login e páginas legais |
| Quality Gate / CodeQL no GitHub | ambos aprovados para o commit-base `6d86ee24f67b8af79e924a41a702b3f4917dbca6` em 10/09/2026; o novo commit deve repetir os gates após o push |

## Cloudflare Free e custo

Documentação oficial consultada em 10/09/2026: [limites do Workers](https://developers.cloudflare.com/workers/platform/limits/), [preços](https://developers.cloudflare.com/workers/platform/pricing/), [Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) e [Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

O dry-run permanece muito abaixo de 64 MiB de Worker e 20.000 assets. O Free atual informa 100.000 requests/dia, 10 ms CPU/request, 128 MB por isolate, 50 subrequests/request e 6 conexões simultâneas; assets estáticos são gratuitos e ilimitados, enquanto SSR consome requests do Worker. Nenhum recurso pago, dependência ou serviço foi adicionado. A mudança desta rodada tem custo operacional e financeiro zero.

O código faz SSR, autenticação e downloads Supabase; o dry-run não mede CPU real. Monitorar `exceededCpu`, `exceededMemory`, 429 e volume diário continua obrigatório. A mídia é transmitida como `Blob` retornado pelo SDK; não foi demonstrado estouro de memória, mas originais/derivadas continuam limitados a 8 MiB e 24 milhões de pixels.

## ASVS

Nenhum status foi promovido nesta rodada. Permanecem verificados somente:

- `v5.0.0-V3.4.1`: HSTS — evidências exatas registradas em `docs/architecture/asvs-5-l2-requirements.json` apontam para headers dinâmicos/estáticos, teste unitário, verificação HTTP de staging e ZAP.
- `v5.0.0-V3.4.4`: `X-Content-Type-Options: nosniff` — as mesmas classes de evidência estão registradas no artefato.

Os outros 251 requisitos permanecem `pending`. Esta auditoria não declara conformidade ASVS nem substitui pentest profissional.

## Riscos residuais e ações humanas

1. **Alto benefício / baixo esforço:** iniciar Docker Desktop e executar `pnpm db:reset`, `pnpm db:lint`, `pnpm db:test` e `pnpm test:integration:publication`.
2. **Médio benefício / baixo esforço:** acompanhar atualizações do Playwright para o problema de teardown no Windows; manter o runner Windows do GitHub como gate e não mascarar travamentos com aumento cego de timeout.
3. **Alto benefício / esforço médio:** manter teste remoto autenticado de papéis/objetos cruzados em staging autorizado, sempre com rollback; não executar contra produção sem autorização.
4. **Alto benefício / decisão humana:** definir backup próprio e RPO/RTO. O risco de recadastro manual aceito na ADR-0010 não foi corrigido por código.
5. **Médio benefício / decisão humana:** definir SMTP/e-mail transacional, titularidade, recuperação de contas, responsáveis por alertas e incidentes.
6. **Contínuo:** acompanhar requests/CPU/memória/subrequests e a natureza aproximada do rate limit; preservar limites independentes e fail-closed.

## Rollback local

Reverter somente o bloco de diagnóstico adicionado ao final de `tests/integration/publication-contract.test.mjs`. Não há migration, dado, dependência, secret, deploy ou alteração remota para desfazer. O arquivo não versionado preexistente `docs/prompts/06-auditoria-seguranca-e-qualidade-gratuita.md` foi preservado sem alteração.
