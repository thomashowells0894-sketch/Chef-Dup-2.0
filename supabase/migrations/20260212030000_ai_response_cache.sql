-- AI Response Cache
-- Stores cached AI responses to reduce Gemini API costs.
-- Only accessible via service role (no RLS policies).

create table if not exists public.ai_response_cache (
  id bigint generated always as identity primary key,
  cache_key text not null unique,
  request_type text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  hit_count int not null default 0
);

create index if not exists idx_ai_cache_key on public.ai_response_cache (cache_key);
create index if not exists idx_ai_cache_expires on public.ai_response_cache (expires_at);

alter table public.ai_response_cache enable row level security;
-- No policies = only service role can read/write

-- Cleanup function: delete expired rows
create or replace function public.cleanup_ai_cache()
returns void
language sql
security definer
as $$
  delete from public.ai_response_cache where expires_at < now();
$$;
