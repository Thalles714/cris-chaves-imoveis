# Cris Chaves Imóveis

Fundação técnica, site público e área administrativa de Cris Chaves. As Etapas 1, 2, 3 e 4 estão concluídas; o UAT final aprovou MFA, cadastro, mídia tratada, publicação, privacidade, arquivamento e restauração, e a Etapa 5 está autorizada. Os anúncios demonstrativos continuam claramente identificados como placeholders autorizados para avaliação e devem ser removidos do ambiente público antes do go-live.

## Fontes de verdade

1. `docs/plano-tecnico-seguranca-e-5-prompts.md` — plano técnico e gates.
2. `design_system.html` — contrato visual obrigatório: tokens, temas, componentes e estados.
3. `docs/architecture/` — decisões e fronteiras da implementação.
4. [Resider](https://resider.ca/home) — referência de composição e comportamento, sem reutilização de marca, conteúdo ou ativos.

O material original em `briefing_export/`, documentos e imagens da raiz é fonte privada do projeto. Ele não deve ser importado para o bundle, fixtures, testes ou conteúdo público.

## Requisitos locais

- Node.js 24
- pnpm 11
- Docker Desktop com backend WSL 2 para o Supabase local

```bash
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm dev
```

Copie `.env.example` para `.env.local` e `.dev.vars.example` para `.dev.vars` somente quando precisar de configuração local. Nunca versione valores reais. Segredos de produção serão cadastrados por `wrangler secret put` nas etapas que os exigirem.

## Verificação

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
pnpm build
pnpm check
pnpm db:reset
pnpm db:lint
pnpm db:test
```

`pnpm check` é o gate completo do aplicativo. O job de banco da integração contínua também reconstrói as migrations, executa lint SQL e roda a matriz pgTAP.

## Estrutura

- `app/design-system/`: tokens e controle de aparência.
- `app/components/ui/`: componentes-base acessíveis.
- `app/modules/`: domínio, contratos públicos e portas server-only.
- `app/routes/`: composição de rotas, sem acesso direto a persistência.
- `workers/`: adaptador do Cloudflare Worker.
- `tests/`: testes unitários, arquiteturais, E2E e acessibilidade.
- `supabase/`: configuração local, migrations, seed vazio e testes pgTAP.
- `docs/architecture/`: arquitetura, ADRs, matriz ASVS e bloqueios.

As fronteiras completas e as decisões pendentes estão em [`docs/architecture/README.md`](docs/architecture/README.md).

## Restrições atuais

- catálogo real contém somente o placeholder identificado `DEMO-001`; o `CC-001` permanece como rascunho sem mídia pública;
- nenhum dado pessoal ou contato real em código ou fixtures;
- nenhum serviço pago;
- nenhuma chave privilegiada no cliente;
- nenhum endereço exato no contrato público;
- formulário público inativo até aprovação do fluxo LGPD e destino operacional;
- painel administrativo implementado e validado com o primeiro proprietário real; o fluxo foi simplificado para três passos, com seis temas, esquemas Claro/Escuro/Sistema preservados e o novo Black preto/branco com CTA azul, rascunho guiado, prévias autenticadas, marca d'água central `Cris Chaves`, ocultação recuperável de mídia e checklist de publicação;
- 241 testes unitários/arquiteturais, 32 cenários E2E e 52 testes pgTAP locais estão verdes; as 15 migrations foram reconstruídas novamente em 7 de setembro de 2026 e um teste de integração transacional comprova a troca do contrato de publicação entre as migrations 14 e 15; a migration 15 está aplicada no Supabase real, o histórico remoto está alinhado em 15/15 e os 48 controles de segurança remotos foram repetidos com `ROLLBACK`; o ciclo AAL2 de publicar, arquivar, restaurar e republicar foi comprovado pela interface, auditoria, catálogo, página, mídia, sitemap e ausência de endereço privado; o UAT final foi aprovado sem dúvidas ou erros remanescentes, encerrando formalmente a Etapa 4;
- SMTP próprio, domínio HTTPS e origem canônica pertencem ao gate de produção da Etapa 5.
