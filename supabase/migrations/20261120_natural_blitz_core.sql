-- Natural Blitz by Shen: storage for the booking site. Only the server (service role) may touch these.
create table public.nb_bookings (
  ref text primary key,
  date text not null,
  status text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nb_bookings_date_idx on public.nb_bookings (date);

-- small settings documents: 'schedule', 'gallery'
create table public.nb_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- every email / text / WhatsApp the site sends (or would send while testing)
create table public.nb_outbox (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  data jsonb not null
);
create index nb_outbox_at_idx on public.nb_outbox (id desc);

-- short-lived locks so two customers can't take the last slot at the same moment
create table public.nb_locks (
  key text primary key,
  expires_at timestamptz not null
);

alter table public.nb_bookings enable row level security;
alter table public.nb_kv enable row level security;
alter table public.nb_outbox enable row level security;
alter table public.nb_locks enable row level security;
revoke all on public.nb_bookings, public.nb_kv, public.nb_outbox, public.nb_locks from anon, authenticated;

create function public.nb_try_lock(k text, ms integer) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.nb_locks where key = k and expires_at < now();
  insert into public.nb_locks (key, expires_at) values (k, now() + make_interval(secs => ms / 1000.0));
  return true;
exception when unique_violation then
  return false;
end $$;

create function public.nb_log_message(m jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.nb_outbox (data) values (m);
  delete from public.nb_outbox where id < (select min(id) from (select id from public.nb_outbox order by id desc limit 200) t);
end $$;

revoke execute on function public.nb_try_lock(text, integer) from public, anon, authenticated;
revoke execute on function public.nb_log_message(jsonb) from public, anon, authenticated;
grant execute on function public.nb_try_lock(text, integer) to service_role;
grant execute on function public.nb_log_message(jsonb) to service_role;
