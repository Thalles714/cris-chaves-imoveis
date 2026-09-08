set statement_timeout = 0;
set lock_timeout = 0;

-- Product decision confirmed on 2026-09-03: administrators use recoverable
-- soft delete only. Physical cleanup remains an out-of-band operational task.
revoke delete on public.properties from authenticated;
revoke delete on public.property_private_details from authenticated;
revoke delete on public.property_media from authenticated;
revoke delete on storage.objects from authenticated;

drop policy if exists owner_properties_delete_aal2 on public.properties;
drop policy if exists owner_private_details_delete_aal2 on public.property_private_details;
drop policy if exists owner_media_delete_aal2 on public.property_media;
drop policy if exists property_owner_delete_registered_aal2 on storage.objects;

comment on table public.properties is
  'Administrative deletion is recoverable soft delete only; authenticated hard delete is revoked.';
comment on table public.property_media is
  'Administrative deletion is recoverable soft delete only; physical cleanup is operational and out of band.';
