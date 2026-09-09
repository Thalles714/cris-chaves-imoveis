set check_function_bodies = off;
set statement_timeout = 0;
set lock_timeout = 0;

-- Administrative reads of private originals are privileged operations. A stolen
-- password without the second factor must not be enough to enumerate or download
-- registered Storage objects.
drop policy if exists property_admin_read_registered on storage.objects;
create policy property_admin_read_registered
on storage.objects
for select
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
  and (select app_private.is_known_storage_object(bucket_id, name))
);

-- Uploads always use fresh random object paths. Existing bytes are never
-- replaceable by an authenticated client, closing the race between Worker byte
-- verification and the trusted confirmation transition.
create or replace function app_private.storage_object_matches_plan(
  object_bucket_id text,
  object_name text,
  object_metadata jsonb
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select app_private.is_admin())
    and (select app_private.has_aal2())
    and app_private.is_random_image_path(object_name)
    and coalesce(object_metadata ->> 'size', '') ~ '^[0-9]+$'
    and exists (
      select 1
      from public.property_media as media
      join public.properties as property on property.id = media.property_id
      where media.media_kind = 'image'::public.property_media_kind
        and media.processing_status = 'planned'::public.media_processing_status
        and not media.is_approved_for_publication
        and media.deleted_at is null
        and property.deleted_at is null
        and (
          (
            media.original_bucket_id = object_bucket_id
            and media.original_object_path = object_name
            and media.original_mime_type = object_metadata ->> 'mimetype'
            and media.original_byte_size = (object_metadata ->> 'size')::bigint
          )
          or (
            media.public_bucket_id = object_bucket_id
            and media.public_object_path = object_name
            and media.public_mime_type = object_metadata ->> 'mimetype'
            and media.public_byte_size = (object_metadata ->> 'size')::bigint
          )
        )
    )
$$;

revoke execute on function app_private.storage_object_matches_plan(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function app_private.storage_object_matches_plan(text, text, jsonb)
  to authenticated;

drop policy if exists property_admin_replace_planned_aal2 on storage.objects;
revoke update on storage.objects from public, anon, authenticated;

-- Confirmation is a trusted-server operation because byte signatures, dimensions
-- and SHA-256 are verified in the Worker. Browser-held authenticated tokens cannot
-- call this transition directly and bypass that verification.
drop function if exists public.confirm_property_image(uuid, uuid, bigint, boolean);
create function public.confirm_property_image(
  p_property_id uuid,
  p_media_id uuid,
  p_expected_version bigint,
  p_is_cover boolean,
  p_actor_id uuid
)
returns public.property_media
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.property_media;
begin
  if not exists (
    select 1
    from public.admin_members as member
    where member.user_id = p_actor_id
      and member.status = 'active'::public.admin_member_status
      and member.deleted_at is null
  ) then
    raise exception using errcode = '42501', message = 'active administrative actor required';
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id,
      'role', 'authenticated',
      'aal', 'aal2'
    )::text,
    true
  );

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

revoke all on function public.confirm_property_image(uuid, uuid, bigint, boolean, uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_property_image(uuid, uuid, bigint, boolean, uuid)
  to service_role;

comment on policy property_admin_read_registered on storage.objects is
  'Private registered media requires an active administrator with AAL2.';
comment on function public.confirm_property_image(uuid, uuid, bigint, boolean, uuid) is
  'Trusted-server image confirmation after byte verification; inaccessible to browser authenticated tokens.';
