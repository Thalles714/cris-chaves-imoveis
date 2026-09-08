set statement_timeout = 0;
set lock_timeout = 0;
set check_function_bodies = on;

create schema if not exists app_private;
revoke all on schema app_private from public;

create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.deal_status as enum ('available', 'reserved', 'sold');
create type public.property_purpose as enum ('sale', 'rent');
create type public.price_display as enum ('show', 'on_request');
create type public.admin_role as enum ('owner', 'editor');
create type public.admin_member_status as enum ('invited', 'active', 'disabled');
create type public.property_media_kind as enum ('image', 'video');
create type public.video_provider as enum ('youtube', 'vimeo');
create type public.media_processing_status as enum ('planned', 'processed', 'rejected');

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  slug text not null unique,
  title text not null,
  purpose public.property_purpose not null,
  property_type text not null,
  publication_status public.publication_status not null default 'draft',
  deal_status public.deal_status not null default 'available',
  price_in_cents bigint,
  price_display public.price_display not null default 'show',
  city text not null,
  neighborhood text not null,
  description text not null default '',
  total_area_sqm numeric(12, 2),
  private_area_sqm numeric(12, 2),
  land_area_sqm numeric(12, 2),
  bedrooms smallint,
  suites smallint,
  bathrooms smallint,
  parking_spaces smallint,
  features text[] not null default '{}',
  featured boolean not null default false,
  published_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  constraint properties_public_code_format check (
    public_code ~ '^[A-Z0-9][A-Z0-9-]{2,31}$'
  ),
  constraint properties_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 120
  ),
  constraint properties_title_length check (char_length(title) between 3 and 140),
  constraint properties_type_length check (char_length(property_type) between 2 and 80),
  constraint properties_city_length check (char_length(city) between 2 and 120),
  constraint properties_neighborhood_length check (char_length(neighborhood) between 1 and 120),
  constraint properties_description_length check (char_length(description) <= 20000),
  constraint properties_price_consistency check (
    (price_display = 'show' and price_in_cents is not null and price_in_cents >= 0)
    or (price_display = 'on_request' and price_in_cents is null)
  ),
  constraint properties_area_bounds check (
    (total_area_sqm is null or total_area_sqm between 0 and 100000000)
    and (private_area_sqm is null or private_area_sqm between 0 and 100000000)
    and (land_area_sqm is null or land_area_sqm between 0 and 100000000)
  ),
  constraint properties_room_bounds check (
    (bedrooms is null or bedrooms between 0 and 100)
    and (suites is null or suites between 0 and 100)
    and (bathrooms is null or bathrooms between 0 and 100)
    and (parking_spaces is null or parking_spaces between 0 and 100)
    and (suites is null or bedrooms is null or suites <= bedrooms)
  ),
  constraint properties_feature_bounds check (
    cardinality(features) <= 64 and array_position(features, null) is null
  ),
  constraint properties_publication_dates check (
    (publication_status <> 'published' or published_at is not null)
    and (publication_status <> 'archived' or archived_at is not null)
  ),
  constraint properties_soft_delete_not_public check (
    deleted_at is null or publication_status <> 'published'
  ),
  constraint properties_version_positive check (version > 0)
);

create table public.property_private_details (
  property_id uuid primary key references public.properties(id) on delete cascade,
  address_line text,
  address_number text,
  address_complement text,
  postal_code text,
  exact_latitude numeric(9, 6),
  exact_longitude numeric(9, 6),
  owner_name text,
  owner_contact text,
  internal_notes text,
  authorization_reference text,
  authorization_confirmed_at timestamptz,
  authorization_confirmed_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  constraint property_private_address_lengths check (
    (address_line is null or char_length(address_line) <= 240)
    and (address_number is null or char_length(address_number) <= 40)
    and (address_complement is null or char_length(address_complement) <= 160)
    and (postal_code is null or char_length(postal_code) <= 20)
  ),
  constraint property_private_coordinate_bounds check (
    (exact_latitude is null or exact_latitude between -90 and 90)
    and (exact_longitude is null or exact_longitude between -180 and 180)
    and ((exact_latitude is null) = (exact_longitude is null))
  ),
  constraint property_private_text_bounds check (
    (owner_name is null or char_length(owner_name) <= 200)
    and (owner_contact is null or char_length(owner_contact) <= 500)
    and (internal_notes is null or char_length(internal_notes) <= 10000)
    and (authorization_reference is null or char_length(authorization_reference) <= 500)
  ),
  constraint property_private_authorization_consistency check (
    (authorization_confirmed_at is null and authorization_confirmed_by is null)
    or (authorization_confirmed_at is not null and authorization_confirmed_by is not null)
  ),
  constraint property_private_version_positive check (version > 0)
);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null unique default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  media_kind public.property_media_kind not null,
  sort_order smallint not null default 0,
  alt_text text not null,
  is_cover boolean not null default false,
  processing_status public.media_processing_status not null default 'planned',
  processed_at timestamptz,
  watermark_version text,
  checksum_sha256 text,
  original_bucket_id text,
  original_object_path text,
  original_mime_type text,
  original_byte_size bigint,
  original_width integer,
  original_height integer,
  public_bucket_id text,
  public_object_path text,
  public_mime_type text,
  public_byte_size bigint,
  public_width integer,
  public_height integer,
  video_provider public.video_provider,
  video_id text,
  video_treated_at timestamptz,
  is_approved_for_publication boolean not null default false,
  publication_authorized_at timestamptz,
  publication_authorized_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  constraint property_media_sort_order_bounds check (sort_order between 0 and 1000),
  constraint property_media_alt_text_bounds check (char_length(alt_text) between 1 and 500),
  constraint property_media_checksum_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint property_media_image_shape check (
    media_kind <> 'image'
    or (
      original_bucket_id = 'property-originals'
      and original_object_path is not null
      and original_mime_type in ('image/jpeg', 'image/webp')
      and original_byte_size between 1 and 8388608
      and original_width between 320 and 8192
      and original_height between 240 and 8192
      and original_width::bigint * original_height::bigint <= 24000000
      and video_provider is null
      and video_id is null
      and video_treated_at is null
    )
  ),
  constraint property_media_original_path_format check (
    original_object_path is null
    or (
      original_object_path ~* '^properties/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/originals/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|webp)$'
      and split_part(original_object_path, '/', 2) = property_id::text
    )
  ),
  constraint property_media_public_path_format check (
    public_object_path is null
    or (
      public_object_path ~* '^properties/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/public/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|webp)$'
      and split_part(public_object_path, '/', 2) = property_id::text
    )
  ),
  constraint property_media_public_derivative_shape check (
    (public_bucket_id is null and public_object_path is null and public_mime_type is null
      and public_byte_size is null and public_width is null and public_height is null)
    or (
      media_kind = 'image'
      and public_bucket_id = 'property-public'
      and public_object_path is not null
      and public_mime_type in ('image/jpeg', 'image/webp')
      and public_byte_size between 1 and 8388608
      and public_width between 320 and 8192
      and public_height between 240 and 8192
      and public_width::bigint * public_height::bigint <= 24000000
    )
  ),
  constraint property_media_video_shape check (
    media_kind <> 'video'
    or (
      original_bucket_id is null and original_object_path is null and original_mime_type is null
      and original_byte_size is null and original_width is null and original_height is null
      and public_bucket_id is null and public_object_path is null and public_mime_type is null
      and public_byte_size is null and public_width is null and public_height is null
      and video_provider is not null and video_id is not null and video_treated_at is not null
      and checksum_sha256 is null and watermark_version is not null
    )
  ),
  constraint property_media_video_id_format check (
    video_id is null
    or (video_provider = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$')
    or (video_provider = 'vimeo' and video_id ~ '^[0-9]{5,12}$')
  ),
  constraint property_media_processing_consistency check (
    (processing_status = 'processed' and processed_at is not null)
    or (processing_status <> 'processed' and processed_at is null)
  ),
  constraint property_media_publication_approval check (
    not is_approved_for_publication
    or (
      processing_status = 'processed'
      and publication_authorized_at is not null
      and publication_authorized_by is not null
      and (
        (media_kind = 'image' and public_object_path is not null and checksum_sha256 is not null)
        or (media_kind = 'video' and video_treated_at is not null)
      )
    )
  ),
  constraint property_media_cover_is_public_image check (
    not is_cover or (media_kind = 'image' and is_approved_for_publication)
  ),
  constraint property_media_version_positive check (version > 0)
);

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.admin_role not null,
  status public.admin_member_status not null default 'invited',
  invited_at timestamptz not null default statement_timestamp(),
  activated_at timestamptz,
  disabled_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  constraint admin_member_status_consistency check (
    (status = 'invited' and activated_at is null and disabled_at is null)
    or (status = 'active' and activated_at is not null and disabled_at is null)
    or (status = 'disabled' and disabled_at is not null)
  ),
  constraint admin_member_version_positive check (version > 0)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default clock_timestamp(),
  actor_id uuid,
  actor_role public.admin_role,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  request_id uuid,
  details jsonb not null default '{}',
  constraint audit_event_action_format check (action ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  constraint audit_event_resource_type_format check (
    resource_type in ('properties', 'property_private_details', 'property_media', 'admin_members')
  ),
  constraint audit_event_details_object check (jsonb_typeof(details) = 'object'),
  constraint audit_event_details_size check (pg_column_size(details) <= 2048)
);

-- Public read models contain only allowlisted, already-published fields.
create table public.public_property_catalog (
  public_code text primary key,
  slug text not null unique,
  title text not null,
  purpose public.property_purpose not null,
  property_type text not null,
  deal_status public.deal_status not null,
  price_in_cents bigint,
  price_display public.price_display not null,
  city text not null,
  neighborhood text not null,
  description text not null,
  total_area_sqm numeric(12, 2),
  private_area_sqm numeric(12, 2),
  land_area_sqm numeric(12, 2),
  bedrooms smallint,
  suites smallint,
  bathrooms smallint,
  parking_spaces smallint,
  features text[] not null,
  featured boolean not null,
  published_at timestamptz not null
);

create table public.public_property_media (
  property_code text not null references public.public_property_catalog(public_code) on delete cascade,
  media_code uuid not null,
  media_kind public.property_media_kind not null,
  sort_order smallint not null,
  alt_text text not null,
  is_cover boolean not null,
  video_provider public.video_provider,
  video_id text,
  public_object_path text,
  primary key (property_code, media_code)
);

create index properties_publication_lookup_idx
  on public.properties (publication_status, featured desc, published_at desc)
  where deleted_at is null;
create index properties_admin_lookup_idx on public.properties (updated_at desc) where deleted_at is null;
create index property_media_property_order_idx
  on public.property_media (property_id, sort_order, id) where deleted_at is null;
create unique index property_media_one_active_cover_idx
  on public.property_media (property_id) where is_cover and deleted_at is null;
create index admin_members_active_role_idx
  on public.admin_members (role, user_id) where status = 'active' and deleted_at is null;
create index audit_events_resource_idx
  on public.audit_events (resource_type, resource_id, occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_id, occurred_at desc);
create index public_property_catalog_filters_idx
  on public.public_property_catalog (purpose, city, neighborhood, deal_status);

create or replace function app_private.current_admin_role()
returns public.admin_role
language sql
stable
security definer
set search_path = ''
as $$
  select member.role
  from public.admin_members as member
  where member.user_id = (select auth.uid())
    and member.status = 'active'
    and member.deleted_at is null
  limit 1
$$;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select app_private.current_admin_role()) is not null
$$;

create or replace function app_private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select app_private.current_admin_role()) = 'owner'::public.admin_role
$$;

create or replace function app_private.has_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
$$;

create or replace function app_private.stamp_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, statement_timestamp());
    new.updated_at := new.created_at;
    new.created_by := coalesce(actor, new.created_by);
    new.updated_by := coalesce(actor, new.updated_by, new.created_by);
    new.version := 1;
    return new;
  end if;

  if new.version <> old.version then
    raise exception using
      errcode = '40001',
      message = 'stale or client-managed record version';
  end if;

  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.updated_at := clock_timestamp();
  new.updated_by := coalesce(actor, old.updated_by);
  new.version := old.version + 1;

  if new.deleted_at is distinct from old.deleted_at then
    new.deleted_by := case when new.deleted_at is null then null else actor end;
  else
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

create trigger properties_10_stamp
before insert or update on public.properties
for each row execute function app_private.stamp_record();
create trigger property_private_details_10_stamp
before insert or update on public.property_private_details
for each row execute function app_private.stamp_record();
create trigger property_media_10_stamp
before insert or update on public.property_media
for each row execute function app_private.stamp_record();
create trigger admin_members_10_stamp
before insert or update on public.admin_members
for each row execute function app_private.stamp_record();

create or replace function app_private.validate_property_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_status = 'published'::public.publication_status then
    if new.deleted_at is not null then
      raise exception using errcode = '23514', message = 'deleted property cannot be published';
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

create trigger properties_20_validate_publication
before insert or update on public.properties
for each row execute function app_private.validate_property_publication();

create or replace function app_private.protect_publication_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_is_published boolean;
begin
  select exists (
    select 1 from public.properties as property
    where property.id = old.property_id
      and property.publication_status = 'published'::public.publication_status
      and property.deleted_at is null
  ) into property_is_published;

  if property_is_published and (
    tg_op = 'DELETE'
    or new.deleted_at is not null
    or new.authorization_confirmed_at is null
    or new.authorization_confirmed_by is null
  ) then
    raise exception using errcode = '23514', message = 'published property requires active authorization';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger property_private_details_20_protect_authorization
before update or delete on public.property_private_details
for each row execute function app_private.protect_publication_authorization();

create or replace function app_private.enforce_media_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_property_images integer;
  current_total_bytes bigint;
  incoming_bytes bigint;
begin
  if new.media_kind <> 'image'::public.property_media_kind or new.deleted_at is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cris_chaves_property_media_budget', 0));

  select count(*)::integer
  into current_property_images
  from public.property_media as media
  where media.property_id = new.property_id
    and media.media_kind = 'image'::public.property_media_kind
    and media.deleted_at is null
    and media.id <> new.id;

  if current_property_images >= 30 then
    raise exception using errcode = '23514', message = 'maximum of 30 images per property exceeded';
  end if;

  select coalesce(sum(media.original_byte_size + coalesce(media.public_byte_size, 0)), 0)::bigint
  into current_total_bytes
  from public.property_media as media
  where media.media_kind = 'image'::public.property_media_kind
    and media.deleted_at is null
    and media.id <> new.id;

  incoming_bytes := new.original_byte_size + coalesce(new.public_byte_size, 0);
  if current_total_bytes + incoming_bytes > 1000000000 then
    raise exception using errcode = '23514', message = 'one gigabyte media budget exceeded';
  end if;

  return new;
end;
$$;

create trigger property_media_20_enforce_budget
before insert or update on public.property_media
for each row execute function app_private.enforce_media_budget();

create or replace function app_private.protect_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  removes_active_owner boolean := false;
begin
  if tg_op = 'UPDATE' and actor = old.user_id and (
    new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.deleted_at is distinct from old.deleted_at
  ) then
    raise exception using errcode = '42501', message = 'self-managed role or status change is forbidden';
  end if;

  if old.role = 'owner'::public.admin_role
    and old.status = 'active'::public.admin_member_status
    and old.deleted_at is null then
    removes_active_owner := tg_op = 'DELETE' or (
      new.role <> 'owner'::public.admin_role
      or new.status <> 'active'::public.admin_member_status
      or new.deleted_at is not null
    );
  end if;

  if removes_active_owner and not exists (
    select 1 from public.admin_members as other_owner
    where other_owner.user_id <> old.user_id
      and other_owner.role = 'owner'::public.admin_role
      and other_owner.status = 'active'::public.admin_member_status
      and other_owner.deleted_at is null
  ) then
    raise exception using errcode = '23514', message = 'at least one active owner is required';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger admin_members_20_protect_membership
before update or delete on public.admin_members
for each row execute function app_private.protect_admin_membership();

create or replace function app_private.audit_details_are_safe(payload jsonb)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select jsonb_typeof(payload) = 'object'
    and pg_column_size(payload) <= 2048
    and not exists (
      select 1
      from jsonb_object_keys(payload) as key_name
      where key_name <> all (array[
        'operation', 'old_version', 'new_version',
        'old_publication_status', 'new_publication_status',
        'old_deal_status', 'new_deal_status',
        'old_role', 'new_role', 'old_status', 'new_status',
        'old_media_kind', 'new_media_kind',
        'old_deleted', 'new_deleted'
      ])
    )
$$;

alter table public.audit_events
  add constraint audit_event_details_allowlist
  check (app_private.audit_details_are_safe(details));

create or replace function app_private.write_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  old_row jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  new_row jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  target_id uuid;
  safe_details jsonb;
  raw_request_id text := coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id',
    ''
  );
  safe_request_id uuid := case
    when raw_request_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then raw_request_id::uuid
    else null
  end;
begin
  if actor is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  target_id := coalesce(
    nullif(new_row ->> 'id', '')::uuid,
    nullif(old_row ->> 'id', '')::uuid,
    nullif(new_row ->> 'property_id', '')::uuid,
    nullif(old_row ->> 'property_id', '')::uuid,
    nullif(new_row ->> 'user_id', '')::uuid,
    nullif(old_row ->> 'user_id', '')::uuid
  );

  safe_details := jsonb_strip_nulls(jsonb_build_object(
    'operation', lower(tg_op),
    'old_version', old_row -> 'version',
    'new_version', new_row -> 'version',
    'old_publication_status', old_row -> 'publication_status',
    'new_publication_status', new_row -> 'publication_status',
    'old_deal_status', old_row -> 'deal_status',
    'new_deal_status', new_row -> 'deal_status',
    'old_role', old_row -> 'role',
    'new_role', new_row -> 'role',
    'old_status', old_row -> 'status',
    'new_status', new_row -> 'status',
    'old_media_kind', old_row -> 'media_kind',
    'new_media_kind', new_row -> 'media_kind',
    'old_deleted', case when old_row = '{}'::jsonb then null else (old_row ->> 'deleted_at') is not null end,
    'new_deleted', case when new_row = '{}'::jsonb then null else (new_row ->> 'deleted_at') is not null end
  ));

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, request_id, details
  ) values (
    actor,
    (select app_private.current_admin_role()),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    target_id,
    safe_request_id,
    safe_details
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger properties_90_audit
after insert or update or delete on public.properties
for each row execute function app_private.write_audit_event();
create trigger property_private_details_90_audit
after insert or update or delete on public.property_private_details
for each row execute function app_private.write_audit_event();
create trigger property_media_90_audit
after insert or update or delete on public.property_media
for each row execute function app_private.write_audit_event();
create trigger admin_members_90_audit
after insert or update or delete on public.admin_members
for each row execute function app_private.write_audit_event();

create or replace function app_private.prevent_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'audit events are append-only';
end;
$$;

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function app_private.prevent_audit_mutation();

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
      and property.deleted_at is null
      and media.deleted_at is null
      and media.is_approved_for_publication;
  end if;
end;
$$;

create or replace function app_private.refresh_public_property_from_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.refresh_public_property(
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'INSERT' then null else old.public_code end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function app_private.refresh_public_property_from_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_property_id uuid := case when tg_op = 'DELETE' then old.property_id else new.property_id end;
  current_public_code text;
begin
  select property.public_code into current_public_code
  from public.properties as property where property.id = target_property_id;
  perform app_private.refresh_public_property(target_property_id, current_public_code);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger properties_95_refresh_public_projection
after insert or update or delete on public.properties
for each row execute function app_private.refresh_public_property_from_property();
create trigger property_media_95_refresh_public_projection
after insert or update or delete on public.property_media
for each row execute function app_private.refresh_public_property_from_media();

comment on table public.public_property_catalog is
  'Allowlisted published-property projection; contains no internal UUID, author, address or audit data.';
comment on table public.public_property_media is
  'Allowlisted approved-media projection; exposes only the opaque approved-derivative locator, never an original path.';
comment on table public.audit_events is
  'Append-only administrative audit with allowlisted, PII-free summaries.';
comment on table public.property_media is
  'Maximum 30 active image rows per property, 8 MiB per object and 1,000,000,000 bytes total planned media.';
