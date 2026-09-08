# Handoff — Etapa 1: fundação, arquitetura e contrato técnico

- **Data:** 2026-09-03
- **Status:** gate técnico aprovado
- **Escopo seguinte:** não iniciado

## Resultado

A fundação executável foi criada na raiz com React Router 8 em Framework Mode, React 19, Vite 8, TypeScript strict, pnpm e Cloudflare Vite plugin. O catálogo, banco, autenticação, painel e conteúdo público definitivo permanecem fora desta etapa.

A hierarquia visual está formalizada: `design_system.html` é o contrato obrigatório; Resider é a referência principal de composição e comportamento, sem reutilização de código, marca, conteúdo, imagens ou fontes.

## Entregas

- aplicativo SSR compatível com o runtime local do Cloudflare Workers;
- tokens canônicos versionados, Geist/Geist Mono locais, seis temas e esquemas light/dark/system persistidos;
- biblioteca-base acessível com botões, icon button, badges, campos, alertas, tabs, disclosure, paginação, breadcrumb, spinner, skeleton, empty state, modal, drawer, card e navegações pública/admin;
- tela de fundação com conteúdo exclusivamente sintético e catálogo explicitamente vazio;
- fronteiras de domínio público, validação, admin server-only e repositório server-only;
- ESLint, Prettier, TypeScript, Vitest, Testing Library, Playwright e axe;
- varredura de segredos/dados pessoais e inspeção pós-build da fronteira cliente/servidor;
- CI com lockfile congelado, permissões mínimas e GitHub Actions fixadas por SHA;
- configuração Wrangler sem segredos, sem bindings faturáveis e com CPU limitada a 10 ms;
- visão arquitetural, oito ADRs, política de ambientes, matriz ASVS 5.0 L2 inicial e checklist de decisões.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `pnpm install` e lockfile | aprovado; grafo reproduzível com pnpm 11 |
| dados sensíveis | aprovado; nenhum segredo/PII na superfície executável, configurações ou testes |
| formatação e lint | aprovados; zero aviso/erro |
| TypeScript strict | aprovado para app, Worker, configurações e testes |
| testes unitários/arquiteturais | 5 de 5 aprovados |
| build de produção | aprovado |
| bundle do navegador | aprovado; nenhum marcador server-only/segredo |
| Wrangler dry-run | aprovado; 769,21 KiB de upload e 162,40 KiB compactado |
| E2E desktop/mobile | 4 de 4 aprovados |
| acessibilidade automatizada | nenhuma violação crítica ou grave nas regras WCAG A/AA selecionadas |
| inspeção em navegador | modal/Escape/retorno de foco, tema escuro persistido, menu móvel e ausência de overflow horizontal aprovados |

O gate agregado pode ser repetido com:

```bash
pnpm check
```

## Gate da Etapa 1

- [x] instalação reproduzível a partir do lockfile;
- [x] lint, typecheck, testes e build aprovados;
- [x] nenhum segredo ou dado pessoal no código, fixtures ou bundle;
- [x] tokens do design system em fonte canônica versionada;
- [x] temas e componentes-base com teclado, foco e movimento reduzido;
- [x] fronteira cliente/servidor verificada no código e no bundle;
- [x] preview no runtime local do Cloudflare;
- [x] tamanho do Worker com ampla margem dentro do plano Free;
- [x] nenhuma implementação das etapas 2 a 5 antecipada.

## Decisões humanas ainda pendentes

Os bloqueios completos estão em [`decisions-and-blockers.md`](decisions-and-blockers.md). Antes de qualquer publicação, confirmar principalmente:

- nome profissional público e número/UF do CRECI, pois os materiais divergem;
- WhatsApp e escopo do formulário de leads;
- logotipo vetorial aprovado;
- escopo comercial e regiões finais;
- RPO/RTO, cadência/destino do backup e responsável operacional;
- disponibilidade de `sa-east-1` no Supabase Free no provisionamento;
- política de privacidade/cookies para embeds de vídeo.

## Observação local

Cinco diretórios intermediários de scaffold permanecem apenas na máquina local e estão ignorados pelo Git. Eles não participam do build, testes ou bundle. Sua remoção recursiva deve ser feita somente após autorização explícita de limpeza.

## Próximo passo controlado

A Etapa 2 só deve começar depois da revisão humana deste handoff e do gate. Ela criará dados, autenticação, RLS e fundação segura de mídia sem implementar ainda o site público ou o painel final.
