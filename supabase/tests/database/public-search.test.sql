begin;

select plan(4);

insert into public.public_property_catalog (
  public_code, slug, title, purpose, property_type, deal_status,
  price_in_cents, price_display, city, neighborhood, description,
  total_area_sqm, private_area_sqm, land_area_sqm,
  bedrooms, suites, bathrooms, parking_spaces,
  features, featured, published_at
) values
  (
    'SEARCH-001', 'casa-frente-mar', 'Casa de frente para o mar', 'sale', 'Casa',
    'available', 85000000, 'show', 'Tramandaí', 'Centro',
    'Uma casa na beira da praia, com vista aberta e três dormitórios.',
    180, 140, 300, 3, 1, 2, 2,
    array['frente mar', 'pátio'], true, statement_timestamp()
  ),
  (
    'SEARCH-002', 'apartamento-central', 'Apartamento central', 'sale', 'Apartamento',
    'available', 45000000, 'show', 'Cidreira', 'Centro',
    'Apartamento compacto perto do comércio, com dois dormitórios.',
    80, 72, null, 2, 0, 1, 1,
    array['sacada'], false, statement_timestamp() - interval '1 day'
  );

select results_eq(
  $$select public_code from public.search_public_properties('casa na beira da praia')$$,
  array['SEARCH-001'::text],
  'encontra texto presente na descrição pública'
);

select results_eq(
  $$select public_code from public.search_public_properties('tramandai')$$,
  array['SEARCH-001'::text],
  'ignora acentos na busca por cidade'
);

select results_eq(
  $$select public_code from public.search_public_properties('patio')$$,
  array['SEARCH-001'::text],
  'inclui os diferenciais públicos no índice textual'
);

select is(
  (
    select total_count
    from public.search_public_properties('apartamento', 1, 12, 'Cidreira')
    limit 1
  ),
  1::bigint,
  'preserva filtros e informa a contagem total'
);

select * from finish();

rollback;
