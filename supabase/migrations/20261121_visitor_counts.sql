-- visitor counts for Shen's dashboard: one row per day and page, no personal data
create table public.nb_visits (
  day text not null,
  page text not null,
  views integer not null default 0,
  visits integer not null default 0,
  primary key (day, page)
);
alter table public.nb_visits enable row level security;
revoke all on public.nb_visits from anon, authenticated;

create function public.nb_count_visit(d text, p text, is_new boolean) returns void
language sql security definer set search_path = '' as $$
  insert into public.nb_visits (day, page, views, visits) values (d, p, 1, case when is_new then 1 else 0 end)
  on conflict (day, page) do update set views = public.nb_visits.views + 1, visits = public.nb_visits.visits + excluded.visits;
$$;
revoke execute on function public.nb_count_visit(text, text, boolean) from public, anon, authenticated;
grant execute on function public.nb_count_visit(text, text, boolean) to service_role;

-- keep a year of counts
select cron.schedule('nb-trim-visits', '30 8 * * 0', $$delete from public.nb_visits where day < to_char(now() - interval '400 days', 'YYYY-MM-DD')$$);
