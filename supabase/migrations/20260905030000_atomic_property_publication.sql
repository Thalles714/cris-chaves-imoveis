set statement_timeout = 0;
set lock_timeout = 0;
set check_function_bodies = on;

create or replace function app_private.validate_property_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_status = 'published'::public.publication_status then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('cris_chaves_publish:' || new.id::text, 0)
    );
    if new.deleted_at is not null then
      raise exception using errcode = '23514', message = 'deleted property cannot be published';
    end if;

    if nullif(btrim(new.description), '') is null then
      raise exception using errcode = '23514', message = 'property description is required';
    end if;

    if not exists (
      select 1
      from public.property_private_details as private_details
      where private_details.property_id = new.id
        and private_details.deleted_at is null
        and private_details.authorization_confirmed_at is not null
        and private_details.authorization_confirmed_by is not null
        and nullif(btrim(private_details.authorization_reference), '') is not null
    ) then
      raise exception using errcode = '23514', message = 'publication authorization is required';
    end if;

    if not exists (
      select 1
      from public.property_media as media
      where media.property_id = new.id
        and media.deleted_at is null
        and media.media_kind = 'image'::public.property_media_kind
        and media.processing_status = 'processed'::public.media_processing_status
        and media.is_approved_for_publication
    ) then
      raise exception using errcode = '23514', message = 'approved property image is required';
    end if;

    if not exists (
      select 1
      from public.property_media as media
      where media.property_id = new.id
        and media.deleted_at is null
        and media.media_kind = 'image'::public.property_media_kind
        and media.processing_status = 'processed'::public.media_processing_status
        and media.is_approved_for_publication
        and media.is_cover
    ) then
      raise exception using errcode = '23514', message = 'approved property cover is required';
    end if;

    if tg_op = 'INSERT' or old.publication_status <> 'published'::public.publication_status then
      new.published_at := clock_timestamp();
    end if;
  end if;

  if new.publication_status = 'archived'::public.publication_status
    and (tg_op = 'INSERT' or old.publication_status <> 'archived'::public.publication_status) then
    new.archived_at := clock_timestamp();
  elsif new.publication_status <> 'archived'::public.publication_status then
    new.archived_at := null;
  end if;

  return new;
end;
$$;

create or replace function app_private.keep_published_property_media_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_property_id uuid := coalesce(new.property_id, old.property_id);
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('cris_chaves_publish:' || affected_property_id::text, 0)
  );

  if exists (
    select 1
    from public.properties as property
    where property.id = affected_property_id
      and property.deleted_at is null
      and property.publication_status = 'published'::public.publication_status
  ) then
    if not exists (
      select 1
      from public.property_media as media
      where media.property_id = affected_property_id
        and media.deleted_at is null
        and media.media_kind = 'image'::public.property_media_kind
        and media.processing_status = 'processed'::public.media_processing_status
        and media.is_approved_for_publication
    ) then
      raise exception using errcode = '23514', message = 'published property requires an approved image';
    end if;

    if not exists (
      select 1
      from public.property_media as media
      where media.property_id = affected_property_id
        and media.deleted_at is null
        and media.media_kind = 'image'::public.property_media_kind
        and media.processing_status = 'processed'::public.media_processing_status
        and media.is_approved_for_publication
        and media.is_cover
    ) then
      raise exception using errcode = '23514', message = 'published property requires an approved cover';
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists property_media_99_keep_published_ready on public.property_media;
create constraint trigger property_media_99_keep_published_ready
after insert or update or delete on public.property_media
deferrable initially deferred
for each row execute function app_private.keep_published_property_media_ready();

create or replace function public.publish_property(
  p_property_id uuid,
  p_expected_version bigint
)
returns public.properties
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.properties;
begin
  select property.* into target
  from public.properties as property
  where property.id = p_property_id
    and property.deleted_at is null
  for update;

  if target.id is null
    or target.version <> p_expected_version
    or target.publication_status <> 'draft'::public.publication_status then
    raise exception using errcode = '40001', message = 'property version conflict';
  end if;

  update public.properties
  set publication_status = 'published'::public.publication_status
  where id = p_property_id
    and version = p_expected_version
    and deleted_at is null
    and publication_status = 'draft'::public.publication_status
  returning * into target;

  if target.id is null then
    raise exception using errcode = '40001', message = 'property version conflict';
  end if;
  return target;
end;
$$;

revoke all on function public.publish_property(uuid, bigint) from public, anon;
grant execute on function public.publish_property(uuid, bigint) to authenticated;

revoke execute on function app_private.keep_published_property_media_ready()
from public, anon, authenticated;

comment on function public.publish_property(uuid, bigint) is
  'Publishes one versioned draft atomically after database-enforced content, authorization, image and cover gates.';
comment on function app_private.keep_published_property_media_ready() is
  'Deferred invariant that prevents a published property from losing its last approved image or cover.';
