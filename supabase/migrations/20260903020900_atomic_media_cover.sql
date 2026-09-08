set statement_timeout = 0;
set lock_timeout = 0;

create or replace function public.confirm_property_image(
  p_property_id uuid,
  p_media_id uuid,
  p_expected_version bigint,
  p_is_cover boolean
)
returns public.property_media
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.property_media;
begin
  select media.* into target
  from public.property_media as media
  where media.id = p_media_id
    and media.property_id = p_property_id
    and media.deleted_at is null
  for update;

  if target.id is null
    or target.version <> p_expected_version
    or target.media_kind <> 'image'::public.property_media_kind
    or target.processing_status <> 'planned'::public.media_processing_status then
    raise exception using errcode = '40001', message = 'media version conflict';
  end if;

  if p_is_cover then
    update public.property_media
    set is_cover = false
    where property_id = p_property_id
      and is_cover
      and id <> p_media_id
      and deleted_at is null;
  end if;

  update public.property_media
  set processing_status = 'processed',
      processed_at = statement_timestamp(),
      watermark_version = 'cris-chaves-text-v1',
      is_approved_for_publication = true,
      publication_authorized_at = statement_timestamp(),
      is_cover = p_is_cover
  where id = p_media_id
    and property_id = p_property_id
    and version = p_expected_version
    and processing_status = 'planned'
    and deleted_at is null
  returning * into target;

  if target.id is null then
    raise exception using errcode = '40001', message = 'media version conflict';
  end if;
  return target;
end;
$$;

create or replace function public.update_property_media_metadata(
  p_property_id uuid,
  p_media_id uuid,
  p_expected_version bigint,
  p_alt_text text,
  p_sort_order integer,
  p_is_cover boolean
)
returns public.property_media
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.property_media;
begin
  select media.* into target
  from public.property_media as media
  where media.id = p_media_id
    and media.property_id = p_property_id
    and media.deleted_at is null
  for update;

  if target.id is null or target.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'media version conflict';
  end if;
  if p_is_cover and (
    target.media_kind <> 'image'::public.property_media_kind
    or not target.is_approved_for_publication
  ) then
    raise exception using errcode = '23514', message = 'public derivative required for cover';
  end if;

  if p_is_cover then
    update public.property_media
    set is_cover = false
    where property_id = p_property_id
      and is_cover
      and id <> p_media_id
      and deleted_at is null;
  end if;

  update public.property_media
  set alt_text = p_alt_text,
      sort_order = p_sort_order,
      is_cover = p_is_cover
  where id = p_media_id
    and property_id = p_property_id
    and version = p_expected_version
    and deleted_at is null
  returning * into target;

  if target.id is null then
    raise exception using errcode = '40001', message = 'media version conflict';
  end if;
  return target;
end;
$$;

revoke all on function public.confirm_property_image(uuid, uuid, bigint, boolean)
  from public, anon;
revoke all on function public.update_property_media_metadata(uuid, uuid, bigint, text, integer, boolean)
  from public, anon;
grant execute on function public.confirm_property_image(uuid, uuid, bigint, boolean)
  to authenticated;
grant execute on function public.update_property_media_metadata(uuid, uuid, bigint, text, integer, boolean)
  to authenticated;

comment on function public.confirm_property_image(uuid, uuid, bigint, boolean) is
  'Atomically confirms a versioned image and changes the single cover under RLS.';
comment on function public.update_property_media_metadata(uuid, uuid, bigint, text, integer, boolean) is
  'Atomically updates versioned media metadata and changes the single cover under RLS.';
