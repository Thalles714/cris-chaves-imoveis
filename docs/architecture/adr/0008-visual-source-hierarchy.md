# ADR-0008 — Hierarquia visual e uso do Resider

- **Status:** aceita
- **Data:** 3 de setembro de 2026
- **Escopo:** direção visual, conteúdo e ativos

## Contexto

O projeto possui `design_system.html`, referências locais e um site externo indicado pelo cliente. O HTML contém demonstrações de imóveis, preços, contatos, imagens e links para ativos espelhados; esses elementos não são conteúdo aprovado nem dependências permitidas em produção.

## Decisão

Adotar esta hierarquia:

1. O briefing mais recente define função e conteúdo aprovado.
2. [`design_system.html`](../../../design_system.html) é a **base e o contrato visual final**: tokens semânticos, tipografia, seis temas, light/dark/system, grid, raios, sombras, foco, componentes, estados, responsividade e motion.
3. [Resider](https://resider.ca/home) é a **referência visual externa principal** para composição, densidade, acabamento e comportamento.
4. Mockup do cliente e demais templates são referências secundárias.

Em divergência visual, `design_system.html` prevalece sobre Resider. O HTML é referência de extração para uma fonte canônica versionada de tokens/componentes; não é dependência de runtime.

Não copiar do Resider ou de espelhos:

- HTML, CSS, JavaScript ou estrutura proprietária;
- textos, anúncios, preços, imagens, ícones, vídeo ou marca;
- arquivos de fonte, scripts ou chamadas a domínios espelhados;
- comportamento obtido por código copiado.

Geist/Geist Mono continuam como especificação tipográfica do design system, mas os arquivos devem vir de fonte/licença apropriada e documentada, não do espelho do Resider.

## Consequências

- Imóveis, contatos, CRECI, depoimentos e preços presentes no HTML continuam demonstrativos até confirmação.
- `logo.jpeg` e o símbolo demonstrativo não são o logotipo final; o ativo vetorial aprovado é bloqueio de publicação.
- A implementação reproduz princípios e tokens com código próprio, acessível e compatível com `prefers-reduced-motion`.
- Referências externas podem mudar; decisões efetivamente incorporadas precisam ser registradas no design system/localmente, sem hotlink.
- Não usar imagens demonstrativas do HTML em produção.

## Validação

- inventário de assets de produção prova origem/licença;
- nenhum URL de `assets/templates/resider.ca` entra no bundle;
- comparação visual usa `design_system.html` como baseline;
- conteúdo real vem de fonte aprovada e o catálogo de produção começa vazio;
- revisão cobre foco, teclado, contraste e movimento reduzido, não apenas semelhança visual.

## Referências

- [`design_system.html`](../../../design_system.html)
- [Resider — referência principal](https://resider.ca/home)
- [Decisões e bloqueios](../decisions-and-blockers.md)
