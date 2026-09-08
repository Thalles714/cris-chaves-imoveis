# Arquitetura — índice do projeto

**Estado:** Etapas 1, 2, 3 e 4 concluídas; Etapa 5 autorizada e em andamento
**Última revisão:** 7 de setembro de 2026

Esta pasta registra as decisões arquiteturais e evidências por etapa. Ela não autoriza provisionamento de produção, contratação, cadastro de cartão ou publicação de conteúdo.

## Fontes e precedência

1. O briefing mais recente é a fonte funcional.
2. [`design_system.html`](../../design_system.html) é a base e o contrato visual do produto.
3. [Resider](https://resider.ca/home) é a referência visual externa principal para composição, acabamento e comportamento, sem licença para copiar código, textos, imagens, fontes ou outros ativos.
4. [`docs/plano-tecnico-seguranca-e-5-prompts.md`](../plano-tecnico-seguranca-e-5-prompts.md) define arquitetura, segurança, orçamento e sequência de implementação.
5. [`docs/pesquisa-arquitetura-seguranca.md`](../pesquisa-arquitetura-seguranca.md) é pesquisa de apoio; suas recomendações pagas anteriores não prevalecem.

Em conflito visual, `design_system.html` prevalece sobre o Resider. Em conflito funcional, o briefing mais recente prevalece, salvo requisito de segurança ou legal que exija validação humana.

## Visão e políticas

- [Visão do monólito modular e limites de confiança](architecture-overview.md)
- [Política de ambientes e variáveis](environment-and-variables-policy.md)
- [Matriz inicial OWASP ASVS 5.0.0 nível 2](asvs-5-l2-initial-matrix.md)
- [Decisões e bloqueios de publicação](decisions-and-blockers.md)
- [Handoff da Etapa 1](handoff-stage-1.md)
- [Linguagem e modelo de domínio da Etapa 2](domain-model-stage-2.md)
- [Matriz de acesso da Etapa 2](access-control-matrix-stage-2.md)
- [Inventário de dados/LGPD](data-inventory-lgpd-stage-2.md)
- [Runbook de backup e restauração](backup-restore-runbook.md)
- [Handoff da Etapa 2](handoff-stage-2.md)
- [Handoff da Etapa 3](handoff-stage-3.md)
- [Manual operacional da área administrativa](admin-operations-runbook.md)
- [Projeto Supabase da Etapa 4](supabase-project-stage-4.md)
- [Handoff da Etapa 4](handoff-stage-4.md)
- [Handoff da Etapa 5](handoff-stage-5.md)
- [Evidência HTTP de segurança do staging](staging-http-security-evidence.md)
- [Registro de custos, cotas e gatilhos de upgrade](cost-and-quota-ledger.md)

## Registros de decisão

- [ADR-0001 — React Router v8 e Cloudflare Workers Free](adr/0001-react-router-v8-cloudflare-workers-free.md)
- [ADR-0002 — Supabase Free em São Paulo](adr/0002-supabase-free-sa-east-1.md)
- [ADR-0003 — Separação público/admin e DTO público](adr/0003-public-admin-separation-public-dto.md)
- [ADR-0004 — RLS como barreira final](adr/0004-rls-final-barrier.md)
- [ADR-0005 — Catálogo dinâmico e admin sem cache compartilhado](adr/0005-dynamic-catalog-admin-no-store.md)
- [ADR-0006 — Backup manual de banco e mídia](adr/0006-manual-database-and-media-backup.md)
- [ADR-0007 — Vídeo somente por URL allowlisted e já tratada](adr/0007-allowlisted-treated-video-urls.md)
- [ADR-0008 — Hierarquia visual e uso do Resider](adr/0008-visual-source-hierarchy.md)
- [ADR-0009 — Não persistir leads sem decisão legal](adr/0009-no-persisted-leads-until-legal-decision.md)

## Convenções dos ADRs

- **Aceita:** decisão autorizada pelo plano atual.
- **Aceita com condição:** direção decidida, mas com condição que pode bloquear o provisionamento ou lançamento.
- **Pendente:** não implementar nem publicar até decisão humana registrada.
- Mudanças que adicionem custo, serviço pago ou uma nova superfície de dados exigem novo ADR e aprovação humana.

## Referências atuais verificadas

- [Cloudflare — React Router no Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
- [Cloudflare — limites do Workers](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare — preços do Workers](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare — cobrança e limites de Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Supabase — regiões](https://supabase.com/docs/guides/platform/regions)
- [Supabase — backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase — API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase — RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release)

Limites e planos são temporais. Revalidá-los nas fontes oficiais antes de cada provisionamento, mudança de bindings ou lançamento.

## Baseline ASVS executável

- [Escopo inicial e regras de classificação ASVS 5.0.0 L2](asvs-5-l2-initial-matrix.md)
- [Inventário completo dos 253 requisitos ASVS L2](asvs-5-l2-requirements.json)
- validação offline: `pnpm check:asvs`
- sincronização manual com a release oficial fixada: `pnpm sync:asvs`
