-- Ranked, accent-insensitive search over the allowlisted public projection only.
-- Exact addresses, owner data, internal notes and original media paths never enter
-- this function because they do not exist in public_property_catalog.
create or replace function public.search_public_properties(
  p_search_query text,
  p_page integer default 1,
  p_page_size integer default 12,
  p_city text default null,
  p_neighborhood text default null,
  p_purpose public.property_purpose default null,
  p_property_type text default null,
  p_deal_status public.deal_status default null,
  p_minimum_price_in_cents bigint default null,
  p_maximum_price_in_cents bigint default null,
  p_minimum_bedrooms smallint default null,
  p_minimum_parking_spaces smallint default null,
  p_public_code text default null
)
returns table (
  public_code text,
  slug text,
  title text,
  purpose public.property_purpose,
  property_type text,
  deal_status public.deal_status,
  price_in_cents bigint,
  price_display public.price_display,
  city text,
  neighborhood text,
  description text,
  total_area_sqm numeric,
  private_area_sqm numeric,
  land_area_sqm numeric,
  bedrooms smallint,
  suites smallint,
  bathrooms smallint,
  parking_spaces smallint,
  features text[],
  featured boolean,
  published_at timestamptz,
  search_rank real,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with search_input as (
    select
      left(
        translate(
          lower(trim(coalesce(p_search_query, ''))),
          'áàâãäéèêëíìîïóòôõöúùûüç',
          'aaaaaeeeeiiiiooooouuuuc'
        ),
        160
      ) as normalized_query,
      greatest(1, least(coalesce(p_page, 1), 10000)) as safe_page,
      greatest(1, least(coalesce(p_page_size, 12), 48)) as safe_page_size
  ),
  searchable as (
    select
      catalog.*,
      input.normalized_query,
      input.safe_page,
      input.safe_page_size,
      setweight(
        pg_catalog.to_tsvector(
          'portuguese',
          translate(lower(coalesce(catalog.title, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        ),
        'A'
      ) ||
      setweight(
        pg_catalog.to_tsvector(
          'portuguese',
          translate(lower(coalesce(pg_catalog.array_to_string(catalog.features, ' '), '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        ),
        'A'
      ) ||
      setweight(
        pg_catalog.to_tsvector(
          'portuguese',
          translate(
            lower(pg_catalog.concat_ws(' ', catalog.property_type, catalog.neighborhood, catalog.city)),
            'áàâãäéèêëíìîïóòôõöúùûüç',
            'aaaaaeeeeiiiiooooouuuuc'
          )
        ),
        'B'
      ) ||
      setweight(
        pg_catalog.to_tsvector(
          'portuguese',
          translate(lower(coalesce(catalog.description, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
        ),
        'C'
      ) ||
      setweight(pg_catalog.to_tsvector('simple', lower(catalog.public_code)), 'D') as search_document
    from public.public_property_catalog as catalog
    cross join search_input as input
    where (p_city is null or catalog.city = p_city)
      and (p_neighborhood is null or catalog.neighborhood = p_neighborhood)
      and (p_purpose is null or catalog.purpose = p_purpose)
      and (p_property_type is null or catalog.property_type = p_property_type)
      and (p_deal_status is null or catalog.deal_status = p_deal_status)
      and (p_minimum_price_in_cents is null or catalog.price_in_cents >= p_minimum_price_in_cents)
      and (p_maximum_price_in_cents is null or catalog.price_in_cents <= p_maximum_price_in_cents)
      and (p_minimum_bedrooms is null or catalog.bedrooms >= p_minimum_bedrooms)
      and (p_minimum_parking_spaces is null or catalog.parking_spaces >= p_minimum_parking_spaces)
      and (p_public_code is null or catalog.public_code = p_public_code)
  ),
  ranked as (
    select
      searchable.*,
      (
        pg_catalog.ts_rank_cd(
          searchable.search_document,
          pg_catalog.websearch_to_tsquery('portuguese', searchable.normalized_query),
          32
        ) +
        case
          when pg_catalog.strpos(
            translate(
              lower(
                pg_catalog.concat_ws(
                  ' ',
                  searchable.title,
                  searchable.property_type,
                  searchable.neighborhood,
                  searchable.city,
                  searchable.description,
                  pg_catalog.array_to_string(searchable.features, ' ')
                )
              ),
              'áàâãäéèêëíìîïóòôõöúùûüç',
              'aaaaaeeeeiiiiooooouuuuc'
            ),
            searchable.normalized_query
          ) > 0 then 1.0
          else 0.0
        end
      )::real as relevance
    from searchable
    where searchable.normalized_query = ''
      or searchable.search_document @@ pg_catalog.websearch_to_tsquery(
        'portuguese',
        searchable.normalized_query
      )
  ),
  counted as (
    select ranked.*, pg_catalog.count(*) over () as matches
    from ranked
  )
  select
    counted.public_code,
    counted.slug,
    counted.title,
    counted.purpose,
    counted.property_type,
    counted.deal_status,
    counted.price_in_cents,
    counted.price_display,
    counted.city,
    counted.neighborhood,
    counted.description,
    counted.total_area_sqm,
    counted.private_area_sqm,
    counted.land_area_sqm,
    counted.bedrooms,
    counted.suites,
    counted.bathrooms,
    counted.parking_spaces,
    counted.features,
    counted.featured,
    counted.published_at,
    counted.relevance,
    counted.matches
  from counted
  order by counted.relevance desc, counted.featured desc, counted.published_at desc, counted.public_code
  limit (select safe_page_size from search_input)
  offset (
    (select safe_page - 1 from search_input) *
    (select safe_page_size from search_input)
  );
$$;

revoke all on function public.search_public_properties(
  text, integer, integer, text, text, public.property_purpose, text,
  public.deal_status, bigint, bigint, smallint, smallint, text
) from public;
grant execute on function public.search_public_properties(
  text, integer, integer, text, text, public.property_purpose, text,
  public.deal_status, bigint, bigint, smallint, smallint, text
) to anon, authenticated;

comment on function public.search_public_properties(
  text, integer, integer, text, text, public.property_purpose, text,
  public.deal_status, bigint, bigint, smallint, smallint, text
) is 'Ranks natural-language matches using only the allowlisted public property projection.';
