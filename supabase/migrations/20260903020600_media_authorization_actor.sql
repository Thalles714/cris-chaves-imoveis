set statement_timeout = 0;
set lock_timeout = 0;
set check_function_bodies = on;

create or replace function app_private.stamp_media_publication_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if new.is_approved_for_publication then
    if tg_op = 'INSERT' or not old.is_approved_for_publication then
      if actor is null
        or not (select app_private.is_admin())
        or not (select app_private.has_aal2()) then
        raise exception using
          errcode = '42501',
          message = 'active AAL2 administrator required to approve media';
      end if;
      new.publication_authorized_at := clock_timestamp();
      new.publication_authorized_by := actor;
    else
      new.publication_authorized_at := old.publication_authorized_at;
      new.publication_authorized_by := old.publication_authorized_by;
    end if;
  else
    new.publication_authorized_at := null;
    new.publication_authorized_by := null;
  end if;

  return new;
end;
$$;

revoke execute on function app_private.stamp_media_publication_authorization()
from public, anon, authenticated;

drop trigger if exists property_media_20_authorization_actor on public.property_media;
create trigger property_media_20_authorization_actor
before insert or update on public.property_media
for each row execute function app_private.stamp_media_publication_authorization();

comment on function app_private.stamp_media_publication_authorization() is
  'Derives the media publication approver from auth.uid() and prevents clients from spoofing it.';
