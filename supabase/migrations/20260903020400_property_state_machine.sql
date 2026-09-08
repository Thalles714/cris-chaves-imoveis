set lock_timeout = 0;

create or replace function app_private.validate_property_state_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.publication_status <> 'draft'::public.publication_status
      or new.deal_status <> 'available'::public.deal_status
      or new.deleted_at is not null then
      raise exception using
        errcode = '23514',
        message = 'new property must start as an available draft';
    end if;
    return new;
  end if;

  if new.publication_status <> old.publication_status and not (
    (old.publication_status = 'draft'::public.publication_status
      and new.publication_status in (
        'published'::public.publication_status,
        'archived'::public.publication_status
      ))
    or (old.publication_status = 'published'::public.publication_status
      and new.publication_status = 'archived'::public.publication_status)
    or (old.publication_status = 'archived'::public.publication_status
      and new.publication_status = 'draft'::public.publication_status)
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid property publication transition';
  end if;

  if new.deal_status <> old.deal_status and not (
    (old.deal_status = 'available'::public.deal_status
      and new.deal_status in ('reserved'::public.deal_status, 'sold'::public.deal_status))
    or (old.deal_status = 'reserved'::public.deal_status
      and new.deal_status = 'sold'::public.deal_status)
  ) then
    raise exception using
      errcode = '23514',
      message = 'invalid property deal transition';
  end if;

  return new;
end;
$$;

revoke all on function app_private.validate_property_state_transition()
from public, anon, authenticated;

create trigger properties_15_validate_state_transition
before insert or update of publication_status, deal_status, deleted_at
on public.properties
for each row execute function app_private.validate_property_state_transition();
