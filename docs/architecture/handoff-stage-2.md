# Handoff — Etapa 2: dados, autenticação, autorização e mídia

- **Status:** concluída; libera o início da Etapa 3
- **Data:** 3 de setembro de 2026
- **Escopo:** fundação local e versionada, sem projeto de produção, credenciais reais ou dados pessoais

## Resultado entregue

- schema PostgreSQL, projeções públicas allowlisted, GRANT/RLS e Storage em três migrations;
- catálogo e seed vazios; nenhuma tabela, DTO ou fixture de `leads`;
- cliente Supabase SSR criado por requisição, cookies seguros e somente chave publicável;
- papéis `owner` e `editor`, vínculo ativo e `aal2` para acesso administrativo além do bootstrap de MFA;
- DAL pública restrita às projeções públicas;
- validação segura de JPEG/WebP, limites de bytes/dimensões/quantidade, paths opacos e originais privados;
- vídeo limitado a YouTube/Vimeo por URL normalizada, sem download pelo servidor;
- auditoria append-only com dados allowlisted;
- tipos TypeScript gerados pelo Supabase CLI contra o schema local reconstruído;
- runbook separado para banco e mídia, criptografia, checksums e restore isolado.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| `supabase db reset` | passou; três migrations aplicadas do zero e seed vazio carregado |
| `supabase db lint --local --level error` | passou; nenhum erro nos schemas `app_private`, `extensions` e `public` |
| pgTAP/RLS | 26/26 cenários passaram |
| tipos do banco | regenerados pelo CLI `2.116.0` contra PostgreSQL local |
| testes TypeScript | 31/31 passaram em 6 arquivos |
| E2E | 4/4 passaram em Chromium desktop e mobile, com acessibilidade e teclado |
| segurança estática | passou: RLS, AAL2, mídia, auditoria, ausência de leads e scanner de segredo/PII |
| fronteira cliente/servidor | passou no código e no bundle de produção |
| build | passou em React Router/Cloudflare Workers |
| Cloudflare dry-run | passou; upload estimado 769,21 KiB, gzip 162,40 KiB, sem bindings |
| inspeção visual independente | `pt-BR`, um `main`, navegações nomeadas, zero imagem quebrada e zero overflow horizontal |

Cobertura observada: 62,46% statements, 53,51% branches, 78,18% functions e 64,24% lines. O principal controle de acesso também possui cobertura comportamental no PostgreSQL via pgTAP.

## Matriz de segurança implementada

- `anon`: somente catálogo e mídia públicos aprovados; sem tabelas base, rascunhos, endereço exato, auditoria ou originais.
- autenticado sem membro: nenhum acesso administrativo.
- membro `aal1`: somente o vínculo mínimo próprio para completar MFA.
- editor `aal2`: imóveis e mídia, sem membros, auditoria ou exclusão física.
- owner `aal2`: governança de membros, auditoria e operações físicas previstas, com proteção contra autoalteração e remoção do último owner.
- auditoria: gerada por trigger; papéis comuns não recebem mutação direta.
- Storage: buckets privados; upload exige plano de mídia correspondente, AAL2, MIME/tamanho e path opaco; leitura pública apenas do derivado aprovado de imóvel publicado.

## Arquivos principais

| Área | Evidência |
|---|---|
| domínio | `CONTEXT.md` e `app/modules/properties/domain/` |
| schema | `supabase/migrations/20260903020000_core_schema.sql` |
| GRANT/RLS | `supabase/migrations/20260903020100_grants_and_rls.sql` |
| Storage | `supabase/migrations/20260903020200_storage_security.sql` |
| matriz pgTAP | `supabase/tests/database/rls.test.sql` |
| tipos gerados | `app/lib/supabase/database.types.ts` |
| sessão/Auth | `app/lib/supabase/` e `app/modules/auth/` |
| DAL pública | `app/modules/properties/server/supabase-property-repository.server.ts` |
| mídia | `app/modules/media/` |
| backup | `docs/architecture/backup-restore-runbook.md` |

## Decisões que não bloqueiam a Etapa 3, mas bloqueiam produção

- projeto Supabase Free, região `sa-east-1`, titularidade e recuperação das contas;
- responsável, substituto, cadência, retenção, RPO/RTO, ferramenta de criptografia e destino off-site;
- ensaio do dump criptografado, cópia separada de mídia e restore isolado;
- decisão legal sobre leads e cookies/embeds de vídeo;
- nome público, CRECI, WhatsApp, escopo comercial, logotipo e conteúdos aprovados.

O `db reset` prova reconstrução declarativa do schema, mas não é apresentado como restore de um backup. O backup off-site e seu restore real permanecem gate explícito do lançamento.

## Gate

**APROVADO PARA INICIAR A ETAPA 3.** A matriz de acesso passou, `anon` não lê conteúdo privado ou rascunhos, a rotina de backup está definida e todos os testes positivos e negativos implementados estão verdes. Nenhum provisionamento ou publicação foi realizado.
