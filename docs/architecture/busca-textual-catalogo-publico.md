# Busca textual do catálogo público

## Objetivo

Permitir que uma pessoa pesquise do jeito que fala — por exemplo, “casa na beira da praia com 3 quartos” — e receba primeiro os anúncios publicados que mais combinam com a descrição.

## Campos pesquisados

A busca usa somente a projeção pública `public_property_catalog`:

- título;
- diferenciais (`features`);
- tipo do imóvel;
- bairro;
- cidade;
- descrição pública;
- código público.

Endereço exato, proprietário, contato, documentos, notas internas, UUIDs administrativos e caminhos de mídias originais nunca entram no documento de busca.

## Funcionamento

1. A query `busca` é validada no servidor, limitada a 160 caracteres e combinada com os filtros estruturados existentes.
2. A função `public.search_public_properties` normaliza acentos e cria um documento `tsvector` com pesos diferentes.
3. Título e diferenciais têm maior peso; localização e tipo vêm depois; a descrição complementa a relevância.
4. Uma correspondência literal recebe um pequeno reforço de pontuação.
5. O resultado é ordenado por relevância, destaque, data de publicação e código público.
6. Contagem e paginação são calculadas no banco sem carregar todo o catálogo no Worker.

O mecanismo é pesquisa textual ranqueada, não IA generativa. Essa distinção deve permanecer clara na interface.

## Ativação

**Estado em 5 de setembro de 2026:** a migração `supabase/migrations/20260905020000_public_catalog_text_search.sql` foi aplicada ao projeto Supabase de produção `bstrlrdcebvdqpvnepfu` pelo SQL Editor, dentro de uma transação. A existência da função e a permissão `execute` para `anon` foram confirmadas no banco remoto.

Depois da migração:

1. regenerar os tipos com `pnpm db:types` se o projeto local estiver disponível;
2. executar `pnpm db:lint`;
3. executar `pnpm db:test`;
4. validar buscas com acentos, descrição, diferenciais e filtros combinados;
5. confirmar que uma chave anônima não consegue ler tabelas privadas.

O teste pgTAP correspondente está em `supabase/tests/database/public-search.test.sql`. Sua execução remota final foi iniciada com dados sintéticos e `rollback`, mas o relatório não foi capturado porque a conexão de automação com o painel foi interrompida. A suíte local completa permanece pendente enquanto o Supabase/Docker local estiver indisponível.
