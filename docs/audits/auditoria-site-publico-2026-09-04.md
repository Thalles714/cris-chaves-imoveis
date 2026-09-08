# Auditoria do site público — 2026-09-04

## Escopo e proteção do trabalho concorrente

Esta auditoria cobriu a arquitetura do projeto, o design system, a experiência pública, responsividade, acessibilidade, desempenho local, SEO técnico e testes automatizados.

A área administrativa, o fluxo de upload, os módulos de mídia, as migrações e os bindings de infraestrutura foram deliberadamente mantidos fora das alterações. Há outro agente trabalhando nesse recorte e nenhuma mudança desta entrega depende de editar esses arquivos.

## Diagnóstico executivo

A base técnica não é de um projeto improvisado: há boa separação entre site público e administração, DTOs públicos, políticas de segurança, RLS documentado, tratamento explícito de privacidade e testes relevantes. A principal diferença entre a implementação encontrada e uma entrega sênior estava na consistência de produto: a hero não expressava com força a proposta de valor, o controle de aparência não seguia o componente canônico e alguns detalhes de interação, carregamento de imagens e regressão visual ainda estavam frágeis.

## Melhorias aplicadas

### Posicionamento e voz

- A copy pública passou a falar em primeira pessoa, como Cris conversando diretamente com futuros clientes.
- Textos internos sobre “projeto”, “painel” e configuração técnica foram removidos da jornada comercial.
- CTAs agora descrevem ações humanas e previsíveis, como “Falar comigo”, “Quero anunciar” e “Mostrar melhores opções”.
- A voz adotada foi registrada em `docs/brand/voz-e-copy-cris-chaves.md` para orientar novas páginas e anúncios.

### Busca por descrição

- A busca por código deixou de ser a ação principal e foi substituída por pesquisa textual em linguagem natural.
- Título, diferenciais, tipo, cidade, bairro, descrição e código público são pesquisados e ranqueados no banco.
- Filtros estruturados continuam disponíveis e podem ser combinados com a descrição.
- A implementação consulta exclusivamente `public_property_catalog`; nenhum dado privado entra no índice.
- A migração `20260905020000_public_catalog_text_search.sql` foi aplicada ao Supabase de produção em 5 de setembro de 2026; a função e a permissão de execução para `anon` foram confirmadas remotamente.

### Hero e descoberta de imóveis

- A hero passou a comunicar uma única promessa: encontrar um lugar no Litoral Norte Gaúcho.
- A composição foi aproximada do design system: fundo escuro texturizado, horizonte animado discreto, tipografia de alto contraste, destaque cromático e painel de busca translúcido.
- A busca é real, aceita descrições em linguagem natural e ranqueia correspondências do catálogo público; o código público continua pesquisável, mas não é mais o formato exigido. Não foram inventados imóveis, preços, depoimentos ou fotografias.
- Foram adicionados atalhos reais para compra, aluguel e Tramandaí, além das regiões já aprovadas pelo projeto.
- CTAs, notas de confiança e hierarquia foram ajustados para desktop e mobile.

### Aparência e temas

- Os dois selects do rodapé foram substituídos pelo componente canônico no cabeçalho.
- O popover reproduz a estrutura do design system: gatilho com sol, título “Aparência”, segmentos Escuro/Claro/Sistema, seis temas, três amostras cromáticas e indicador de seleção.
- O controle fecha por clique externo e Escape, devolve foco ao gatilho e persiste a escolha.
- A meta `theme-color` acompanha o tema ativo para manter a moldura do navegador coerente.

### Qualidade de interface

- O menu móvel agora fecha por clique externo e Escape.
- Imagens de cards usam decodificação assíncrona.
- A imagem principal do detalhe recebe prioridade; as seguintes permanecem lazy-loaded.
- A animação da hero respeita `prefers-reduced-motion` e há alternativa para redução de transparência.
- Foram preservados o endereço protegido, a separação público/admin e o estado vazio honesto do catálogo.

### Proteção contra regressões

- Foi adicionada uma referência visual específica do popover de aparência.
- As referências visuais da home em desktop claro e mobile escuro foram atualizadas.
- Os testes agora validam ordem dos esquemas, os seis temas, persistência, foco por teclado, fechamento do menu móvel e ausência de overflow.

## Achados e prioridades restantes

### P0 — antes do lançamento

1. Aprovar o texto jurídico definitivo e a decisão LGPD para habilitar formulários. O bloqueio atual é intencional e coerente com a ADR do projeto.
2. Configurar e validar o ambiente de produção, domínio, Supabase e conteúdo real do catálogo.
3. Fazer o aceite integrado do upload/admin quando o trabalho concorrente terminar, sem transportar detalhes internos para DTOs ou páginas públicas.

### P1 — após conteúdo real

1. Rodar Lighthouse e Web Vitals contra produção com imagens reais e rede simulada; o orçamento local está aprovado, mas não substitui a medição do ambiente final.
2. Revisar qualidade, proporção e peso das imagens reais do catálogo e confirmar que a foto de capa escolhida pelo admin é a primeira do detalhe.
3. Fazer uma passagem editorial nas páginas institucionais quando os textos finais da corretora estiverem aprovados.

### P2 — evolução de produto

1. Medir uso da busca e dos atalhos somente após definir uma solução de analytics compatível com privacidade.
2. Considerar filtros geográficos mais ricos apenas quando o volume de imóveis justificar a complexidade.
3. Manter o popover de aparência como implementação única compartilhada; evitar recriar selects ou variantes locais.

## Validação executada

- Lint: aprovado.
- TypeScript: aprovado.
- Testes unitários: 217 aprovados em 37 arquivos.
- Build de E2E/produção: aprovado.
- E2E público final: 20 aprovados, 6 ignorados por configuração de projeto/dispositivo, 0 falhas.
- Inspeção visual: desktop claro, mobile escuro e popover de aparência aprovados sem overflow.
- Validação SQL: os testes estáticos passaram; no remoto, a função existe e `anon` possui `execute`. O relatório da suíte transacional remota não foi capturado após uma interrupção da conexão com o painel; `db:lint` e pgTAP locais aguardam Supabase/Docker disponível.

## Arquivos funcionais alterados

- `app/components/public/appearance-menu.tsx`
- `app/components/public/site-shell.tsx`
- `app/components/public/index.ts`
- `app/components/ui/icons.tsx`
- `app/components/ui/navigation.tsx`
- `app/components/ui/property-card.tsx`
- `app/design-system/appearance.tsx`
- `app/root.tsx`
- `app/routes/home.tsx`
- `app/routes/property-detail.tsx`
- `app/app.css`
- `tests/e2e/public-quality.spec.ts`
- `tests/e2e/public-site.spec.ts`
- snapshots visuais associados aos testes públicos

Nenhum arquivo de rota administrativa, componente administrativo, mídia/upload ou configuração de bindings foi alterado por esta entrega. A única alteração de banco desta frente foi a migração isolada da busca textual pública.
