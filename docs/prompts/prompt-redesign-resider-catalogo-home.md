# Prompt de execução — catálogo primeiro e home editorial inspirados na Resider

> Cole todo o conteúdo deste arquivo em uma nova tarefa de implementação. O executor pode delegar trabalhos independentes a subagentes, mas continua responsável por conferir cada alteração, integrar sem conflitos e executar o gate completo.

## Papel e resultado esperado

Você é o agente principal de uma evolução visual e funcional do site **Cris Chaves Imóveis**, no workspace:

`C:\Users\Administrator\Projects\Cris Chaves Imoveis`

Implemente uma experiência pública “catálogo primeiro”, inspirada nos princípios de composição, densidade, responsividade e comportamento observados na Resider, sem copiar código, textos, ativos, marca ou identidade visual da referência.

O resultado deve:

1. fazer a rota `/` abrir diretamente o catálogo de imóveis;
2. mover a home institucional para `/home`;
3. apresentar os imóveis com cards grandes, fotográficos, densos e fáceis de comparar;
4. transformar busca e filtros em uma barra compacta e um modal/drawer acessível;
5. reorganizar `/home` em dobras editoriais centralizadas, com uma ideia por dobra;
6. tornar `/anuncie-seu-imovel` uma página de conversão focada e honesta;
7. criar `/regioes` usando somente as cinco regiões aprovadas;
8. aplicar motion discreto, performático, interruptível e compatível com movimento reduzido;
9. preservar integralmente privacidade, DTOs públicos, catálogo dinâmico, SEO, acessibilidade, temas e infraestrutura existentes.

Não produza somente um plano. Faça a implementação, valide-a visual e mecanicamente e entregue um relatório final com evidências.

## Fontes de verdade e ordem de precedência

Leia antes de editar:

1. `AGENTS.md`;
2. `README.md` e `CONTEXT.md`;
3. `design_system.html` — contrato visual obrigatório;
4. `docs/architecture/adr/0008-visual-source-hierarchy.md`;
5. `docs/architecture/adr/0003-public-admin-separation-public-dto.md`;
6. `docs/architecture/adr/0009-no-persisted-leads-until-legal-decision.md`;
7. `docs/audits/auditoria-site-publico-2026-09-04.md`;
8. as rotas, componentes, estilos e testes públicos atuais.

Em caso de divergência, o briefing e o `design_system.html` prevalecem sobre a Resider. Preserve Geist/Geist Mono, os seis temas, light/dark/system, os tokens `--cc-*`, a marca Cris Chaves, o CRECI e as regras de foco/contraste.

Use as páginas abaixo apenas como referência visual e comportamental. Reabra-as com uma ferramenta de navegador para confirmar que não mudaram antes de implementar:

- `https://resider.ca/`
- `https://resider.ca/home`
- `https://resider.ca/sell`
- `https://resider.ca/bc`

Não copie HTML, CSS, JavaScript, textos, imagens, ícones, mapas, dados, preços, anúncios, marcas, fontes ou chamadas de rede da Resider.

## Leitura consolidada da referência

### 1. Catálogo em `https://resider.ca/`

Padrões úteis observados:

- a página começa no produto, sem hero de marketing;
- header fixo e compacto, com marca/navegação à esquerda, busca central e ações à direita;
- busca e filtros permanecem imediatamente acessíveis enquanto os imóveis dominam a tela;
- grade desktop com três cards por linha e gutters pequenos;
- cards com imagem dominante, conteúdo organizado em faixas e metadados alinhados;
- primeira faixa: tipo/ano, preço, título/endereço e localização;
- segunda faixa: quartos, banheiros, área e vagas em colunas comparáveis;
- terceira faixa: código, origem e recência;
- checkbox de comparação no canto superior esquerdo e favorito no direito;
- modal de filtros central, largo, com cabeçalho e rodapé fixos e corpo rolável;
- no mobile, uma coluna, busca/filtro compactos no topo e navegação inferior fixa.

Aplicação no Cris Chaves:

- adotar produto primeiro, header de catálogo, grade, hierarquia dos cards e modal/drawer de filtros;
- substituir endereço exato por **título + bairro + cidade**, porque o DTO público proíbe endereço e coordenadas;
- mostrar somente dados allowlisted já presentes em `PublicPropertySummary`;
- não mostrar controles que não funcionam;
- não implementar comparação, mapa, modo híbrido, salvar busca ou conta nesta entrega;
- não renderizar coração decorativo. Favoritos só podem aparecer em trabalho futuro com comportamento e persistência claramente definidos.

### 2. Home em `https://resider.ca/home`

Padrões úteis observados:

- hero curto e centralizado, com uma promessa, uma linha de apoio, busca larga e chips;
- dobras posteriores contidas em uma coluna ampla central, com muito respiro;
- cada dobra comunica uma capacidade específica;
- composição recorrente em duas colunas: texto curto de um lado e demonstração visual do outro;
- painéis grandes e suaves criam continuidade editorial;
- encerramento com proposta de venda e formulário como tarefa independente;
- no mobile, a hero vira uma composição vertical e os chips quebram de forma controlada.

Aplicação no Cris Chaves:

- manter a assinatura própria da “linha do litoral”, o azul/laranja e a linguagem pessoal do Cris;
- não replicar os módulos de IA, staging, mapa, financiamento ou estatísticas;
- usar as dobras para demonstrar capacidades reais: busca por descrição, seleção de imóveis, conhecimento local, acompanhamento pessoal e apresentação de imóvel;
- usar conteúdo verdadeiro e conciso. Não inventar números, depoimentos, parceiros, fotos ou resultados comerciais.

### 3. Venda em `https://resider.ca/sell`

Padrões úteis observados:

- desktop ocupa a viewport abaixo do header em split-screen;
- painel esquerdo concentra título, formulário, benefícios e prova;
- painel direito é contextual e visual;
- no mobile, a tarefa principal fica acima da dobra e o painel secundário é removido ou rebaixado;
- CTA único e inequívoco.

Aplicação no Cris Chaves:

- adotar foco, hierarquia e redução de distrações;
- não copiar mapa, globo, rede de agentes, métricas ou formulário ativo;
- não ativar nem persistir leads: a ADR-0009 continua valendo;
- usar WhatsApp somente quando `PUBLIC_WHATSAPP_NUMBER` estiver configurado e válido;
- quando não estiver, direcionar com honestidade para `/contato`, sem simular envio;
- o lado visual deve usar CSS/identidade própria ou mídia real aprovada. Nunca usar foto demonstrativa ou endereço privado.

### 4. Áreas em `https://resider.ca/bc`

Padrões úteis observados:

- cabeçalho editorial simples;
- navegação por âncoras;
- cidades principais em cards;
- diretório hierárquico de áreas e bairros;
- FAQ no final;
- mobile empilha os cards e mantém as âncoras fáceis de tocar.

Aplicação no Cris Chaves:

- criar uma versão proporcional ao conteúdo real, sem diretório artificial;
- usar `approvedRegions` como fonte única: Cidreira, Tramandaí, Balneário Pinhal, Magistério e Quintão;
- cada região deve apontar para `/?cidade=<região>`;
- não inventar bairros, estatísticas, preços médios ou textos de mercado;
- incluir apenas FAQ factual sobre área de atuação, busca e proteção da localização exata.

## Direção visual própria

Não redesenhe o projeto como um clone azul da Resider. A direção do Cris Chaves deve ser reconhecível:

- **sujeito:** imóveis e vida no Litoral Norte Gaúcho;
- **audiência:** compradores, locatários e proprietários que valorizam atendimento pessoal e clareza;
- **trabalho principal da raiz:** permitir descobrir e comparar imóveis publicados imediatamente;
- **assinatura:** uma linha costeira/horizonte abstrata, derivada dos tokens do tema, usada com parcimônia na home e em estados vazios;
- **risco estético deliberado:** a raiz assume aparência utilitária e fotográfica quase de produto; `/home` mantém a narrativa humana e atmosférica;
- **paleta/tipo:** derivar apenas de `--cc-*`, Geist e Geist Mono;
- **densidade:** catálogo compacto; home respirada; página de venda focada;
- **raios e sombras:** respeitar o design system. Não importar os raios/sombras da referência.

## Arquitetura de rotas obrigatória

Implemente esta arquitetura:

- `/` — catálogo canônico;
- `/home` — home institucional;
- `/imoveis` — redirect permanente `308` para `/`, preservando toda a query string;
- `/imoveis/:slug` — detalhe do imóvel, mantido;
- `/regioes` — nova página de regiões aprovadas;
- `/anuncie-seu-imovel` — página de conversão revisada;
- demais rotas públicas e todas as rotas administrativas — preservadas.

Requisitos de navegação e SEO:

- logo pode levar a `/home`; “Imóveis” leva a `/`;
- “Início” leva a `/home`;
- adicionar “Regiões” apontando para `/regioes`;
- o estado ativo de `/` deve ser exato e não marcar todas as rotas como ativas;
- atualizar footer, breadcrumbs e todos os links públicos de busca/listagem;
- preservar detalhes em `/imoveis/:slug`;
- sitemap deve conter `/`, `/home`, `/regioes` e não listar `/imoveis`, que será redirect;
- canonical do catálogo deve ser `/`; canonical da home deve ser `/home`;
- atualizar metadados para que `/` descreva o catálogo e `/home` descreva a proposta institucional;
- buscas como `/imoveis?cidade=...` devem redirecionar para `/?cidade=...` sem perder filtros;
- não alterar as rotas `/admin/imoveis*`.

Uma implementação aceitável é manter `app/routes/properties.tsx` como módulo do index, mover `app/routes/home.tsx` para a rota `/home` e criar uma pequena rota server-only de compatibilidade para o redirect. Evite duplicar loaders e componentes.

## Catálogo raiz — especificação detalhada

### Header e barra de ferramentas

No desktop:

- header sticky/fixo, visualmente compacto, com fundo translúcido compatível com os temas;
- marca/CRECI legíveis à esquerda;
- navegação enxuta;
- busca do catálogo no centro, com largura flexível;
- botão “Filtros” e menu de aparência à direita;
- CTA de contato pode permanecer, mas não deve roubar prioridade da busca.

No mobile:

- manter marca compacta, campo de busca e botão de filtros na primeira área útil;
- não copiar a barra inferior da Resider nesta entrega: o site tem poucas rotas e o menu existente é suficiente;
- nenhum controle pode ficar menor que o touch target do design system;
- evitar truncamento que esconda a função do filtro ou da busca.

A busca deve continuar sendo um `<form method="get">` real, submetendo para `/`, com `busca`, limites e validação já existentes. Não chame a busca de IA e não use “Ask AI”.

### Resultados

- remover a hero alta do catálogo atual;
- abaixo do header, renderizar uma barra fina com quantidade de resultados, resumo da busca, chips de filtros ativos, “Limpar” e ordenação somente se existir suporte real;
- não inventar ordenação no cliente. Se não houver contrato/repositório para ordenar, não mostre o controle;
- desktop largo: três colunas;
- desktop/tablet intermediário: duas colunas;
- mobile: uma coluna;
- gutters compactos e consistentes;
- paginação deve preservar filtros e continuar server-rendered;
- estado vazio deve permanecer honesto e trazer ações para limpar filtros, falar com Cris ou ir para `/home`.

### Cards

Redesenhe o `PropertyCard` público para leitura em camadas:

1. mídia grande, sem crop imprevisível e com aspect ratio consistente;
2. código público e situação comercial sobre a imagem ou em uma faixa clara;
3. finalidade/tipo, título, bairro/cidade e preço;
4. faixa de fatos comparáveis: dormitórios, banheiros, área privativa e vagas, ocultando apenas campos nulos;
5. link com área clicável grande, sem colocar botão interativo dentro de link.

Use somente:

- `publicCode`, `slug`, `title`, `purpose`, `city`, `neighborhood`, `dealStatus`, `propertyType`, `priceDisplay`, `priceInCents`, `bedrooms`, `suites`, `bathrooms`, `parkingSpaces`, `privateAreaSquareMeters`, `coverImageUrl`, `coverImageAlt`.

Não mostrar endereço, coordenadas, nome do proprietário, notas, origem administrativa, datas privadas ou qualquer campo fora do DTO. A Resider usa endereço completo; o Cris Chaves não pode usar.

Imagens:

- preservar `loading="lazy"` e `decoding="async"` nos cards;
- definir dimensões/aspect ratio para evitar CLS;
- estado sem foto deve ser intencional e derivado da assinatura costeira, sem imagem falsa;
- não hotlinkar mídia externa;
- não usar a primeira imagem como background CSS se isso prejudicar semântica ou carregamento.

### Filtros

Substitua o sidebar permanente por:

- desktop: `Modal` largo e central;
- mobile: `Drawer` a partir da direita ou bottom sheet acessível, reutilizando os componentes existentes;
- cabeçalho: “Filtros” + quantidade atual;
- corpo rolável;
- rodapé sticky com “Limpar” e “Mostrar resultados”;
- campos reais: busca, finalidade, tipo, cidade, bairro, preço mínimo/máximo, dormitórios e vagas;
- valores atuais devem permanecer preenchidos após submissão;
- o formulário continua GET para `/`;
- Escape, clique no backdrop, foco inicial, focus trap e retorno de foco ao gatilho são obrigatórios;
- botão de filtros deve refletir `aria-expanded` e `aria-controls`;
- chips ativos devem ter links de remoção que preservem os demais parâmetros;
- não adicionar filtros que o contrato `parsePublicCatalogSearch` não suporta.

Extraia uma composição reutilizável (`CatalogFilters`, `CatalogToolbar` ou nomes coerentes com o repositório) em vez de duplicar o formulário em desktop/mobile.

## Home institucional em `/home`

### Hero

- uma promessa principal curta, centralizada e específica ao litoral;
- uma linha de apoio curta;
- busca larga para `/`, com placeholder em português e sem promessa de IA;
- chips reais: “Perto do mar”, “Para comprar”, “Para alugar” e até duas regiões aprovadas;
- um CTA secundário para anunciar;
- preservar a linha do litoral como elemento de assinatura, não como decoração dominante;
- a hero deve ocupar aproximadamente uma viewport parcial, não 45rem rígidos em todas as telas.

### Dobras editoriais

Use uma largura externa de até `--cc-container` e painéis internos com leitura confortável. Cada dobra deve ter uma única ideia, eyebrow funcional, H2 curto, copy de no máximo 2–3 frases e uma demonstração real.

Ordem recomendada:

1. **Busca por descrição** — mostrar como cidade, bairro, faixa, estilo e características entram na busca real;
2. **Imóveis em destaque** — até três itens vindos do repositório; se vazio, manter estado vazio honesto;
3. **Conhecimento local** — cinco regiões aprovadas, com links filtrados para `/`;
4. **Como o Cris acompanha** — ouvir, selecionar e conversar, em três passos reais;
5. **Apresente seu imóvel** — CTA para `/anuncie-seu-imovel`.

As seções podem alternar texto e demonstração no desktop, mas devem permanecer centralizadas como conjunto. No mobile, empilhar texto antes da demonstração e preservar o ritmo vertical. Não usar numeração decorativa quando não houver sequência real; a numeração só faz sentido na seção de processo.

## Regiões em `/regioes`

Crie uma página pequena e útil, não uma réplica vazia de `/bc`:

- eyebrow “Onde eu atuo”;
- H1 e introdução curtos;
- navegação por âncora somente se houver ao menos duas seções reais;
- grade com as cinco regiões de `site.regions`;
- cada card aponta para `/?cidade=<nome codificado>`;
- uma seção “Como funciona a localização pública” explicando que cidade e bairro podem aparecer, mas endereço exato é protegido;
- FAQ factual, curta e sem Schema inventado. Só adicione FAQPage JSON-LD se o conteúdo estiver visível, literal e tecnicamente válido;
- nenhum dado de mercado, população, preço médio ou bairro não aprovado.

Não duplique as cinco regiões em JSX. Consuma `site.regions`/`approvedRegions`.

## Página `/anuncie-seu-imovel`

Reorganize a página para uma tarefa clara:

- eyebrow e H1 fortes;
- texto curto sobre conversa, organização das informações e apresentação cuidadosa;
- CTA primário “Falar com Cris” via WhatsApp quando configurado;
- fallback para `/contato` quando não configurado;
- benefícios reais: orientação inicial, revisão de informações, seleção de mídias aprovadas e apresentação no catálogo;
- processo em quatro passos pode permanecer, mas deve ser mais compacto;
- não exibir formulário ativo enquanto `contactFormAvailable` for `false`;
- se o formulário visual permanecer, deve estar claramente desabilitado e explicar o canal disponível, sem coletar ou persistir dados;
- desktop pode usar split layout; o painel visual deve ser CSS/brand ou mídia aprovada, nunca mapa com endereço exato;
- mobile coloca título e CTA acima da dobra, remove/rebaixa o painel secundário e evita scroll interno aninhado.

## Motion e microinterações

Use CSS/WAAPI e IntersectionObserver apenas quando necessário. Não adicione Framer Motion, GSAP, Three.js ou dependência semelhante.

Adicione aos tokens, se ainda não existirem:

```css
--cc-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--cc-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--cc-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Valores obrigatórios:

- botão pressionado: `scale(0.97)`, `140ms`, `var(--cc-ease-out)`; retorno deve parecer mais rápido, sem atraso perceptível;
- popover pequeno: `180ms`, `var(--cc-ease-out)`, origem no gatilho;
- modal de filtros: backdrop por opacity + painel `translateY(12px) scale(0.97)` para `none`, `220ms`, `var(--cc-ease-out)`;
- drawer mobile: `translateX(100%)` para `none`, `280ms`, `var(--cc-ease-drawer)`;
- hover de card apenas em `@media (hover: hover) and (pointer: fine)`: `translateY(-2px)` e imagem no máximo `scale(1.015)`, `220ms`, `var(--cc-ease-out)`;
- não animar `box-shadow` nos cards da grade; prefira transform, opacity e border-color;
- reveal de marketing em `/home`: opacity + `translateY(14px)`, `480ms`, `var(--cc-ease-out)`, uma vez por seção;
- stagger de filhos entre `40ms` e `60ms`, sem bloquear interação;
- a linha costeira contínua, se mantida, só pode animar `transform` e/ou `opacity`; remova a animação atual de `stroke-dashoffset`, que repinta uma grande superfície continuamente;
- não usar `transition: all`, `ease-in`, `scale(0)` ou animação de width/height/top/left/margin/padding;
- catálogo, paginação e teclado não recebem entrada ornamental; são interações frequentes.

Progressive enhancement para reveal:

- o HTML deve nascer visível;
- só esconda elementos quando o JavaScript tiver marcado explicitamente o documento como pronto para motion;
- se IntersectionObserver falhar, o conteúdo permanece visível;
- não causar CLS.

Movimento reduzido:

- `html { scroll-behavior: auto; }` em `prefers-reduced-motion: reduce`;
- remover deslocamento/escala da hero, reveals, cards, modal, drawer, menu e painel de aparência;
- manter feedback útil por opacity/cor com duração curta quando isso ajudar compreensão;
- não zerar indiscriminadamente spinner, skeleton ou todo elemento `cc-*` para `0.001ms` se isso remover feedback de estado;
- corrigir o painel `.appearance-panel`, hoje fora do alcance completo das regras reduzidas;
- corrigir a origem do menu mobile para o lado do gatilho;
- gatear todos os hovers com movimento para dispositivos com hover fino.

Referência observada, não alvo para copiar: a Resider usa reveals de `opacity + translateY(22px)` por `700ms`, chips por `550ms`, caret contínuo por `1050ms` e placeholders animados por `720ms`. Para o Cris, use os valores mais curtos e sóbrios definidos acima; não implemente caret/typewriter nem placeholders rotativos.

## Funcionalidades: implementar, adiar e rejeitar

### Implementar agora

- catálogo canônico na raiz;
- busca textual real no header/toolbar;
- modal/drawer de filtros reais;
- chips de filtros ativos e remoção individual;
- cards mais comparáveis e fotográficos;
- home em `/home` com dobras editoriais reais;
- regiões aprovadas e links filtrados;
- página de anúncio focada com CTA seguro;
- motion e correções de acessibilidade/performance;
- redirect legado, canonical, sitemap e testes.

### Adiar para uma decisão de produto/dados própria

- favoritos persistentes;
- salvar busca;
- comparar imóveis;
- ordenação adicional;
- mapa e visualização híbrida;
- sugestões/autocomplete;
- estatísticas por região;
- calculadora financeira;
- analytics de busca/conversão.

### Não implementar nesta entrega

- “Ask AI” ou qualquer rótulo de IA sem serviço real;
- mapa que revele localização exata;
- conta/login público;
- formulário que envie ou persista lead;
- números de vendas, avaliações, depoimentos ou provas sociais inventadas;
- conteúdo, fotos ou dados copiados da Resider;
- dependência paga, nova cobrança, Vercel ou Cloudinary.

## Delegação sugerida

O agente principal pode delegar tarefas independentes. Use no máximo a concorrência disponível e evite que dois agentes editem o mesmo arquivo central simultaneamente.

1. **Subagente de rotas/SEO** — `app/routes.ts`, redirect legado, canonical, sitemap, breadcrumbs e testes de URL;
2. **Subagente de catálogo** — toolbar, filtros, cards, query preservation e responsividade;
3. **Subagente editorial** — `/home`, `/regioes`, `/anuncie-seu-imovel` e copy factual;
4. **Subagente de motion/QA** — tokens, reduced motion, screenshots e matriz de acessibilidade/performance.

Antes de delegar, o principal deve fornecer a cada subagente:

- escopo fechado;
- arquivos permitidos/proibidos;
- fontes de verdade;
- critérios de aceite;
- instrução para não sobrescrever mudanças alheias;
- pedido de devolver diff/achados e não declarar sucesso sem testes.

O agente principal deve reler e integrar cada alteração. Não aceite cegamente resultados de subagentes.

## Arquivos prováveis

Espere tocar principalmente:

- `app/routes.ts`;
- `app/routes/home.tsx`;
- `app/routes/properties.tsx`;
- uma nova rota de redirect para `/imoveis`;
- uma nova rota `app/routes/regions.tsx`;
- `app/routes/sell.tsx`;
- `app/routes/sitemap.ts`;
- `app/routes/property-detail.tsx`;
- `app/components/public/site-shell.tsx`;
- `app/components/public/property-presenter.tsx`;
- novos componentes públicos de toolbar/filtros/reveal, se necessários;
- `app/components/ui/property-card.tsx`;
- `app/components/ui/overlays.tsx` somente se necessário para atributos/comportamento acessível;
- `app/styles/tokens.css`;
- `app/styles/components.css`;
- `app/app.css`;
- testes unitários/E2E e snapshots públicos.

Não tocar sem necessidade comprovada:

- `app/routes/admin-*`;
- `app/components/admin/*`;
- `app/modules/properties/admin/*`;
- migrations, Supabase, RLS, Storage e mídia administrativa;
- `workers/*`, `wrangler.jsonc` e bindings;
- dados privados ou `.dev.vars`.

Se algum binding Cloudflare for alterado apesar dessa restrição, pare, consulte a documentação atual exigida em `AGENTS.md` e execute `npx wrangler types`. A expectativa é não alterar bindings.

## Restrições de engenharia

- preserve SSR e loaders server-only;
- não busque dados públicos no cliente quando o loader já os fornece;
- preserve a allowlist de query params e rejeição de filtros ambíguos;
- preserve separação público/admin;
- não faça DTO público por `omit` de entidade privada;
- não consulte `*` no banco;
- não adicione conteúdo imobiliário fictício;
- não mude contratos administrativos para facilitar UI pública;
- use links/forms reais e semânticos antes de JavaScript imperativo;
- componentes clicáveis precisam funcionar por teclado;
- não aninhe botão dentro de link;
- imagens precisam de alt, dimensões estáveis e política de carregamento coerente;
- mantenha CSP, security headers e `no-store` onde já definidos;
- respeite o orçamento atual de JavaScript transferido de no máximo `400 KB` nos testes;
- preserve LCP local abaixo de `2.5 s` e CLS `<= 0.1`;
- não instale dependências para resolver algo que CSS/React atual já resolve.

## Sequência de execução

1. faça inventário do estado atual e registre `git status --short` sem alterar trabalho alheio;
2. revalide as quatro páginas de referência em desktop e mobile;
3. escreva um mini plano de design com layout, tokens e assinatura antes de codar;
4. ajuste rotas/SEO e faça os redirects funcionarem;
5. extraia componentes compartilhados do catálogo;
6. implemente a raiz catálogo e seus filtros;
7. implemente `/home`, `/regioes` e a revisão de `/anuncie-seu-imovel`;
8. aplique motion e correções de reduced motion;
9. atualize testes e snapshots;
10. rode o gate completo;
11. faça inspeção visual desktop/mobile em claro/escuro e corrija até não haver overflow, corte ou conteúdo escondido;
12. entregue handoff com arquivos alterados, decisões, testes e itens conscientemente adiados.

## Critérios de aceite funcionais

- `GET /` retorna catálogo e status 200;
- `GET /home` retorna home institucional e status 200;
- `GET /imoveis?cidade=Tramanda%C3%AD&finalidade=venda` redireciona 308 para `/?cidade=Tramanda%C3%AD&finalidade=venda`;
- `/imoveis/:slug` continua funcionando;
- busca e filtros no catálogo alteram a URL e preservam valores;
- filtro inválido/duplicado continua retornando 400;
- limpar um chip preserva os demais filtros;
- modal/drawer abre, fecha por Escape/backdrop, prende foco e devolve foco;
- cards nunca expõem endereço exato;
- página de regiões gera exatamente as regiões aprovadas a partir da configuração;
- formulário público continua desabilitado e nenhum lead é persistido;
- nenhuma rota/admin foi alterada funcionalmente;
- catálogo vazio continua íntegro e convincente sem dados falsos.

## Critérios de aceite visual e responsivo

Validar pelo menos em 320, 375, 768, 1024, 1280 e 1440 px:

- nenhum overflow horizontal;
- header não encobre conteúdo;
- busca e filtros permanecem utilizáveis;
- grade 1/2/3 colunas nos breakpoints apropriados;
- cards de uma mesma linha têm faixas alinhadas sem forçar dados nulos;
- texto não depende de truncamento para ser compreensível;
- CTA principal da página de anúncio aparece cedo no mobile;
- `/home` tem composição centralizada e uma ideia por dobra;
- temas claro/escuro e seis paletas continuam legíveis;
- foco visível e contraste atendem WCAG AA;
- motion reduzido remove deslocamento e movimento contínuo;
- imagens não provocam layout shift.

Crie/atualize snapshots para:

- catálogo desktop claro;
- catálogo mobile escuro;
- modal de filtros desktop;
- drawer de filtros mobile;
- home desktop claro;
- home mobile escuro;
- página de regiões mobile;
- página de anúncio desktop e mobile.

## Verificação obrigatória

Rode, no mínimo:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
```

Depois rode o gate canônico:

```bash
pnpm check
```

Faça também uma inspeção manual com navegador:

- teclado completo;
- Escape e retorno de foco;
- filtro em desktop/mobile;
- claro/escuro e os seis temas;
- `prefers-reduced-motion: reduce`;
- hover somente com ponteiro fino;
- throttling de rede para conferir skeleton/estado de imagem;
- DevTools Animations em 10% para verificar origem, duração e interrupção;
- console sem erros e sem violações CSP.

## Entrega final

O relatório final deve começar pelo resultado alcançado e incluir:

- resumo das mudanças visuais/funcionais;
- arquitetura final de rotas;
- componentes criados ou extraídos;
- arquivos alterados;
- testes executados e contagens;
- screenshots/evidências geradas;
- confirmação explícita de que endereço exato, leads, dados falsos e ativos da Resider não entraram no bundle;
- funcionalidades adiadas com motivo;
- qualquer risco ou bloqueio real restante.

Não declare a tarefa concluída se `pnpm check` falhar ou se a inspeção visual ainda mostrar regressões.
