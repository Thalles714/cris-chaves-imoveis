set statement_timeout = 0;
set lock_timeout = 0;

-- Keep the checksum of both uploaded objects so the confirmation endpoint can
-- compare server-downloaded bytes with the plans issued before direct upload.
alter table public.property_media
  add column original_checksum_sha256 text;

alter table public.property_media
  add constraint property_media_original_checksum_format check (
    original_checksum_sha256 is null
    or original_checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  add constraint property_media_image_checksums_required check (
    media_kind <> 'image'
    or (
      original_checksum_sha256 is not null
      and checksum_sha256 is not null
      and original_checksum_sha256 <> checksum_sha256
    )
  );

grant insert (original_checksum_sha256) on public.property_media to authenticated;
grant update (original_checksum_sha256) on public.property_media to authenticated;

comment on column public.property_media.original_checksum_sha256 is
  'SHA-256 planned for the private original and revalidated from downloaded bytes before approval.';
