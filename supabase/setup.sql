-- Toby's homepage: guestbook + visitor counter
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.

-- Guestbook ------------------------------------------------------------------

create table if not exists public.guestbook (
  id bigint generated always as identity primary key,
  name text not null check (char_length(trim(name)) between 1 and 30),
  message text not null check (char_length(trim(message)) between 1 and 140),
  created_at timestamptz not null default now()
);

alter table public.guestbook enable row level security;

-- Visitors can read every note and add new ones, but never edit or delete.
drop policy if exists "Anyone can read the guestbook" on public.guestbook;
create policy "Anyone can read the guestbook"
  on public.guestbook for select
  using (true);

drop policy if exists "Anyone can sign the guestbook" on public.guestbook;
create policy "Anyone can sign the guestbook"
  on public.guestbook for insert
  with check (
    char_length(trim(name)) between 1 and 30
    and char_length(trim(message)) between 1 and 140
  );

-- Visitors may only fill in the name and the message. The id and the time are
-- set by the database, so nobody can date a wish in the future to keep it on top.
grant select on public.guestbook to anon;
revoke insert on public.guestbook from anon;
grant insert (name, message) on public.guestbook to anon;

-- Visitor counter ------------------------------------------------------------

create table if not exists public.site_counter (
  id int primary key,
  visits bigint not null default 0
);

insert into public.site_counter (id, visits) values (1, 0)
on conflict (id) do nothing;

alter table public.site_counter enable row level security;

drop policy if exists "Anyone can read the counter" on public.site_counter;
create policy "Anyone can read the counter"
  on public.site_counter for select
  using (true);

grant select on public.site_counter to anon;

-- Visitors can't write to the table directly; they can only call this,
-- which adds exactly one and returns the new total.
create or replace function public.count_visit()
returns bigint
language sql
security definer
set search_path = public
as $$
  update site_counter set visits = visits + 1 where id = 1 returning visits;
$$;

revoke all on function public.count_visit() from public;
grant execute on function public.count_visit() to anon;
