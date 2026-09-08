set lock_timeout = 0;

create or replace function app_private.stamp_property_authorization_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor uuid := auth.uid();
begin
  if new.authorization_confirmed_at is null then
    new.authorization_confirmed_by := null;
  elsif current_actor is not null then
    new.authorization_confirmed_by := current_actor;
  elsif new.authorization_confirmed_by is null then
    raise exception using
      errcode = '23514',
      message = 'authorization confirmation requires an authenticated actor';
  end if;

  return new;
end;
$$;

revoke all on function app_private.stamp_property_authorization_actor()
from public, anon, authenticated;

create trigger property_private_details_15_authorization_actor
before insert or update of authorization_confirmed_at, authorization_confirmed_by
on public.property_private_details
for each row execute function app_private.stamp_property_authorization_actor();
