# Cris Chaves Imóveis

Site público e painel administrativo desenvolvidos para cliente, com React Router, TypeScript, Supabase e PostgreSQL. O fluxo inclui autenticação, permissões, tratamento de mídia e publicação de imóveis.

**[Visitar o site](https://crischaves.com.br/)** · [Autor](https://github.com/Thalles714)

O catálogo pode conter anúncios demonstrativos identificados. O estado operacional, as pendências e as evidências de publicação devem ser consultados na documentação; a presença de testes no repositório não representa uma garantia de aprovação atual.

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

- o catálogo inicial pode conter placeholders identificados como demonstrativos, com mídia segura e sem endereço privado; eles não representam oferta real e podem ser arquivados pelo cliente;
- nenhum dado pessoal ou contato real em código ou fixtures;
- nenhum serviço pago;
- nenhuma chave privilegiada no cliente;
- nenhum endereço exato no contrato público;
- formulário público inativo até aprovação do fluxo LGPD e destino operacional;
- painel administrativo implementado e validado com o primeiro proprietário real; o fluxo foi simplificado para três passos, com seis temas, esquemas Claro/Escuro/Sistema preservados e o novo Black preto/branco com CTA azul, rascunho guiado, prévias autenticadas, marca d'água central `Cris Chaves`, ocultação recuperável de mídia e checklist de publicação;
- suítes unitárias, arquiteturais, E2E e SQL estão no projeto; conferir os relatórios e a integração contínua para o estado da revisão avaliada;
- `crischaves.com.br` está delegado à Cloudflare, com TLS e Worker de produção implantados. O go-live ainda depende da validação pós-deploy registrada em [`docs/architecture/production-go-live-evidence.md`](docs/architecture/production-go-live-evidence.md);
- não há backup próprio nesta fase: o risco temporário de recadastro manual foi aceito na ADR-0010 e deve ser revisto quando qualquer gatilho ali definido ocorrer.
