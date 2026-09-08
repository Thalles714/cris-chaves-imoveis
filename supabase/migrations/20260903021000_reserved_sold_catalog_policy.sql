set statement_timeout = 0;
set lock_timeout = 0;

-- Reserved listings remain public and may be released. A sold listing is terminal
-- in the ordinary administrative flow and must never enter either public projection.
create or replace function app_private.validate_property_state_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.publication_status <> 'draft'::public.publication_status
      or new.deal_status <> 'available'::public.deal_status
      or new.deleted_at is not null then
      raise exception using
        errcode = '23514',
        message = 'new property must start as an available draft';
    end if;
    return new;
  end if;

  if new.publication_status <> old.publication_status and not (
    (old.publication_status = 'draft'::public.publication_status
      and new.publication_status in (
        'published'::public.publication_status,
        'archived'::public.publication_status
      ))
    or (old.publication_status = 'published'::public.publication_status
      and new.publication_status = 'archived'::public.publication_status)
    or (old.publication_status = 'archived'::public.publication_status
      and new.publication_status = 'draft'::public.publication_status)
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid property publication transition';
  end if;

  if new.deal_status <> old.deal_status and not (
    (old.deal_status = 'available'::public.deal_status
      and new.deal_status in ('reserved'::public.deal_status, 'sold'::public.deal_status))
    or (old.deal_status = 'reserved'::public.deal_status
      and new.deal_status in ('available'::public.deal_status, 'sold'::public.deal_status))
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid property deal transition';
  end if;

  return new;
end;
$$;

revoke all on function app_private.validate_property_state_transition()
from public, anon, authenticated;

create or replace function app_private.refresh_public_property(
  target_property_id uuid,
  former_public_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_public_code text;
begin
  if former_public_code is not null then
    delete from public.public_property_catalog where public_code = former_public_code;
  end if;

  select property.public_code
  into current_public_code
  from public.properties as property
  where property.id = target_property_id;

  if current_public_code is not null then
    delete from public.public_property_catalog where public_code = current_public_code;
  end if;

  insert into public.public_property_catalog (
    public_code, slug, title, purpose, property_type, deal_status,
    price_in_cents, price_display, city, neighborhood, description,
    total_area_sqm, private_area_sqm, land_area_sqm,
    bedrooms, suites, bathrooms, parking_spaces,
    features, featured, published_at
  )
  select
    property.public_code, property.slug, property.title, property.purpose, property.property_type,
    property.deal_status, property.price_in_cents, property.price_display,
    property.city, property.neighborhood, property.description,
    property.total_area_sqm, property.private_area_sqm, property.land_area_sqm,
    property.bedrooms, property.suites, property.bathrooms, property.parking_spaces,
    property.features, property.featured, property.published_at
  from public.properties as property
  where property.id = target_property_id
    and property.publication_status = 'published'::public.publication_status
    and property.deal_status in ('available'::public.deal_status, 'reserved'::public.deal_status)
    and property.deleted_at is null;

  if current_public_code is not null then
    insert into public.public_property_media (
      property_code, media_code, media_kind, sort_order, alt_text,
      is_cover, video_provider, video_id, public_object_path
    )
    select
      current_public_code, media.public_id, media.media_kind, media.sort_order,
      media.alt_text, media.is_cover, media.video_provider, media.video_id,
      media.public_object_path
    from public.property_media as media
    join public.properties as property on property.id = media.property_id
    where media.property_id = target_property_id
      and property.publication_status = 'published'::public.publication_status
      and property.deal_status in ('available'::public.deal_status, 'reserved'::public.deal_status)
      and property.deleted_at is null
      and media.deleted_at is null
      and media.is_approved_for_publication;
  end if;
end;
$$;

revoke all on function app_private.refresh_public_property(uuid, text)
from public, anon, authenticated;

-- Storage authorization cannot rely only on the media approval flag: the parent
-- listing must also remain eligible for the public catalog.
create or replace function app_private.is_public_storage_object(
  object_bucket_id text,
  object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.property_media as media
    join public.properties as property on property.id = media.property_id
    where object_bucket_id = 'property-public'
      and media.public_bucket_id = object_bucket_id
      and media.public_object_path = object_name
      and media.media_kind = 'image'::public.property_media_kind
      and media.is_approved_for_publication
      and media.deleted_at is null
      and property.publication_status = 'published'::public.publication_status
      and property.deal_status in ('available'::public.deal_status, 'reserved'::public.deal_status)
      and property.deleted_at is null
  )
$$;

revoke execute on function app_private.is_public_storage_object(text, text)
from public, anon, authenticated;
grant execute on function app_private.is_public_storage_object(text, text)
to anon, authenticated;

-- Remove any legacy sold row before enforcing the invariant, then rebuild every
-- derived projection with the new eligibility rule. Public media is removed by
-- the catalog foreign key's ON DELETE CASCADE behavior.
delete from public.public_property_catalog
where deal_status = 'sold'::public.deal_status;

alter table public.public_property_catalog
drop constraint if exists public_property_catalog_public_deal_status;
alter table public.public_property_catalog
add constraint public_property_catalog_public_deal_status
check (deal_status in ('available'::public.deal_status, 'reserved'::public.deal_status));

do $$
declare
  target record;
begin
  for target in select property.id, property.public_code from public.properties as property loop
    perform app_private.refresh_public_property(target.id, target.public_code);
  end loop;
end;
$$;

comment on table public.public_property_catalog is
  'Allowlisted projection of published, non-deleted available or reserved properties; sold properties are excluded.';
comment on function app_private.is_public_storage_object(text, text) is
  'Authorizes only approved derivatives whose parent property is publicly eligible and not sold.';
