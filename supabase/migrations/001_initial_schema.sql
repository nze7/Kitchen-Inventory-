-- Profiles table for role-based access
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('management', 'staff')),
  initials text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Locations table (kitchen shelves/storage areas)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Items table (food/inventory items)
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'count',
  location_id uuid not null references public.locations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(name, location_id)
);

-- Par levels table (target quantities per item per location)
create table if not exists public.par_levels (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  par_level decimal(10, 2) not null check (par_level >= 0),
  reorder_point decimal(10, 2) default 0 check (reorder_point >= 0),
  over_order_threshold decimal(10, 2) default 1.2,
  last_modified_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(item_id, location_id)
);

-- Inventory logs table (audit trail of all inventory counts)
create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity_on_hand decimal(10, 2) not null check (quantity_on_hand >= 0),
  logged_by uuid not null references auth.users(id) on delete cascade,
  logged_at timestamp with time zone not null default timezone('utc'::text, now()),
  staff_initials text not null,
  notes text,
  edited_at timestamp with time zone,
  edit_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create indexes for better query performance
create index if not exists locations_created_by_idx on public.locations(created_by);
create index if not exists items_location_idx on public.items(location_id);
create index if not exists items_created_by_idx on public.items(created_by);
create index if not exists par_levels_item_idx on public.par_levels(item_id);
create index if not exists par_levels_location_idx on public.par_levels(location_id);
create index if not exists inventory_logs_item_idx on public.inventory_logs(item_id);
create index if not exists inventory_logs_location_idx on public.inventory_logs(location_id);
create index if not exists inventory_logs_logged_by_idx on public.inventory_logs(logged_by);
create index if not exists inventory_logs_logged_at_idx on public.inventory_logs(logged_at);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.items enable row level security;
alter table public.par_levels enable row level security;
alter table public.inventory_logs enable row level security;

-- RLS Policies for profiles table
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Management can view all profiles"
  on public.profiles for select
  using ((select (auth.jwt()->>'user_role')) = 'management');

-- RLS Policies for locations table (everyone reads, only management modifies)
create policy "Everyone can view locations"
  on public.locations for select
  using (true);

create policy "Only management can insert locations"
  on public.locations for insert
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can update locations"
  on public.locations for update
  using ((select (auth.jwt()->>'user_role')) = 'management')
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can delete locations"
  on public.locations for delete
  using ((select (auth.jwt()->>'user_role')) = 'management');

-- RLS Policies for items table (everyone reads, only management modifies)
create policy "Everyone can view items"
  on public.items for select
  using (true);

create policy "Only management can insert items"
  on public.items for insert
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can update items"
  on public.items for update
  using ((select (auth.jwt()->>'user_role')) = 'management')
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can delete items"
  on public.items for delete
  using ((select (auth.jwt()->>'user_role')) = 'management');

-- RLS Policies for par_levels table (everyone reads, only management modifies)
create policy "Everyone can view par levels"
  on public.par_levels for select
  using (true);

create policy "Only management can insert par levels"
  on public.par_levels for insert
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can update par levels"
  on public.par_levels for update
  using ((select (auth.jwt()->>'user_role')) = 'management')
  with check ((select (auth.jwt()->>'user_role')) = 'management');

create policy "Only management can delete par levels"
  on public.par_levels for delete
  using ((select (auth.jwt()->>'user_role')) = 'management');

-- RLS Policies for inventory_logs table
create policy "Everyone can view inventory logs"
  on public.inventory_logs for select
  using (true);

create policy "Anyone can create inventory logs"
  on public.inventory_logs for insert
  with check (true);

-- Staff can only update their own same-day logs
create policy "Staff can update own same-day logs"
  on public.inventory_logs for update
  using (
    (auth.uid() = logged_by) and
    (DATE(logged_at) = CURRENT_DATE) and
    ((select (auth.jwt()->>'user_role')) = 'staff')
  )
  with check (
    (auth.uid() = logged_by) and
    (DATE(logged_at) = CURRENT_DATE) and
    ((select (auth.jwt()->>'user_role')) = 'staff')
  );

-- Only management can update any log (for corrections)
create policy "Management can update any log"
  on public.inventory_logs for update
  using ((select (auth.jwt()->>'user_role')) = 'management')
  with check ((select (auth.jwt()->>'user_role')) = 'management');

-- No one can delete logs (audit trail)
-- Create functions for helper operations
create or replace function public.get_current_user_role()
returns text as $$
  select (auth.jwt()->>'user_role')::text
$$ language sql;

create or replace function public.get_current_user_initials()
returns text as $$
  select initials from public.profiles where id = auth.uid()
$$ language sql;
