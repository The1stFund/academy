-- =====================================================
-- AUTH → CORE USERS SYNC TRIGGER
-- =====================================================

-- FUNCTION: handle new user
create or replace function core.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
begin

  insert into core.users (
    auth_user_id,
    email
  )
  values (
    new.id,
    new.email
  );

  insert into core.profiles (
    user_id
  )
  select id
  from core.users
  where auth_user_id = new.id;

  return new;

end;
$$;


-- TRIGGER ON AUTH USERS

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function core.handle_new_auth_user();