set statement_timeout = 0;
set lock_timeout = 0;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke all on table
  public.properties,
  public.property_private_details,
  public.property_media,
  public.admin_members,
  public.audit_events,
  public.public_property_catalog,
  public.public_property_media
from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema app_private to anon, authenticated;
grant usage on type
  public.publication_status,
  public.deal_status,
  public.property_purpose,
  public.price_display,
  public.admin_role,
  public.admin_member_status,
  public.property_media_kind,
  public.video_provider,
  public.media_processing_status
to anon, authenticated;

grant execute on function app_private.current_admin_role() to authenticated;
grant execute on function app_private.is_admin() to authenticated;
grant execute on function app_private.is_owner() to authenticated;
grant execute on function app_private.has_aal2() to authenticated;

grant select on public.public_property_catalog to anon, authenticated;
grant select on public.public_property_media to anon, authenticated;

grant select on public.properties to authenticated;
grant insert (
  public_code, slug, title, purpose, property_type, publication_status, deal_status,
  price_in_cents, price_display, city, neighborhood, description,
  total_area_sqm, private_area_sqm, land_area_sqm,
  bedrooms, suites, bathrooms, parking_spaces,
  features, featured, deleted_at
) on public.properties to authenticated;
grant update (
  public_code, slug, title, purpose, property_type, publication_status, deal_status,
  price_in_cents, price_display, city, neighborhood, description,
  total_area_sqm, private_area_sqm, land_area_sqm,
  bedrooms, suites, bathrooms, parking_spaces,
  features, featured, deleted_at
) on public.properties to authenticated;
grant delete on public.properties to authenticated;

grant select on public.property_private_details to authenticated;
grant insert (
  property_id, address_line, address_number, address_complement, postal_code,
  exact_latitude, exact_longitude, owner_name, owner_contact, internal_notes,
  authorization_reference, authorization_confirmed_at, authorization_confirmed_by,
  deleted_at
) on public.property_private_details to authenticated;
grant update (
  address_line, address_number, address_complement, postal_code,
  exact_latitude, exact_longitude, owner_name, owner_contact, internal_notes,
  authorization_reference, authorization_confirmed_at, authorization_confirmed_by,
  deleted_at
) on public.property_private_details to authenticated;
grant delete on public.property_private_details to authenticated;

grant select on public.property_media to authenticated;
grant insert (
  public_id, property_id, media_kind, sort_order, alt_text, is_cover,
  processing_status, processed_at, watermark_version, checksum_sha256,
  original_bucket_id, original_object_path, original_mime_type,
  original_byte_size, original_width, original_height,
  public_bucket_id, public_object_path, public_mime_type,
  public_byte_size, public_width, public_height,
  video_provider, video_id, video_treated_at,
  is_approved_for_publication, publication_authorized_at, publication_authorized_by,
  deleted_at
) on public.property_media to authenticated;
grant update (
  sort_order, alt_text, is_cover,
  processing_status, processed_at, watermark_version, checksum_sha256,
  original_bucket_id, original_object_path, original_mime_type,
  original_byte_size, original_width, original_height,
  public_bucket_id, public_object_path, public_mime_type,
  public_byte_size, public_width, public_height,
  video_provider, video_id, video_treated_at,
  is_approved_for_publication, publication_authorized_at, publication_authorized_by,
  deleted_at
) on public.property_media to authenticated;
grant delete on public.property_media to authenticated;

grant select on public.admin_members to authenticated;
grant insert (user_id, role, status, invited_at, activated_at, disabled_at, deleted_at)
  on public.admin_members to authenticated;
grant update (role, status, activated_at, disabled_at, deleted_at)
  on public.admin_members to authenticated;
grant delete on public.admin_members to authenticated;

grant select on public.audit_events to authenticated;

alter table public.properties enable row level security;
alter table public.properties force row level security;
alter table public.property_private_details enable row level security;
alter table public.property_private_details force row level security;
alter table public.property_media enable row level security;
alter table public.property_media force row level security;
alter table public.admin_members enable row level security;
alter table public.admin_members force row level security;
alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;
alter table public.public_property_catalog enable row level security;
alter table public.public_property_catalog force row level security;
alter table public.public_property_media enable row level security;
alter table public.public_property_media force row level security;

create policy public_catalog_read
on public.public_property_catalog
for select
to anon, authenticated
using (true);

create policy public_media_read
on public.public_property_media
for select
to anon, authenticated
using (true);

create policy admin_properties_read
on public.properties
for select
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy admin_properties_create_aal2
on public.properties
for insert
to authenticated
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
  and deleted_at is null
);

create policy admin_properties_update_aal2
on public.properties
for update
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
)
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy owner_properties_delete_aal2
on public.properties
for delete
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

create policy admin_private_details_read
on public.property_private_details
for select
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy admin_private_details_create_aal2
on public.property_private_details
for insert
to authenticated
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
  and deleted_at is null
);

create policy admin_private_details_update_aal2
on public.property_private_details
for update
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
)
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy owner_private_details_delete_aal2
on public.property_private_details
for delete
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

create policy admin_media_read
on public.property_media
for select
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy admin_media_create_aal2
on public.property_media
for insert
to authenticated
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
  and deleted_at is null
);

create policy admin_media_update_aal2
on public.property_media
for update
to authenticated
using (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
)
with check (
  (select app_private.is_admin())
  and (select app_private.has_aal2())
);

create policy owner_media_delete_aal2
on public.property_media
for delete
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

create policy member_reads_self_or_owner_reads_members
on public.admin_members
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and status = 'active'::public.admin_member_status
    and deleted_at is null
  )
  or (select app_private.is_owner())
);

create policy owner_creates_members_aal2
on public.admin_members
for insert
to authenticated
with check (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
  and deleted_at is null
);

create policy owner_updates_members_aal2
on public.admin_members
for update
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
)
with check (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

create policy owner_deletes_members_aal2
on public.admin_members
for delete
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

create policy owner_reads_audit_aal2
on public.audit_events
for select
to authenticated
using (
  (select app_private.is_owner())
  and (select app_private.has_aal2())
);

comment on policy public_catalog_read on public.public_property_catalog is
  'Every row is already a safe, published allowlist maintained by trusted triggers.';
comment on policy admin_properties_update_aal2 on public.properties is
  'Both owner and editor may edit/soft-delete; every mutation requires an AAL2 JWT.';
comment on policy owner_properties_delete_aal2 on public.properties is
  'Permanent deletion is owner-only; ordinary removal uses deleted_at.';
