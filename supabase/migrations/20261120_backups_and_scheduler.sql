-- Weekly backups + a 15-minute scheduler that calls the site's /api/cron/reminders.
-- After applying, set the two secrets from the server (never commit them):
--   rpc nb_set_secret('nb_site_url', 'https://<site>')   and   rpc nb_set_secret('nb_cron_secret', <CRON_SECRET>)
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.nb_backups (
  id bigint generated always as identity primary key,
  taken_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.nb_backups enable row level security;
revoke all on public.nb_backups from anon, authenticated;

create function public.nb_take_backup() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.nb_backups (data) values (jsonb_build_object(
    'bookings', coalesce((select jsonb_agg(data order by date) from public.nb_bookings), '[]'::jsonb),
    'settings', coalesce((select jsonb_object_agg(key, value) from public.nb_kv), '{}'::jsonb)
  ));
  delete from public.nb_backups where id < (select min(id) from (select id from public.nb_backups order by id desc limit 8) t);
end $$;
revoke execute on function public.nb_take_backup() from public, anon, authenticated;

create function public.nb_set_secret(n text, s text) returns void
language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if n not in ('nb_cron_secret', 'nb_site_url') then raise exception 'unknown secret %', n; end if;
  select id into sid from vault.secrets where name = n;
  if sid is null then perform vault.create_secret(s, n); else perform vault.update_secret(sid, s); end if;
end $$;
revoke execute on function public.nb_set_secret(text, text) from public, anon, authenticated;
grant execute on function public.nb_set_secret(text, text) to service_role;

create function public.nb_run_housekeeping() returns void
language plpgsql security definer set search_path = '' as $$
declare u text; s text;
begin
  select decrypted_secret into u from vault.decrypted_secrets where name = 'nb_site_url';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'nb_cron_secret';
  if u is null or s is null then return; end if;
  perform net.http_get(url := u || '/api/cron/reminders', headers := jsonb_build_object('Authorization', 'Bearer ' || s), timeout_milliseconds := 20000);
end $$;
revoke execute on function public.nb_run_housekeeping() from public, anon, authenticated;

select cron.schedule('nb-housekeeping', '*/15 * * * *', 'select public.nb_run_housekeeping()');
select cron.schedule('nb-weekly-backup', '0 8 * * 0', 'select public.nb_take_backup()'); -- Sundays 3:00 AM Jamaica time
