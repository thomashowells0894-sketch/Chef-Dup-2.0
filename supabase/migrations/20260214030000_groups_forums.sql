-- Groups & Community Forums
-- Adds group creation, membership, discussion threads, and moderation

-- Groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'general', -- general, weight-loss, muscle-building, running, nutrition, beginners, challenge
  cover_image text,
  creator_id uuid not null references auth.users(id) on delete cascade,
  is_public boolean not null default true,
  member_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member', -- admin, moderator, member
  joined_at timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Discussion threads (forum posts within groups)
create table if not exists public.group_threads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_pinned boolean not null default false,
  reply_count int not null default 0,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Thread replies
create table if not exists public.group_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.group_threads(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  like_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Thread likes
create table if not exists public.group_thread_likes (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.group_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(thread_id, user_id)
);

-- Indexes
create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);
create index if not exists idx_group_threads_group on public.group_threads(group_id);
create index if not exists idx_group_replies_thread on public.group_replies(thread_id);

-- RLS policies
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_threads enable row level security;
alter table public.group_replies enable row level security;
alter table public.group_thread_likes enable row level security;

-- Public groups readable by all authenticated users
create policy "Public groups readable" on public.groups for select using (is_public = true);
create policy "Members can read private groups" on public.groups for select using (
  exists(select 1 from public.group_members where group_id = groups.id and user_id = auth.uid())
);
create policy "Users can create groups" on public.groups for insert with check (auth.uid() = creator_id);
create policy "Admins can update groups" on public.groups for update using (
  exists(select 1 from public.group_members where group_id = groups.id and user_id = auth.uid() and role = 'admin')
);

-- Members policies
create policy "Members readable" on public.group_members for select using (true);
create policy "Users can join public groups" on public.group_members for insert with check (auth.uid() = user_id);
create policy "Users can leave groups" on public.group_members for delete using (auth.uid() = user_id);

-- Threads policies
create policy "Threads readable by members" on public.group_threads for select using (
  exists(select 1 from public.group_members where group_id = group_threads.group_id and user_id = auth.uid())
  or exists(select 1 from public.groups where id = group_threads.group_id and is_public = true)
);
create policy "Members can create threads" on public.group_threads for insert with check (
  exists(select 1 from public.group_members where group_id = group_threads.group_id and user_id = auth.uid())
);

-- Replies policies
create policy "Replies readable" on public.group_replies for select using (true);
create policy "Members can reply" on public.group_replies for insert with check (auth.uid() = author_id);

-- Likes policies
create policy "Likes readable" on public.group_thread_likes for select using (true);
create policy "Users can like" on public.group_thread_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.group_thread_likes for delete using (auth.uid() = user_id);
