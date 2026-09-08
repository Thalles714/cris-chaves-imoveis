set check_function_bodies = off;
set lock_timeout = 0;

-- Creating a signed upload URL happens before Storage knows the file metadata.
-- Authorize that short-lived capability only for an exact, active upload plan.
-- The application still downloads and verifies the final bytes, MIME, dimensions,
-- byte length and SHA-256 before confirming or publishing the image.
create or replace function app_private.can_sign_planned_storage_upload(
  object_bucket_id text,
  object_name text
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
          (media.original_bucket_id = object_bucket_id and media.original_object_path = object_name)
          or (media.public_bucket_id = object_bucket_id and media.public_object_path = object_name)
        )
    )
$$;

revoke execute on function app_private.can_sign_planned_storage_upload(text, text)
  from public, anon, authenticated;
grant execute on function app_private.can_sign_planned_storage_upload(text, text)
  to authenticated;

drop policy if exists property_admin_upload_planned_aal2 on storage.objects;
create policy property_admin_upload_planned_aal2
on storage.objects
for insert
to authenticated
with check (
  (select app_private.can_sign_planned_storage_upload(bucket_id, name))
);

comment on function app_private.can_sign_planned_storage_upload(text, text) is
  'Allows an AAL2 admin to create a short-lived signed upload URL only for an exact active media plan; final bytes are verified before confirmation.';
comment on policy property_admin_upload_planned_aal2 on storage.objects is
  'Signed upload authorization requires AAL2, an active admin, a random path and an exact active media plan.';
