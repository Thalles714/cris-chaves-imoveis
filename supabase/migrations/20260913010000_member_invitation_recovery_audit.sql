set lock_timeout = 0;

create or replace function app_private.record_member_invitation_recovery_failure(
  target_user_id uuid,
  failure_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select app_private.is_owner()) or not (select app_private.has_aal2()) then
    raise exception using errcode = '42501', message = 'owner AAL2 required';
  end if;

  if failure_reason not in (
    'directory_delete_and_membership_restore_failed',
    'invite_failed_after_previous_removal',
    'membership_create_failed_after_invite'
  ) then
    raise exception using errcode = '22023', message = 'invalid recovery reason';
  end if;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, details
  ) values (
    (select auth.uid()),
    (select app_private.current_admin_role()),
    'admin_members.invitation_recovery_failed',
    'admin_members',
    target_user_id,
    jsonb_build_object('operation', failure_reason)
  );
end;
$$;

create or replace function public.record_member_invitation_recovery_failure(
  target_user_id uuid,
  failure_reason text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select app_private.record_member_invitation_recovery_failure(
    target_user_id,
    failure_reason
  )
$$;

revoke all on function app_private.record_member_invitation_recovery_failure(uuid, text)
from public, anon;
grant execute on function app_private.record_member_invitation_recovery_failure(uuid, text)
to authenticated;

revoke all on function public.record_member_invitation_recovery_failure(uuid, text)
from public, anon;
grant execute on function public.record_member_invitation_recovery_failure(uuid, text)
to authenticated;

comment on function public.record_member_invitation_recovery_failure(uuid, text) is
  'Authenticated RPC wrapper for the private, allowlisted invitation-recovery audit writer.';

comment on function app_private.record_member_invitation_recovery_failure(uuid, text) is
  'Writes an allowlisted, email-free technical audit event when Auth/database invitation compensation cannot restore a valid pending state.';
