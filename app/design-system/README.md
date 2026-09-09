# Cris Chaves Design System

Versão canônica: `1.2.0`.

Esta fundação traduz o contrato visual de `design_system.html` para React sem
copiar conteúdo, fontes ou ativos da referência externa. `tokens.ts` é a fonte
versionada para valores e tipos; `../styles/tokens.css` é o espelho consumido
pelos componentes.

A versão `1.2.0` transforma cada tema em uma atmosfera completa: fundos,
superfícies, textos, bordas, sombras e cores de ação próprias nos esquemas Claro
e Escuro. O Escuro original continua separado do Black. O Black permanece
deliberadamente preto, com detalhes brancos e CTAs azuis, independentemente da
paleta selecionada. O esquema Sistema continua alternando somente entre Claro e
Escuro; a fonte TypeScript e o espelho CSS permanecem sincronizados.

## Integração

1. Carregue Geist e Geist Mono localmente no documento da aplicação.
2. Importe `../styles/design-system.css` uma única vez no CSS raiz.
3. Renderize `AppearanceScript` no `head`, antes do conteúdo, para evitar troca
   visual durante a hidratação.
4. Envolva a aplicação em `AppearanceProvider` para expor tema, esquema e seus
   setters.
5. Importe componentes pelo barrel `../components/ui`.

Temas disponíveis: Horizonte, Atlântico, Araucária, Dunas, Entardecer e
Grafite. Esquemas disponíveis: Claro, Escuro, Black e Sistema. As preferências
usam as chaves `cris.theme` e `cris.colorScheme`, preservando o contrato
original.

Os overlays implementam foco inicial, contenção de foco, fechamento por Escape,
bloqueio de rolagem e retorno ao gatilho. Estados importantes são comunicados
por texto e atributos ARIA; cor é apenas reforço.
