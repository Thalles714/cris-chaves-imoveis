# ADR-0001 — React Router v8 e Cloudflare Workers Free

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** runtime, framework e hospedagem

## Contexto

O único custo recorrente autorizado é o domínio. O projeto precisa de SSR, loaders/actions, site público e painel administrativo no mesmo código, com execução próxima ao runtime de produção durante o desenvolvimento.

A documentação oficial atual da Cloudflare apresenta React Router v8 como framework full-stack de primeira classe com Cloudflare Vite plugin, SSR e deploy no Workers. No plano Free, os limites atuais relevantes são 100.000 invocações dinâmicas/dia, 10 ms de CPU por invocação, 128 MB de memória, 50 subrequests por invocação, 64 MiB por Worker, 64 variáveis por Worker e 20.000 arquivos estáticos por versão. Assets estáticos que não invocam o Worker são gratuitos e ilimitados em requisições; SSR invoca o Worker. Os 10 ms do plano Free são impostos pela plataforma: `limits.cpu_ms` serve para aumentar o limite no plano Paid e é rejeitado no Free.

## Decisão

Usar React Router **v8** em Framework Mode, React, Vite, TypeScript estrito e o Cloudflare Vite plugin oficial. Entregar um único Worker com Static Assets. Fixar versões e lockfile; atualizações maiores exigem tarefa de migração e testes.

Não usar Next.js, Vercel, vinext, OpenNext ou adaptação não oficial nesta fase. Não habilitar Workers Paid, binding faturável ou cobrança por uso.

## Consequências

- SSR, autenticação e catálogo dinâmico consomem a cota de invocações do Worker.
- O orçamento de 10 ms de CPU impede processamento pesado no Worker; imagens e vídeos não serão transformados ali.
- I/O assíncrono para Supabase não conta como CPU, mas parsing, validação e renderização contam; medir com `wrangler` e testes representativos.
- Assets com hash devem ser servidos diretamente como Static Assets; evitar `run_worker_first` amplo.
- A aplicação deve falhar fechada em rotas sensíveis quando a cota for excedida; comportamento operacional será testado antes do lançamento.
- Alcançar 70% de qualquer cota é gatilho de revisão, não autorização automática de upgrade.

## Validação

- desenvolvimento e preview executam no runtime local do Workers;
- dry-run registra tamanho comprimido e startup;
- testes medem CPU de rotas representativas;
- nenhuma configuração contém binding pago;
- limites são revalidados na página oficial antes do deploy.

## Referências

- [React Router no Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
- [Limites do Workers](https://developers.cloudflare.com/workers/platform/limits/)
- [Preços do Workers](https://developers.cloudflare.com/workers/platform/pricing/)
- [Static Assets — cobrança e limites](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
