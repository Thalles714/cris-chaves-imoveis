begin;

create extension if not exists pgtap with schema extensions;
select plan(56);

-- Synthetic identities only; none can sign in.
insert into auth.users (id, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', '{}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000003', '{}'::jsonb);

insert into public.admin_members (user_id, role, status, activated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'owner', 'active', now()),
  ('20000000-0000-4000-8000-000000000002', 'editor', 'active', now());

insert into public.properties (
  id, public_code, slug, title, purpose, property_type,
  publication_status, deal_status, price_in_cents, price_display,
  city, neighborhood, description
)
values
  (
    '40000000-0000-4000-8000-000000000004', 'TEST-PUBLIC', 'publicacao-sintetica',
    'Publicação sintética', 'sale', 'house', 'draft', 'available', 100000, 'show',
    'Cidade teste', 'Bairro teste', 'Conteúdo sintético publicado.'
  ),
  (
    '50000000-0000-4000-8000-000000000005', 'TEST-DRAFT', 'rascunho-sintetico',
    'Rascunho sintético', 'rent', 'apartment', 'draft', 'available', null, 'on_request',
    'Cidade teste', 'Bairro privado', 'Conteúdo sintético em rascunho.'
  );

insert into public.property_private_details (
  property_id, address_line, internal_notes, authorization_reference,
  authorization_confirmed_at, authorization_confirmed_by
)
values (
  '40000000-0000-4000-8000-000000000004', 'Endereço sintético privado',
  'Nota sintética privada', 'AUTH-SYNTHETIC', now(),
  '10000000-0000-4000-8000-000000000001'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
insert into public.property_media (
  id, public_id, property_id, media_kind, sort_order, alt_text, processing_status,
  original_checksum_sha256, checksum_sha256,
  original_bucket_id, original_object_path, original_mime_type, original_byte_size,
  original_width, original_height,
  public_bucket_id, public_object_path, public_mime_type, public_byte_size,
  public_width, public_height
)
values (
  '61000000-0000-4000-8000-000000000006',
  '62000000-0000-4000-8000-000000000006',
  '40000000-0000-4000-8000-000000000004',
  'image', 0, 'Safe synthetic facade', 'planned',
  repeat('c', 64), repeat('d', 64),
  'property-originals',
  'properties/40000000-0000-4000-8000-000000000004/originals/63000000-0000-4000-8000-000000000006.webp',
  'image/webp', 6, 800, 600,
  'property-public',
  'properties/40000000-0000-4000-8000-000000000004/public/64000000-0000-4000-8000-000000000006.webp',
  'image/webp', 7, 800, 600
);
insert into storage.objects (bucket_id, name, metadata)
values
  (
    'property-originals',
    'properties/40000000-0000-4000-8000-000000000004/originals/63000000-0000-4000-8000-000000000006.webp',
    '{"mimetype":"image/webp","size":6}'::jsonb
  ),
  (
    'property-public',
    'properties/40000000-0000-4000-8000-000000000004/public/64000000-0000-4000-8000-000000000006.webp',
    '{"mimetype":"image/webp","size":7}'::jsonb
  );
select public.confirm_property_image(
  '40000000-0000-4000-8000-000000000004',
  '61000000-0000-4000-8000-000000000006',
  1,
  true,
  '10000000-0000-4000-8000-000000000001'
);

select is(
  to_regprocedure('public.confirm_property_image(uuid,uuid,bigint,boolean)'),
  null,
  'legacy browser-callable image confirmation signature is removed'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.confirm_property_image(uuid,uuid,bigint,boolean,uuid)',
    'EXECUTE'
  ),
  'authenticated browser tokens cannot confirm images directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.confirm_property_image(uuid,uuid,bigint,boolean,uuid)',
    'EXECUTE'
  ),
  'trusted server role can confirm verified images'
);

select public.publish_property(
  '40000000-0000-4000-8000-000000000004',
  (select version from public.properties where id = '40000000-0000-4000-8000-000000000004'),
  true
);

update public.properties
set deal_status = 'reserved'
where id = '40000000-0000-4000-8000-000000000004';
select is(
  (select deal_status from public.public_property_catalog where public_code = 'TEST-PUBLIC'),
  'reserved'::public.deal_status,
  'reserved property remains visible in the public catalog'
);
update public.properties
set deal_status = 'available'
where id = '40000000-0000-4000-8000-000000000004';
select is(
  (select deal_status from public.public_property_catalog where public_code = 'TEST-PUBLIC'),
  'available'::public.deal_status,
  'released reservation returns to available in the public catalog'
);

select is(to_regclass('public.leads'), null, 'leads are not persisted while the legal decision is pending');
select is((select count(*) from public.public_property_catalog), 1::bigint, 'projection contains only the published property');
select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('public_property_catalog', 'public_property_media')
      and column_name in (
        'id', 'property_id', 'address_line', 'exact_latitude', 'exact_longitude',
        'owner_name', 'owner_contact', 'internal_notes', 'authorization_reference',
        'created_by', 'updated_by', 'deleted_by'
      )
  ),
  'public projections exclude private and internal columns'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon","aal":"aal1"}', true);
select is((select count(*) from public.public_property_catalog), 1::bigint, 'anon reads published catalog');
select is((select count(*) from public.public_property_media), 1::bigint, 'anon sees only approved published media');
select throws_ok(
  $$select * from public.properties$$,
  '42501', 'permission denied for table properties',
  'anon cannot read source properties'
);
select throws_ok(
  $$select * from public.property_private_details$$,
  '42501', 'permission denied for table property_private_details',
  'anon cannot read exact address or notes'
);
select throws_ok(
  $$insert into public.properties (public_code, slug, title, purpose, property_type, city, neighborhood) values ('BAD', 'bad-row', 'Bad row', 'sale', 'house', 'Test', 'Test')$$,
  '42501', 'permission denied for table properties',
  'anon cannot create a property'
);
select throws_ok(
  $$update public.public_property_catalog set title = 'tampered'$$,
  '42501', 'permission denied for table public_property_catalog',
  'anon cannot alter the public projection'
);
select throws_ok(
  $$select * from public.audit_events$$,
  '42501', 'permission denied for table audit_events',
  'anon cannot read audit events'
);
select is((select count(*) from storage.objects), 0::bigint, 'anon cannot list private Storage objects');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
select is((select count(*) from public.properties), 0::bigint, 'authenticated user without membership cannot read admin data');
select is((select count(*) from public.admin_members), 0::bigint, 'authenticated user without membership cannot list members');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
select is((select count(*) from public.properties), 0::bigint, 'aal1 editor cannot read administrative properties');
select results_eq(
  $$update public.properties set title = 'Denied' where id = '50000000-0000-4000-8000-000000000005' returning id$$,
  $$select null::uuid where false$$,
  'aal1 editor cannot mutate administrative properties'
);
select is((select count(*) from public.admin_members), 1::bigint, 'aal1 member can read only self for MFA bootstrap');
select is((select count(*) from storage.objects), 0::bigint, 'aal1 editor cannot list registered Storage objects');

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  (
    select count(*)
    from public.properties
    where id in (
      '40000000-0000-4000-8000-000000000004',
      '50000000-0000-4000-8000-000000000005'
    )
  ),
  2::bigint,
  'aal2 editor reads the synthetic administrative properties'
);
select lives_ok(
  $$update public.properties set title = 'Rascunho revisado' where id = '50000000-0000-4000-8000-000000000005'$$,
  'aal2 editor can update property content'
);
select is((select count(*) from storage.objects), 2::bigint, 'aal2 editor can list registered Storage objects');
select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('UPDATE', 'ALL')
      and 'authenticated' = any(roles)
  ),
  'no RLS policy lets authenticated clients replace Storage object bytes'
);
select results_eq(
  $$update storage.objects
    set metadata = metadata
    where bucket_id = 'property-public'
      and name = 'properties/40000000-0000-4000-8000-000000000004/public/64000000-0000-4000-8000-000000000006.webp'
    returning id$$,
  $$select null::uuid where false$$,
  'approved Storage objects are immutable even for an aal2 editor'
);
select throws_ok(
  $$select public.confirm_property_image(
    '40000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000006',
    2,
    true,
    '20000000-0000-4000-8000-000000000002'
  )$$,
  '42501', 'permission denied for function confirm_property_image',
  'authenticated aal2 admins cannot bypass trusted byte verification'
);
select throws_ok(
  $$update public.properties set publication_status = 'published' where id = '50000000-0000-4000-8000-000000000005'$$,
  '23514', 'written publication authorization must be confirmed',
  'direct publication without final written-authorization confirmation is rejected'
);
select throws_ok(
  $$select public.publish_property(
    '50000000-0000-4000-8000-000000000005',
    (select version from public.properties where id = '50000000-0000-4000-8000-000000000005'),
    false
  )$$,
  '23514', 'written publication authorization must be confirmed',
  'atomic publication rejects a missing final written-authorization confirmation'
);
select lives_ok(
  $$update public.properties set deal_status = 'reserved' where id = '50000000-0000-4000-8000-000000000005'$$,
  'available property may be reserved'
);
select lives_ok(
  $$update public.properties set deal_status = 'available' where id = '50000000-0000-4000-8000-000000000005'$$,
  'reserved property may be released back to available'
);
select lives_ok(
  $$update public.properties set deal_status = 'sold' where id = '50000000-0000-4000-8000-000000000005'$$,
  'available property may be marked sold'
);
select throws_ok(
  $$update public.properties set deal_status = 'reserved' where id = '50000000-0000-4000-8000-000000000005'$$,
  '23514', 'invalid property deal transition',
  'sold property cannot be moved backwards to reserved'
);
select throws_ok(
  $$update public.properties set deal_status = 'available' where id = '50000000-0000-4000-8000-000000000005'$$,
  '23514', 'invalid property deal transition',
  'sold property cannot be released back to available'
);
select lives_ok(
  $$update public.properties set publication_status = 'archived' where id = '50000000-0000-4000-8000-000000000005'$$,
  'draft property may be archived'
);
select throws_ok(
  $$update public.properties set publication_status = 'published' where id = '50000000-0000-4000-8000-000000000005'$$,
  '23514', 'invalid property publication transition',
  'archived property must return to draft before publication'
);
select throws_ok(
  $$delete from public.properties where id = '50000000-0000-4000-8000-000000000005'$$,
  '42501', 'permission denied for table properties',
  'editor cannot permanently delete a property'
);
select results_eq(
  $$update public.admin_members set role = 'owner' where user_id = '20000000-0000-4000-8000-000000000002' returning user_id$$,
  $$select null::uuid where false$$,
  'editor cannot change roles or self-promote'
);
select is((select count(*) from public.audit_events), 0::bigint, 'editor cannot read audit events');

insert into public.property_media (
  public_id, property_id, media_kind, sort_order, alt_text, processing_status,
  original_checksum_sha256, checksum_sha256,
  original_bucket_id, original_object_path, original_mime_type, original_byte_size,
  original_width, original_height,
  public_bucket_id, public_object_path, public_mime_type, public_byte_size,
  public_width, public_height
)
values (
  '70000000-0000-4000-8000-000000000007',
  '50000000-0000-4000-8000-000000000005',
  'image', 0, 'Imagem sintética planejada', 'planned',
  repeat('a', 64), repeat('b', 64),
  'property-originals',
  'properties/50000000-0000-4000-8000-000000000005/originals/71000000-0000-4000-8000-000000000007.webp',
  'image/webp', 6, 800, 600,
  'property-public',
  'properties/50000000-0000-4000-8000-000000000005/public/72000000-0000-4000-8000-000000000007.webp',
  'image/webp', 7, 800, 600
);
select ok(
  app_private.can_sign_planned_storage_upload(
    'property-originals',
    'properties/50000000-0000-4000-8000-000000000005/originals/71000000-0000-4000-8000-000000000007.webp'
  ),
  'aal2 admin may sign an upload for an exact planned private object before file metadata exists'
);
select ok(
  not app_private.can_sign_planned_storage_upload(
    'property-originals',
    'properties/50000000-0000-4000-8000-000000000005/originals/73000000-0000-4000-8000-000000000007.webp'
  ),
  'aal2 admin cannot sign an upload for an unplanned object path'
);

insert into public.property_media (
	public_id, property_id, media_kind, sort_order, alt_text, processing_status,
  processed_at, watermark_version, video_provider, video_id, video_treated_at,
  is_approved_for_publication, publication_authorized_at, publication_authorized_by
)
values (
  '60000000-0000-4000-8000-000000000006',
  '40000000-0000-4000-8000-000000000004',
  'video', 0, 'Vídeo sintético', 'processed', now(), 'external-confirmed-v1',
  'youtube', 'AbCdEf12345', now(), true, now(),
  '10000000-0000-4000-8000-000000000001'
);
select is(
  (select count(*) from public.public_property_media where property_code = 'TEST-PUBLIC'),
  2::bigint,
  'approved media for an available published property enters the public projection'
);
select is(
  (
    select publication_authorized_by
    from public.property_media
    where public_id = '60000000-0000-4000-8000-000000000006'
  ),
  '20000000-0000-4000-8000-000000000002'::uuid,
  'database derives the media publication actor from the authenticated user'
);
update public.property_media
set is_approved_for_publication = false,
    publication_authorized_at = now(),
    publication_authorized_by = '10000000-0000-4000-8000-000000000001'
where public_id = '60000000-0000-4000-8000-000000000006';
select is(
  (select count(*) from public.public_property_media where property_code = 'TEST-PUBLIC'),
  1::bigint,
  'revoked media approval removes the public media projection'
);
select is(
  (
    select publication_authorized_by
    from public.property_media
    where public_id = '60000000-0000-4000-8000-000000000006'
  ),
  null::uuid,
  'database clears the media publication actor when approval is removed'
);
select lives_ok(
  $$select public.update_property_media_metadata(
    '40000000-0000-4000-8000-000000000004',
    (select id from public.property_media where public_id = '60000000-0000-4000-8000-000000000006'),
    (select version from public.property_media where public_id = '60000000-0000-4000-8000-000000000006'),
    'Vídeo sintético atualizado', 1, false
  )$$,
  'media metadata updates atomically through the versioned function'
);

update public.property_media
set is_approved_for_publication = true,
    publication_authorized_at = now(),
    publication_authorized_by = '10000000-0000-4000-8000-000000000001'
where public_id = '60000000-0000-4000-8000-000000000006';
update public.properties
set deal_status = 'sold'
where id = '40000000-0000-4000-8000-000000000004';
select is(
  (select count(*) from public.public_property_catalog where public_code = 'TEST-PUBLIC'),
  0::bigint,
  'sold property is removed from the public catalog projection'
);
select is(
  (select count(*) from public.public_property_media where property_code = 'TEST-PUBLIC'),
  0::bigint,
  'sold property media is removed from the public media projection'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select is(
  (
    select count(*)
    from public.admin_members
    where user_id in (
      '10000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000002'
    )
  ),
  2::bigint,
  'aal2 owner reads the synthetic active members'
);
select ok((select count(*) from public.audit_events) > 0, 'aal2 owner reads append-only audit events');
select throws_ok(
  $$update public.audit_events set action = 'tampered'$$,
  '42501', 'permission denied for table audit_events',
  'even owner cannot modify audit events'
);
select throws_ok(
  $$update public.admin_members set status = 'disabled', disabled_at = now() where user_id = '10000000-0000-4000-8000-000000000001'$$,
  '42501', 'self-managed role or status change is forbidden',
  'owner cannot disable self through ordinary flow'
);
select throws_ok(
  $$delete from public.properties where id = '50000000-0000-4000-8000-000000000005'$$,
  '42501', 'permission denied for table properties',
  'even an aal2 owner cannot permanently delete a property'
);
select throws_ok(
  $$delete from public.property_media where public_id = '60000000-0000-4000-8000-000000000006'$$,
  '42501', 'permission denied for table property_media',
  'even an aal2 owner cannot permanently delete property media'
);
select throws_ok(
  $$delete from storage.objects where false$$,
  '42501', 'Direct deletion from storage tables is not allowed. Use the Storage API instead.',
  'even an aal2 owner cannot permanently delete stored media'
);

select * from finish();
rollback;
