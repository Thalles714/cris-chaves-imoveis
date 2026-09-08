set statement_timeout = 0;
set lock_timeout = 0;
set check_function_bodies = on;

-- The operator confirms the required written authorization only in the final
-- publication action. Legacy private authorization records remain untouched.
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

    if (tg_op = 'INSERT' or old.publication_status <> 'published'::public.publication_status)
      and current_setting('app.publication_authorization_confirmed', true) is distinct from 'true' then
      raise exception using errcode = '23514', message = 'written publication authorization must be confirmed';
    end if;

    if nullif(btrim(new.description), '') is null then
      raise exception using errcode = '23514', message = 'property description is required';
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

drop trigger if exists property_private_details_20_protect_authorization
on public.property_private_details;

drop trigger if exists property_private_details_15_authorization_actor
on public.property_private_details;

drop function if exists public.publish_property(uuid, bigint);

create function public.publish_property(
  p_property_id uuid,
  p_expected_version bigint,
  p_authorization_confirmed boolean
)
returns public.properties
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target public.properties;
begin
  if p_authorization_confirmed is not true then
    raise exception using errcode = '23514', message = 'written publication authorization must be confirmed';
  end if;

  perform pg_catalog.set_config('app.publication_authorization_confirmed', 'true', true);

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

  perform pg_catalog.set_config('app.publication_authorization_confirmed', 'false', true);

  return target;
end;
$$;

revoke all on function public.publish_property(uuid, bigint, boolean) from public, anon;
grant execute on function public.publish_property(uuid, bigint, boolean) to authenticated;

comment on function app_private.validate_property_publication() is
  'Requires a final written-authorization confirmation, public description, processed approved image and approved cover.';

comment on function public.publish_property(uuid, bigint, boolean) is
  'Publishes one versioned draft after a simple final written-authorization confirmation and editorial gates.';
