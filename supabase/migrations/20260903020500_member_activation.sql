set lock_timeout = 0;

create or replace function app_private.protect_admin_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  self_activation boolean :=
    tg_op = 'UPDATE'
    and actor = old.user_id
    and current_setting('app.member_self_activation', true) = 'allowed'
    and old.status = 'invited'::public.admin_member_status
    and new.status = 'active'::public.admin_member_status
    and new.role = old.role
    and new.deleted_at is not distinct from old.deleted_at;
  removes_active_owner boolean := false;
begin
  if tg_op = 'UPDATE' and actor = old.user_id and not self_activation and (
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

create or replace function public.activate_own_admin_membership()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  activated boolean;
begin
  if current_user_id is null then
    return false;
  end if;

  perform set_config('app.member_self_activation', 'allowed', true);
  update public.admin_members
  set status = 'active'::public.admin_member_status,
      activated_at = clock_timestamp(),
      disabled_at = null
  where user_id = current_user_id
    and status = 'invited'::public.admin_member_status
    and deleted_at is null;
  activated := found;
  perform set_config('app.member_self_activation', '', true);
  return activated;
end;
$$;

revoke all on function public.activate_own_admin_membership() from public, anon;
grant execute on function public.activate_own_admin_membership() to authenticated;
