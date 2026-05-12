drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user cascade;

create table public.profiles (
  username text primary key,
  paper_snapshot jsonb,
  achievements_snapshot jsonb,
  watchlist jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS and add a policy that allows anyone to read/write based on username.
alter table public.profiles enable row level security;

create policy "Public access to profiles"
  on profiles for all
  using (true)
  with check (true);
