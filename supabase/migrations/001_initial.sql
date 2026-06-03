-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  phone text,
  title text,
  role text not null default 'salesperson' check (role in ('admin', 'salesperson')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Categories
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Sell sheets
create table public.sell_sheets (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  pdf_url text not null,
  thumbnail_url text,
  contact_box jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sell sheet <-> category (many-to-many)
create table public.sell_sheet_categories (
  sell_sheet_id uuid references public.sell_sheets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  primary key (sell_sheet_id, category_id)
);

-- Access control: which users can see which sheets
create table public.sell_sheet_access (
  id uuid default uuid_generate_v4() primary key,
  sell_sheet_id uuid references public.sell_sheets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (sell_sheet_id, user_id)
);

-- Share links (unique token per user+sheet combo)
create table public.share_links (
  id uuid default uuid_generate_v4() primary key,
  token text not null unique,
  sell_sheet_id uuid references public.sell_sheets(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (sell_sheet_id, user_id)
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function update_updated_at();

create trigger sell_sheets_updated_at before update on public.sell_sheets
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'salesperson')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.sell_sheets enable row level security;
alter table public.sell_sheet_categories enable row level security;
alter table public.sell_sheet_access enable row level security;
alter table public.share_links enable row level security;

-- Profiles: users see own profile; admins see all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Categories: everyone authenticated can read; admins manage
create policy "Anyone can view categories"
  on public.categories for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage categories"
  on public.categories for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Sell sheets: salespeople see only what they have access to; admins see all
create policy "Admins can view all sell sheets"
  on public.sell_sheets for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Salespeople see accessible sheets"
  on public.sell_sheets for select
  using (
    is_active = true and
    exists (
      select 1 from public.sell_sheet_access
      where sell_sheet_id = sell_sheets.id and user_id = auth.uid()
    )
  );

create policy "Admins can manage sell sheets"
  on public.sell_sheets for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Sell sheet categories: same visibility as sheets
create policy "View sheet categories"
  on public.sell_sheet_categories for select
  using (
    exists (
      select 1 from public.sell_sheets s
      where s.id = sell_sheet_id
      and (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        or exists (select 1 from public.sell_sheet_access where sell_sheet_id = s.id and user_id = auth.uid())
      )
    )
  );

create policy "Admins manage sheet categories"
  on public.sell_sheet_categories for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Access control: admins manage
create policy "Admins manage access"
  on public.sell_sheet_access for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

create policy "Users see own access"
  on public.sell_sheet_access for select
  using (user_id = auth.uid());

-- Share links: owner or admin
create policy "Users manage own share links"
  on public.share_links for all
  using (user_id = auth.uid());

create policy "Admins view all share links"
  on public.share_links for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ));

-- Storage buckets (run separately in Supabase dashboard or via API)
-- insert into storage.buckets (id, name, public) values ('sell-sheets', 'sell-sheets', false);
-- insert into storage.buckets (id, name, public) values ('thumbnails', 'thumbnails', true);
