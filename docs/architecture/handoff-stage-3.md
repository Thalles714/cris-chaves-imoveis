# Handoff — Etapa 3: site público, catálogo e conversão segura

- **Status técnico:** concluído localmente e aprovado em revisão humana
- **Status de publicação:** bloqueado; não publicar ainda
- **Data:** 3 de setembro de 2026
- **Escopo:** aplicação e evidências locais; nenhum deploy, serviço pago ou dado real

## Aprovação humana e transição

- revisão humana da Etapa 3 aprovada pelo cliente em 3 de setembro de 2026;
- início da Etapa 4 autorizado pelo cliente na mesma data;
- CRECI público confirmado como `89448`;
- WhatsApp público confirmado como `+55 51 99999-6129`;
- pacote de logotipo recém-criado e aprovado para uso no site, disponível em [`public/brand`](../../public/brand/README.md);
- compra do domínio será realizada quando recomendada durante a preparação de produção; ela não bloqueia a Etapa 4.

## Resultado entregue

- páginas públicas de Início, Imóveis, Detalhe, Sobre, Anuncie, Contato, Privacidade e Termos;
- catálogo vazio real e loaders restritos às projeções públicas allowlisted;
- filtros por URL validados no servidor, paginação e respostas 400/404 sem enumeração;
- galeria acessível e mídia servida somente após validar publicação, sempre `private, no-store` para revogação imediata;
- metadata por rota, canonical, Open Graph, JSON-LD sem endereço, `robots.txt` e sitemap dinâmico sem cache compartilhado;
- controle público dos seis temas e esquemas claro/escuro/sistema, com persistência local;
- filtros recolhíveis no móvel, navegação por teclado, foco visível e movimento reduzido;
- CSP em Report-Only observada no navegador, além de HSTS em HTTPS, `nosniff`, Referrer-Policy, Permissions-Policy e proteção contra frames;
- produção fail-closed: `APP_ENV=production` é explícito no Worker e exige origem canônica HTTPS e Supabase válido;
- configuração isolada de teste, sem herdar credenciais Supabase da máquina;
- contratos completos de Zod, Turnstile Siteverify, rate limit e entrega sem retenção preparados, mas não conectados às rotas públicas enquanto não houver decisão LGPD e destino aprovado.

## Evidências executadas

| Verificação | Resultado |
|---|---|
| Prettier, ESLint e TypeScript | passaram |
| testes unitários | 50/50 passaram em 9 arquivos |
| cobertura unitária | 67,61% statements; 57,88% branches; 80% functions; 69,91% lines |
| E2E desktop e mobile | 22 passaram; 4 verificações matriciais executadas uma vez e ignoradas no projeto móvel |
| acessibilidade | zero violação critical/serious nas páginas públicas verificadas |
| responsividade | 320, 375, 768, 1024, 1280 e 1440 px sem overflow horizontal |
| aparência | seis temas, claro/escuro e persistência passaram |
| regressão visual | baselines da home em desktop claro e mobile escuro |
| desempenho local | DCL e LCP abaixo de 2,5 s, CLS até 0,1 e JavaScript transferido até 400 kB |
| CSP Report-Only | zero evento `securitypolicyviolation` na home exercitada |
| scanner de dados/segredos | passou sem achados |
| fronteira cliente/servidor | passou no código e no bundle |
| build | passou; CSS público 47,17 kB (gzip 9,49 kB) |
| Cloudflare dry-run | passou; upload 1.725,83 KiB (gzip 366,44 KiB), abaixo do limite Free atual |
| inspeção visual real | home e catálogo móvel revisados no navegador; landmarks, zero overflow e catálogo sem imagens fictícias |

Os baselines ficam em `tests/e2e/public-quality.spec.ts-snapshots/`. Os números de desempenho são um gate reproduzível local, não substituem a auditoria Lighthouse em domínio real da Etapa 5.

## Segurança e privacidade

- Não há endereço exato no DTO, HTML, JSON-LD ou bundle público.
- Não há analytics, pixel, cookie não essencial, lead persistido, imóvel demonstrativo ou preço fictício.
- `APP_ENV` ausente é tratado como produção, fechando a aplicação se as configurações obrigatórias não existirem.
- Mídia e sitemap usam `private, no-store`; arquivar um imóvel é refletido na próxima leitura.
- WhatsApp `+55 51 99999-6129` e CRECI `89448` estão aprovados para integração pela Etapa 4.
- Contato e Anuncie respondem genericamente com indisponibilidade e não armazenam dados. Os controles de formulário estão desabilitados; isso é uma decisão deliberada do ADR-0009.

## Conteúdos e decisões que bloqueiam produção

- confirmar a assinatura pública exata;
- comprar o domínio e aprovar a origem canônica antes da configuração e publicação em produção;
- aprovar textos legais finais de Privacidade e Termos;
- decidir base legal, destino operacional, retenção e responsável pelo fluxo Contato/Anuncie; só então conectar Turnstile, rate limit e entrega;
- provisionar Supabase Free em região aprovada, cadastrar apenas chaves adequadas e validar dados reais publicados;
- validar o namespace de rate limit na conta Cloudflare e cadastrar segredos via mecanismo de secrets;
- concluir titularidade, recuperação de contas, backup externo e restore real descritos no handoff anterior;
- executar Lighthouse e CSP Report-Only no domínio real antes de converter a política em enforcement.

## Gate

**ETAPA 3 APROVADA EM REVISÃO HUMANA.** O site público funciona com catálogo vazio, sem dados fictícios ou vazamento privado, e os gates locais estão verdes. O cliente autorizou o início da Etapa 4 em 3 de setembro de 2026. **A publicação continua NO-GO** até que os bloqueios de produção remanescentes sejam resolvidos.

Referências Cloudflare revalidadas nesta etapa: [limites do Workers](https://developers.cloudflare.com/workers/platform/limits/), [variáveis e segredos locais](https://developers.cloudflare.com/workers/local-development/environment-variables/) e [configuração do Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/).
