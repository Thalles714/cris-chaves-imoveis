set statement_timeout = 0;
set lock_timeout = 0;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-originals', 'property-originals', false, 8388608, array['image/jpeg', 'image/webp']),
  ('property-public', 'property-public', false, 8388608, array['image/jpeg', 'image/webp'])
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke all on table storage.objects from anon, authenticated;
grant select on table storage.objects to anon;
grant select, insert, update, delete on table storage.objects to authenticated;

create or replace function app_private.is_random_image_path(object_name text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select object_name ~* '^properties/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(originals|public)/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|webp)$'
$$;

create or replace function app_private.is_known_storage_object(
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
    where media.media_kind = 'image'::public.property_media_kind
      and media.deleted_at is null
      and property.deleted_at is null
      and (
        (media.original_bucket_id = object_bucket_id and media.original_object_path = object_name)
        or (media.public_bucket_id = object_bucket_id and media.public_object_path = object_name)
      )
  )
$$;

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
      and property.deleted_at is null
  )
$$;

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

revoke execute on function app_private.is_random_image_path(text)
  from public, anon, authenticated;
revoke execute on function app_private.is_known_storage_object(text, text)
  from public, anon, authenticated;
revoke execute on function app_private.is_public_storage_object(text, text)
  from public, anon, authenticated;
revoke execute on function app_private.storage_object_matches_plan(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function app_private.is_known_storage_object(text, text) to authenticated;
grant execute on function app_private.is_public_storage_object(text, text) to anon, authenticated;
grant execute on function app_private.storage_object_matches_plan(text, text, jsonb) to authenticated;

drop policy if exists property_public_read_approved_get_only on storage.objects;
drop policy if exists property_admin_read_registered on storage.objects;
drop policy if exists property_admin_upload_planned_aal2 on storage.objects;
drop policy if exists property_admin_replace_planned_aal2 on storage.objects;
drop policy if exists property_owner_delete_registered_aal2 on storage.objects;

create policy property_public_read_approved_get_only
on storage.objects
for select
to anon, authenticated
using (
  storage.allow_any_operation(array[
    'object.get_authenticated_info',
    'object.get_authenticated'
  ])
  and (select app_private.is_public_storage_object(bucket_id, name))
);

create policy property_admin_read_registered
on storage.objects
for select
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.is_known_storage_object(bucket_id, name))
);

create policy property_admin_upload_planned_aal2
on storage.objects
for insert
to authenticated
with check (
  (select app_private.storage_object_matches_plan(bucket_id, name, metadata))
);

create policy property_admin_replace_planned_aal2
on storage.objects
for update
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
  and (select app_private.is_known_storage_object(bucket_id, name))
)
with check (
  (select app_private.storage_object_matches_plan(bucket_id, name, metadata))
);

create policy property_owner_delete_registered_aal2
on storage.objects
for delete
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
  and (select app_private.is_known_storage_object(bucket_id, name))
);

create or replace function app_private.validate_media_storage_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_metadata jsonb;
begin
  if tg_op = 'DELETE' and old.media_kind = 'image'::public.property_media_kind then
    if exists (
      select 1 from storage.objects as object
      where (object.bucket_id = old.original_bucket_id and object.name = old.original_object_path)
        or (object.bucket_id = old.public_bucket_id and object.name = old.public_object_path)
    ) then
      raise exception using
        errcode = '23503',
        message = 'remove media through the Storage API before deleting its metadata row';
    end if;
    return old;
  end if;

  if new.media_kind = 'image'::public.property_media_kind
    and new.is_approved_for_publication then
    select object.metadata
    into stored_metadata
    from storage.objects as object
    where object.bucket_id = new.public_bucket_id
      and object.name = new.public_object_path;

    if stored_metadata is null
      or stored_metadata ->> 'mimetype' is distinct from new.public_mime_type
      or coalesce(stored_metadata ->> 'size', '') !~ '^[0-9]+$'
      or (stored_metadata ->> 'size')::bigint is distinct from new.public_byte_size then
      raise exception using
        errcode = '23514',
        message = 'approved image must have a matching stored public derivative';
    end if;
  end if;

  return new;
end;
$$;

create trigger property_media_30_validate_storage
before insert or update or delete on public.property_media
for each row execute function app_private.validate_media_storage_state();

comment on policy property_public_read_approved_get_only on storage.objects is
  'Allows GET/info for approved derivatives only; operation-aware guard denies bucket listing.';
comment on policy property_admin_upload_planned_aal2 on storage.objects is
  'Uploads require AAL2, an active admin, random paths, exact planned MIME and exact planned byte size.';
